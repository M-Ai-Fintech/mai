import { assertEquals, assertRejects } from "@std/assert";
import {
  AtomicVerificationMismatchError,
  dealManagementMigrations,
  type DealReconciliationRecord,
  DeterministicLegacyDealMapper,
  type LegacyDealRecord,
  PostgresDealReconciliationStore,
} from "../../src/deal_management/v1.ts";
import { canonicalJson } from "../../src/deal_management/migration_identity.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import { auditActivityMigrations } from "../../src/audit_activity/v1.ts";
import {
  contextFor,
  requiredTenantId,
  requiredWorkspaceId,
} from "./support.ts";

const databaseUrl = mai106DatabaseUrl();
const context = contextFor();
const scope = {
  tenantId: requiredTenantId(context.request.tenantId),
  workspaceId: requiredWorkspaceId(context.request.workspaceId!),
};

Deno.test({
  name: "PostgreSQL verification is atomic, compare-and-swap, and fail closed",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...auditActivityMigrations,
        ...dealManagementMigrations,
      ]);
      const transactions = new PostgresTransactionRunner(pool);
      const store = new PostgresDealReconciliationStore(transactions);
      const mapper = new DeterministicLegacyDealMapper();
      const mapped = await mapper.map({
        record: legacyRecord(),
        scope,
        now: context.now,
      });
      if (mapped.kind !== "mapped") throw new Error("expected mapped Deal");

      await reset(pool);
      await seedDeal(pool, mapped.deal);
      await store.save(appliedRecord(mapped.deal, "atomic-success"));
      const verified = await store.verifyAndMarkReconciliation(
        verificationInput(mapped.deal, "atomic-success"),
        (transaction) => validateDeal(transaction, mapped.deal, true),
      );
      assertEquals(verified.status, "verified");
      assertEquals(verified.routingMode, "authoritative");

      for (
        const [caseId, validator] of [
          ["missing-evidence", () =>
            Promise.resolve({
              ok: false as const,
              missing: ["CLAIM_COUNT"],
            })],
          ["corrupt-evidence", () => Promise.reject(new Error("corrupt"))],
        ] as const
      ) {
        await reset(pool);
        await seedDeal(pool, mapped.deal);
        await store.save(appliedRecord(mapped.deal, caseId));
        const error = await assertRejects(() =>
          store.verifyAndMarkReconciliation(
            verificationInput(mapped.deal, caseId),
            () => validator(),
          )
        );
        if (caseId === "missing-evidence") {
          assertEquals(error instanceof AtomicVerificationMismatchError, true);
          assertEquals(
            (error as AtomicVerificationMismatchError).evidence.missing,
            ["CLAIM_COUNT"],
          );
        } else {
          assertEquals((error as Error).message, "corrupt");
        }
        await assertApplied(store, caseId);
      }

      await reset(pool);
      await seedDeal(pool, mapped.deal);
      await store.save(appliedRecord(mapped.deal, "source-drift"));
      await assertRejects(() =>
        store.verifyAndMarkReconciliation(
          {
            ...verificationInput(mapped.deal, "source-drift"),
            sourceFingerprint: "changed",
          },
          (transaction) => validateDeal(transaction, mapped.deal, true),
        )
      );
      await assertApplied(store, "source-drift");

      await reset(pool);
      await seedDeal(pool, mapped.deal);
      await store.save(appliedRecord(mapped.deal, "document-drift"));
      await assertRejects(() =>
        store.verifyAndMarkReconciliation(
          {
            ...verificationInput(mapped.deal, "document-drift"),
            intendedDeal: { ...mapped.deal, name: "changed" },
          },
          (transaction) => validateDeal(transaction, mapped.deal, true),
        )
      );
      await assertApplied(store, "document-drift");

      await reset(pool);
      await seedDeal(pool, mapped.deal);
      await store.save(appliedRecord(mapped.deal, "version-drift"));
      await pool.query(
        "UPDATE deal_management.deals SET version = version + 1 WHERE deal_id = $1",
        [mapped.deal.id],
      );
      await assertRejects(() =>
        store.verifyAndMarkReconciliation(
          verificationInput(mapped.deal, "version-drift"),
          (transaction) => validateDeal(transaction, mapped.deal, true),
        )
      );
      await assertApplied(store, "version-drift");

      await reset(pool);
      await seedDeal(pool, mapped.deal);
      await store.save(appliedRecord(mapped.deal, "concurrent"));
      const concurrent = await Promise.allSettled([
        store.verifyAndMarkReconciliation(
          verificationInput(mapped.deal, "concurrent"),
          (transaction) => validateDeal(transaction, mapped.deal, true),
        ),
        store.verifyAndMarkReconciliation(
          verificationInput(mapped.deal, "concurrent"),
          (transaction) => validateDeal(transaction, mapped.deal, true),
        ),
      ]);
      assertEquals(
        concurrent.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assertEquals(
        concurrent.filter((result) => result.status === "rejected").length,
        1,
      );
      assertEquals(
        String(
          concurrent.find((result) => result.status === "rejected")?.reason,
        )
          .includes("stale"),
        true,
      );

      await reset(pool);
      await seedDeal(pool, mapped.deal);
      await store.save({
        ...appliedRecord(mapped.deal, "rollback"),
        issue: {
          code: "RECONCILIATION_DRIFT",
          legacyDealId: "atomic",
          received: "before",
          expected: "after",
          explanation: "preserve previous record",
          operatorInterventionRequired: true,
          retrySafe: false,
        },
      });
      await assertRejects(() =>
        store.verifyAndMarkReconciliation(
          verificationInput(mapped.deal, "rollback"),
          () => Promise.reject(new Error("rollback")),
        )
      );
      const preserved = await store.find({
        scope,
        legacySource: "legacy.atomic",
        legacyDealId: "rollback",
      });
      assertEquals(preserved?.status, "applied");
      assertEquals(preserved?.routingMode, "legacy");
      assertEquals(preserved?.issue?.code, "RECONCILIATION_DRIFT");

      await assertRejects(() =>
        pool.query(
          "INSERT INTO deal_management.reconciliation_records " +
            "(record_id, tenant_id, workspace_id, legacy_source, legacy_record_id, status, routing_mode, created_at, updated_at) " +
            "VALUES ('invalid-route', $1, $2, 'legacy.atomic', 'invalid-route', 'applied', 'authoritative', NOW(), NOW())",
          [scope.tenantId, scope.workspaceId],
        )
      );
    } finally {
      await reset(pool).catch(() => {});
      await pool.end();
    }
  },
});

