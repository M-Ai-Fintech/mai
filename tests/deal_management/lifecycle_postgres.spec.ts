import { assertEquals, assertRejects } from "@std/assert";
import {
  DealLifecycleError,
  dealManagementMigrations,
  DealManagementService,
  type LifecycleIdFactory,
  milestoneId,
  PostgresDealRepository,
} from "../../src/deal_management/v1.ts";
import { DealAuditEventFactoryAdapter } from "../../src/deal_management/composition_support.ts";
import {
  auditActivityMigrations,
  PostgresAuditEventRepository,
  TransactionalAuditOutboxAppender,
} from "../../src/audit_activity/v1.ts";
import { OutboxRepository } from "../../src/platform/events/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  contextFor,
  FixedDealClock,
  keyFor,
  RecordingDealAuthorization,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";

const databaseUrl = mai106DatabaseUrl();

class SequentialLifecycleIds implements LifecycleIdFactory {
  private milestoneSequence = 0;
  private transitionSequence = 0;

  nextMilestoneId() {
    this.milestoneSequence += 1;
    return milestoneId(`milestone_postgres-${this.milestoneSequence}`);
  }

  nextTransitionId(): string {
    this.transitionSequence += 1;
    return `transition_postgres-${this.transitionSequence}`;
  }
}

function auditedRepository(
  transactions: PostgresTransactionRunner,
): PostgresDealRepository {
  const audit = new TransactionalAuditOutboxAppender(
    new PostgresAuditEventRepository(),
    new OutboxRepository(),
  );
  return new PostgresDealRepository(
    transactions,
    new OutboxRepository(),
    audit,
  );
}

async function truncate(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(
    "TRUNCATE deal_management.lifecycle_transition_history, deal_management.lifecycle_current, deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.command_claims, deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_manifest, audit_activity.audit_events, platform.outbox CASCADE",
  );
}

async function count(
  pool: ReturnType<typeof createMai106Pool>,
  table: string,
): Promise<string> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table}`,
  );
  return result.rows[0]!.count;
}

Deno.test({
  name:
    "Deal lifecycle PostgreSQL persistence is scoped, audited, replayable, and atomic",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...auditActivityMigrations,
        ...dealManagementMigrations,
      ]);
      await truncate(pool);
      const transactions = new PostgresTransactionRunner(pool);
      const authorization = new RecordingDealAuthorization();
      const repository = auditedRepository(transactions);
      const service = new DealManagementService({
        repository,
        authorization,
        ids: new SequentialDealIdFactory("lifecycle-postgres"),
        lifecycleIds: new SequentialLifecycleIds(),
        clock: new FixedDealClock(),
        audit: new DealAuditEventFactoryAdapter(),
      });
      const context = contextFor();
      const scope = {
        tenantId: requiredTenantId(context.request.tenantId),
        workspaceId: requiredWorkspaceId(context.request.workspaceId!),
      };
      const created = await service.createDeal({
        type: "create_deal",
        context,
        idempotencyKey: keyFor("postgres-lifecycle-create"),
        name: "Postgres lifecycle deal",
        dealType: "acquisition",
        confidentiality: "standard",
        currency: "USD",
      });
      const milestoneCommand = {
        type: "create_milestone" as const,
        context,
        idempotencyKey: keyFor("postgres-lifecycle-milestone"),
        dealId: created.deal.id,
        expectedVersion: 1,
        key: "target_identified",
        title: "Target identified",
      };
      const milestone = await service.createMilestone(milestoneCommand);
      await service.transitionLifecycle({
        type: "transition_lifecycle",
        context,
        idempotencyKey: keyFor("postgres-lifecycle-sourcing"),
        dealId: created.deal.id,
        expectedVersion: 2,
        toState: "sourcing",
      });
      const active = await service.transitionMilestone({
        type: "transition_milestone",
        context,
        idempotencyKey: keyFor("postgres-lifecycle-active"),
        dealId: created.deal.id,
        expectedVersion: 3,
        milestoneId: milestone.lifecycle!.milestones[0]!.id,
        toState: "active",
      });
      const stored = await repository.findLifecycle(scope, created.deal.id);
      assertEquals(stored?.version, 4);
      assertEquals(stored?.state, "sourcing");
      assertEquals(stored?.milestones[0]?.state, "active");
      assertEquals(
        (await repository.listLifecycleHistory(scope, created.deal.id)).length,
        3,
      );
      assertEquals(await count(pool, "deal_management.deals"), "1");
      assertEquals(await count(pool, "deal_management.lifecycle_current"), "1");
      assertEquals(
        await count(pool, "deal_management.lifecycle_transition_history"),
        "3",
      );
      assertEquals(await count(pool, "deal_management.aggregate_history"), "4");
      assertEquals(await count(pool, "deal_management.command_receipts"), "4");
      assertEquals(await count(pool, "deal_management.command_claims"), "4");
      assertEquals(await count(pool, "audit_activity.audit_events"), "4");
      assertEquals(await count(pool, "platform.outbox"), "4");

      const replay = await service.transitionMilestone({
        type: "transition_milestone",
        context,
        idempotencyKey: keyFor("postgres-lifecycle-active"),
        dealId: created.deal.id,
        expectedVersion: 3,
        milestoneId: milestone.lifecycle!.milestones[0]!.id,
        toState: "active",
      });
      assertEquals(replay, active);
      assertEquals(
        await count(pool, "deal_management.lifecycle_transition_history"),
        "3",
      );

      await assertRejects(
        () =>
          service.transitionLifecycle({
            type: "transition_lifecycle",
            context,
            idempotencyKey: keyFor("postgres-lifecycle-blocked"),
            dealId: created.deal.id,
            expectedVersion: 4,
            toState: "due_diligence",
          }),
        DealLifecycleError,
      );
      assertEquals((await repository.find(scope, created.deal.id))?.version, 4);
      assertEquals(
        await count(pool, "deal_management.lifecycle_transition_history"),
        "3",
      );
      assertEquals(await count(pool, "deal_management.command_claims"), "4");
    } finally {
      await truncate(pool);
      await pool.end();
    }
  },
});
