import { assertEquals, assertRejects } from "@std/assert";
import {
  type DealId,
  DealManagementService,
  DealReconciliationExecutor,
  DeterministicLegacyDealMapper,
  InMemoryLegacyDealSource,
  type LegacyDealRecord,
  PostgresDealReconciliationStore,
  PostgresDealRepository,
  PostgresReconciliationEvidenceVerifier,
  type ReconciliationEvidenceResult,
  type ReconciliationEvidenceVerifier,
} from "../../src/deal_management/v1.ts";
import { DealAuditEventFactoryAdapter } from "../../src/deal_management/composition_support.ts";
import {
  auditActivityMigrations,
  PostgresAuditEventRepository,
  TransactionalAuditOutboxAppender,
} from "../../src/audit_activity/v1.ts";
import { OutboxRepository } from "../../src/platform/events/v1.ts";
import { dealManagementMigrations } from "../../src/deal_management/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
  type TransactionHandle,
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
const context = contextFor();
const scope = {
  tenantId: requiredTenantId(context.request.tenantId),
  workspaceId: requiredWorkspaceId(context.request.workspaceId!),
};

function record(legacyDealId: string): LegacyDealRecord {
  return {
    source: "legacy.postgres-fixture",
    legacyDealId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
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
    "TRUNCATE deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.command_claims, deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_manifest, audit_activity.audit_events, platform.outbox CASCADE",
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
        ...auditActivityMigrations,
        ...dealManagementMigrations,
      ]);
      await truncate(pool);
      const transactions = new PostgresTransactionRunner(pool);
      const repository = auditedRepository(transactions);
      const store = new PostgresDealReconciliationStore(transactions);
      const source = new InMemoryLegacyDealSource([
        record("legacy-pg-dry"),
        record("legacy-pg-apply"),
        record("legacy-pg-collision"),
      ]);
      const mapper = new DeterministicLegacyDealMapper();
      const service = new DealManagementService({
        repository,
        authorization: new RecordingDealAuthorization(),
        ids: new SequentialDealIdFactory("postgres-reconcile"),
        clock: new FixedDealClock(context.now),
        audit: new DealAuditEventFactoryAdapter(),
      });
      const executor = new DealReconciliationExecutor(
        source,
        mapper,
        store,
        service,
        repository,
        new PostgresReconciliationEvidenceVerifier(transactions),
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
      await assertCollisionPreservesEvidence(
        pool,
        repository,
        mapper,
        service,
        executor,
      );

      const applied = await executor.run({
        mode: "apply",
        legacyDealId: "legacy-pg-apply",
        operator: operator(),
      });
      assertEquals(applied.outcomes[0]?.kind, "verified");
      const mappedApply = await mapper.map({
        record: record("legacy-pg-apply"),
        scope,
        now: context.now,
      });
      if (mappedApply.kind !== "mapped") {
        throw new Error("expected mapped apply");
      }
      const persistedApply = await repository.find(
        scope,
        mappedApply.deal.id,
      );
      if (persistedApply === undefined) {
        throw new Error("expected persisted apply");
      }
      assertEquals(persistedApply.parties.length > 0, true);
      assertEquals(persistedApply.mandate !== undefined, true);
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
      assertEquals(await count(pool, "deal_management.deals"), "2");
      assertEquals(await count(pool, "deal_management.aggregate_history"), "4");
      assertEquals(await count(pool, "platform.outbox"), "4");
      assertEquals(await count(pool, "audit_activity.audit_events"), "4");
    } finally {
      await truncate(pool).catch(() => {});
      await pool.end();
    }
  },
});

class ThrowingEvidenceVerifier implements ReconciliationEvidenceVerifier {
  constructor(readonly failure: Error) {}

  verify(): Promise<ReconciliationEvidenceResult> {
    return Promise.reject(this.failure);
  }

  verifyInTransaction(): Promise<ReconciliationEvidenceResult> {
    return Promise.reject(this.failure);
  }
}

class MismatchedEvidenceVerifier implements ReconciliationEvidenceVerifier {
  verify(): Promise<ReconciliationEvidenceResult> {
    return Promise.resolve(this.mismatch());
  }

  verifyInTransaction(
    _transaction: TransactionHandle,
  ): Promise<ReconciliationEvidenceResult> {
    return Promise.resolve(this.mismatch());
  }

  private mismatch(): ReconciliationEvidenceResult {
    return { ok: false, missing: ["OUTBOX_LINK:create_deal[0]:wrong-audit"] };
  }
}

Deno.test({
  name:
    "executor apply propagates infrastructure failures and persists only typed mismatches",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      await prepareFailureDatabase(pool);
      const transactions = new PostgresTransactionRunner(pool);
      const failure = new Error("distinctive-postgres-evidence-outage");
      const infrastructure = failureExecutor(
        transactions,
        "legacy-pg-infrastructure",
        new ThrowingEvidenceVerifier(failure),
      );
      const rejected = await assertRejects(() =>
        infrastructure.executor.run({
          mode: "apply",
          legacyDealId: "legacy-pg-infrastructure",
          operator: operator(),
        })
      );
      assertEquals(rejected, failure);
      await assertAppliedWithoutIssue(
        infrastructure.store,
        "legacy-pg-infrastructure",
      );

      const mismatch = failureExecutor(
        transactions,
        "legacy-pg-mismatch",
        new MismatchedEvidenceVerifier(),
      );
      const result = await mismatch.executor.run({
        mode: "apply",
        legacyDealId: "legacy-pg-mismatch",
        operator: operator(),
      });
      assertEquals(result.outcomes[0]?.kind, "conflict");
      assertEquals(result.outcomes[0]?.record.issue?.mismatchPaths, [
        "OUTBOX_LINK",
      ]);
      assertEquals(
        JSON.stringify(result.outcomes[0]?.record.issue).includes(
          failure.message,
        ),
        false,
      );
    } finally {
      await truncate(pool).catch(() => {});
      await pool.end();
    }
  },
});