function legacyRecord(): LegacyDealRecord {
  return {
    source: "legacy.atomic",
    legacyDealId: "atomic-deal",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    name: "Atomic Deal",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    parties: [],
    team: [],
  };
}

function appliedRecord(
  deal: { id: string; version: number },
  legacyDealId: string,
): DealReconciliationRecord {
  return {
    recordId: "reconciliation_atomic_" + legacyDealId,
    scope,
    legacySource: "legacy.atomic",
    legacyDealId,
    authoritativeDealId: deal.id as never,
    sourceFingerprint: "fingerprint-atomic",
    intendedDeal: deal as never,
    status: "applied",
    routingMode: "legacy",
    updatedAt: context.now,
  };
}

function verificationInput(
  deal: { id: string; version: number },
  legacyDealId: string,
) {
  return {
    scope,
    legacySource: "legacy.atomic",
    legacyDealId,
    authoritativeDealId: deal.id as never,
    sourceFingerprint: "fingerprint-atomic",
    intendedDeal: deal as never,
    actorId: context.actor.id,
    correlationId: context.request.correlationId,
    now: context.now,
  };
}

async function seedDeal(
  pool: ReturnType<typeof createMai106Pool>,
  deal: {
    id: string;
    tenantId: string;
    workspaceId: string;
    version: number;
    state: string;
    createdAt: string;
    updatedAt: string;
  },
): Promise<void> {
  await pool.query(
    "INSERT INTO deal_management.deals (deal_id, tenant_id, workspace_id, version, state, document, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      deal.id,
      deal.tenantId,
      deal.workspaceId,
      deal.version,
      deal.state,
      JSON.stringify(deal),
      deal.createdAt,
      deal.updatedAt,
    ],
  );
}

async function validateDeal(
  transaction: {
    query: <T>(
      sql: string,
      params?: readonly unknown[],
    ) => Promise<{ rows: T[] }>;
  },
  deal: { id: string; version: number },
  evidence: boolean,
): Promise<
  { readonly ok: true } | {
    readonly ok: false;
    readonly missing: readonly string[];
  }
> {
  const result = await transaction.query<
    { version: number; document: unknown }
  >(
    "SELECT version, document FROM deal_management.deals WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 FOR UPDATE",
    [scope.tenantId, scope.workspaceId, deal.id],
  );
  const matches = evidence && result.rows[0] !== undefined &&
    Number(result.rows[0].version) === deal.version &&
    canonicalJson(stripPersistenceFields(
        typeof result.rows[0].document === "string"
          ? JSON.parse(result.rows[0].document)
          : result.rows[0].document,
      )) === canonicalJson(stripPersistenceFields(deal));
  return matches
    ? { ok: true }
    : { ok: false, missing: ["AUTHORITATIVE_DOCUMENT"] };
}

function stripPersistenceFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const {
    version: _version,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...content
  } = value;
  return content;
}

async function assertApplied(
  store: PostgresDealReconciliationStore,
  legacyDealId: string,
): Promise<void> {
  const record = await store.find({
    scope,
    legacySource: "legacy.atomic",
    legacyDealId,
  });
  assertEquals(record?.status, "applied");
  assertEquals(record?.routingMode, "legacy");
}

async function reset(pool: ReturnType<typeof createMai106Pool>): Promise<void> {
  await pool.query(
    "TRUNCATE deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.deals CASCADE",
  );
}
