import { assertEquals } from "@std/assert";
import {
  DealManagementService,
  DealReconciliationExecutor,
  DeterministicLegacyDealMapper,
  InMemoryLegacyDealSource,
  type LegacyDealRecord,
  PostgresDealReconciliationStore,
  PostgresDealRepository,
} from "../../src/deal_management/v1.ts";
import { dealManagementMigrations } from "../../src/deal_management/v1.ts";
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
  RecordingDealAuthorization,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";

const databaseUrl = mai106DatabaseUrl();
const context = contextFor();
const scope = {
  tenantId: requiredTenantId(context.request.tenantId),
  workspaceId: requiredWorkspaceId(context.request.workspaceId!),
};

function record(legacyDealId: string): LegacyDealRecord {
  return {
    source: "legacy.postgres-fixture",
    legacyDealId,
    name: "Postgres reconciliation deal",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    parties: [{
      legacyPartyId: "business-target",
      reference: { kind: "organization", id: "org_postgres-target" },
      side: "target",
      label: "Postgres target",
    }],
    team: [],
    mandate: {
      transactionValueCeiling: 500,
      currency: "USD",
      authorityCeiling: 2,
    },
  };
}

function operator() {
  return {
    scope,
    actorId: context.actor.id,
    correlationId: context.request.correlationId,
    now: context.now,
    commandContext: context,
  };
}

async function truncate(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(
    "TRUNCATE deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.command_claims, deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_manifest, platform.outbox",
  );
}

Deno.test({
  name:
    "PostgreSQL reconciliation persists dry-run, apply, verification, and rollback routing",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...dealManagementMigrations,
      ]);
      await truncate(pool);
      const transactions = new PostgresTransactionRunner(pool);
      const repository = new PostgresDealRepository(transactions);
      const store = new PostgresDealReconciliationStore(transactions);
      const source = new InMemoryLegacyDealSource([
        record("legacy-pg-dry"),
        record("legacy-pg-apply"),
      ]);
      const mapper = new DeterministicLegacyDealMapper();
      const service = new DealManagementService({
        repository,
        authorization: new RecordingDealAuthorization(),
        ids: new SequentialDealIdFactory("postgres-reconcile"),
        clock: new FixedDealClock(context.now),
      });
      const executor = new DealReconciliationExecutor(
        source,
        mapper,
        store,
        service,
        repository,
      );
      const dryRun = await executor.run({
        mode: "dry-run",
        legacyDealId: "legacy-pg-dry",
        operator: operator(),
      });
      assertEquals(dryRun.outcomes[0]?.kind, "mapped");
      assertEquals(await count(pool, "deal_management.deals"), "0");
      assertEquals(await count(pool, "deal_management.aggregate_history"), "0");
      assertEquals(await count(pool, "platform.outbox"), "0");
      assertEquals(
        (await store.find({
          scope,
          legacySource: "legacy.postgres-fixture",
          legacyDealId: "legacy-pg-dry",
        }))?.status,
        "dry_run_valid",
      );

      const applied = await executor.run({
        mode: "apply",
        legacyDealId: "legacy-pg-apply",
        operator: operator(),
      });
      assertEquals(applied.outcomes[0]?.kind, "verified");
      const resumed = await executor.run({
        mode: "resume",
        legacyDealId: "legacy-pg-apply",
        operator: operator(),
      });
      assertEquals(resumed.outcomes[0]?.kind, "already_reconciled");
      const stored = await store.find({
        scope,
        legacySource: "legacy.postgres-fixture",
        legacyDealId: "legacy-pg-apply",
      });
      assertEquals(stored?.status, "verified");
      assertEquals(stored?.routingMode, "authoritative");
      await executor.rollbackReadRouting({
        legacySource: "legacy.postgres-fixture",
        legacyDealId: "legacy-pg-apply",
        operator: operator(),
        reason: "PostgreSQL rollback evidence",
      });
      const routed = await store.find({
        scope,
        legacySource: "legacy.postgres-fixture",
        legacyDealId: "legacy-pg-apply",
      });
      assertEquals(routed?.status, "rollback_routed");
      assertEquals(routed?.routingMode, "legacy");
      assertEquals(
        (await store.listRoutingChanges({
          scope,
          legacySource: "legacy.postgres-fixture",
          legacyDealId: "legacy-pg-apply",
        })).length,
        1,
      );
      await executor.restoreAuthoritativeReadRouting({
        legacySource: "legacy.postgres-fixture",
        legacyDealId: "legacy-pg-apply",
        operator: operator(),
        reason: "PostgreSQL authoritative restore evidence",
      });
      const restored = await store.find({
        scope,
        legacySource: "legacy.postgres-fixture",
        legacyDealId: "legacy-pg-apply",
      });
      assertEquals(restored?.routingMode, "authoritative");
      assertEquals(restored?.status, "verified");
      assertEquals(
        (await store.listRoutingChanges({
          scope,
          legacySource: "legacy.postgres-fixture",
          legacyDealId: "legacy-pg-apply",
        })).length,
        2,
      );
      assertEquals(await count(pool, "deal_management.deals"), "1");
      assertEquals(await count(pool, "deal_management.aggregate_history"), "3");
      assertEquals(await count(pool, "platform.outbox"), "3");
    } finally {
      await truncate(pool).catch(() => {});
      await pool.end();
    }
  },
});

async function count(
  pool: ReturnType<typeof createMai106Pool>,
  table: string,
): Promise<string> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table}`,
  );
  return result.rows[0].count;
}