async function prepareFailureDatabase(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...dealManagementMigrations,
  ]);
  await truncate(pool);
}

function failureExecutor(
  transactions: PostgresTransactionRunner,
  legacyDealId: string,
  evidence: ReconciliationEvidenceVerifier,
) {
  const repository = auditedRepository(transactions);
  const store = new PostgresDealReconciliationStore(transactions);
  const service = new DealManagementService({
    repository,
    authorization: new RecordingDealAuthorization(),
    ids: new SequentialDealIdFactory(`failure-${legacyDealId}`),
    clock: new FixedDealClock(context.now),
    audit: new DealAuditEventFactoryAdapter(),
  });
  return {
    store,
    executor: new DealReconciliationExecutor(
      new InMemoryLegacyDealSource([record(legacyDealId)]),
      new DeterministicLegacyDealMapper(),
      store,
      service,
      repository,
      evidence,
    ),
  };
}

async function assertAppliedWithoutIssue(
  store: PostgresDealReconciliationStore,
  legacyDealId: string,
): Promise<void> {
  const persisted = await store.find({
    scope,
    legacySource: "legacy.postgres-fixture",
    legacyDealId,
  });
  assertEquals(persisted?.status, "applied");
  assertEquals(persisted?.routingMode, "legacy");
  assertEquals(persisted?.issue, undefined);
}

function auditedRepository(transactions: PostgresTransactionRunner) {
  return new PostgresDealRepository(
    transactions,
    new OutboxRepository(),
    new TransactionalAuditOutboxAppender(
      new PostgresAuditEventRepository(),
      new OutboxRepository(),
    ),
  );
}

async function assertCollisionPreservesEvidence(
  pool: ReturnType<typeof createMai106Pool>,
  repository: PostgresDealRepository,
  mapper: DeterministicLegacyDealMapper,
  service: DealManagementService,
  executor: DealReconciliationExecutor,
): Promise<void> {
  const mapped = await mapper.map({
    record: record("legacy-pg-collision"),
    scope,
    now: context.now,
  });
  if (mapped.kind !== "mapped") throw new Error("expected mapped collision");
  await seedConflictingDeal(service, mapped.deal.id);
  const beforeDeal = await repository.find(scope, mapped.deal.id);
  const beforeEvidence = await collisionEvidence(pool, mapped.deal.id);
  const result = await executor.run({
    mode: "apply",
    legacyDealId: "legacy-pg-collision",
    operator: operator(),
  });
  assertEquals(result.outcomes[0]?.kind, "conflict");
  assertEquals(await repository.find(scope, mapped.deal.id), beforeDeal);
  assertEquals(await collisionEvidence(pool, mapped.deal.id), beforeEvidence);
}

function seedConflictingDeal(service: DealManagementService, dealId: DealId) {
  return service.createDeal({
    type: "create_deal",
    context,
    idempotencyKey: keyFor("collision-seed"),
    dealId,
    name: "Unrelated authoritative Deal",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
  });
}

async function collisionEvidence(
  pool: ReturnType<typeof createMai106Pool>,
  dealId: string,
) {
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM deal_management.aggregate_history WHERE deal_id=$1) history,
      (SELECT COUNT(*)::int FROM deal_management.command_receipts WHERE target_id=$1) receipts,
      (SELECT COUNT(*)::int FROM deal_management.command_claims WHERE target_id=$1) claims,
      (SELECT COUNT(*)::int FROM platform.outbox WHERE aggregate_id=$1) outbox`,
    [dealId],
  );
  return result.rows[0];
}

Deno.test({
  name: "PostgreSQL routing serializes competing stale updates",
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
      const store = new PostgresDealReconciliationStore(
        new PostgresTransactionRunner(pool),
      );
      await store.save(routableRecord());
      const results = await Promise.allSettled([
        store.route(routingChange("cor_route-a")),
        store.route(routingChange("cor_route-b")),
      ]);
      assertEquals(
        results.filter((result) => result.status === "fulfilled").length,
        1,
      );
      const failure = results.find((result) => result.status === "rejected");
      assertEquals(failure?.status, "rejected");
      if (failure?.status === "rejected") {
        assertEquals(String(failure.reason).includes("stale"), true);
      }
      assertEquals(
        (await store.listRoutingChanges({
          scope,
          legacySource: "legacy.postgres-fixture",
          legacyDealId: "legacy-pg-route",
        })).length,
        1,
      );
    } finally {
      await truncate(pool).catch(() => {});
      await pool.end();
    }
  },
});

function routableRecord() {
  return {
    recordId: "reconciliation_route-race",
    scope,
    legacySource: "legacy.postgres-fixture",
    legacyDealId: "legacy-pg-route",
    authoritativeDealId: "deal_route-race" as never,
    sourceFingerprint: "fingerprint-route-race",
    status: "verified" as const,
    routingMode: "authoritative" as const,
    updatedAt: context.now,
  };
}

function routingChange(correlationId: string) {
  return {
    scope,
    legacySource: "legacy.postgres-fixture",
    legacyDealId: "legacy-pg-route",
    authoritativeDealId: "deal_route-race" as never,
    previousMode: "authoritative" as const,
    nextMode: "legacy" as const,
    actorId: context.actor.id,
    correlationId,
    reason: "competing route test",
    changedAt: context.now,
  };
}

async function count(
  pool: ReturnType<typeof createMai106Pool>,
  table: string,
): Promise<string> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table}`,
  );
  return result.rows[0].count;
}
