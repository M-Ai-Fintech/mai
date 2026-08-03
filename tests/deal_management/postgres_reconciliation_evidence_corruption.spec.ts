import { assert, assertFalse, assertStringIncludes } from "@std/assert";
import {
  dealManagementMigrations,
  DealManagementService,
  DealReconciliationExecutor,
  DeterministicLegacyDealMapper,
  InMemoryLegacyDealSource,
  type LegacyDealRecord,
  PostgresDealReconciliationStore,
  PostgresDealRepository,
  PostgresReconciliationEvidenceVerifier,
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

function record(): LegacyDealRecord {
  return {
    source: "legacy.evidence-corruption",
    legacyDealId: "legacy-evidence-corruption",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    name: "Evidence corruption fixture",
    dealType: "acquisition",
    confidentiality: "standard",
    currency: "USD",
    parties: [{
      legacyPartyId: "party-target",
      reference: { kind: "organization", id: "org_evidence-target" },
      side: "target",
      label: "Target",
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

function repository(transactions: PostgresTransactionRunner) {
  return new PostgresDealRepository(
    transactions,
    new OutboxRepository(),
    new TransactionalAuditOutboxAppender(
      new PostgresAuditEventRepository(),
      new OutboxRepository(),
    ),
  );
}

type Corruption = {
  readonly name: string;
  readonly apply: (pool: ReturnType<typeof createMai106Pool>) => Promise<void>;
  readonly code: string;
};

const corruptions: readonly Corruption[] = [
  {
    name: "wrong shared fingerprint",
    code: "CLAIM_FINGERPRINT",
    apply: (pool) =>
      pool.query(
        `UPDATE deal_management.command_claims SET fingerprint='wrong-shared-fingerprint';
       UPDATE deal_management.command_receipts SET fingerprint='wrong-shared-fingerprint'`,
      ).then(() => undefined),
  },
  {
    name: "claim and receipt result mismatch",
    code: "RESULT_MISMATCH",
    apply: (pool) =>
      pool.query(
        `UPDATE deal_management.command_claims
       SET result=jsonb_build_object('operation', 'created', 'deal', jsonb_build_object('id', 'wrong'))
       WHERE command_type='create_deal'`,
      ).then(() => undefined),
  },
  {
    name: "extra completed command",
    code: "UNEXPECTED_OPERATION",
    apply: (pool) =>
      pool.query(
        `INSERT INTO deal_management.command_claims
       (tenant_id, workspace_id, actor_id, command_type, target_id, idempotency_key,
        fingerprint, state, result, created_at, completed_at)
       SELECT tenant_id, workspace_id, actor_id, command_type, target_id,
        'unexpected-completed-command', fingerprint, 'completed', result,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM deal_management.command_claims WHERE command_type='create_deal' LIMIT 1`,
      ).then(() => undefined),
  },
  {
    name: "missing operation replaced by duplicate",
    code: "CLAIM_COUNT",
    apply: (pool) =>
      pool.query(
        `DELETE FROM deal_management.command_claims WHERE command_type='add_deal_party';
       INSERT INTO deal_management.command_claims
       (tenant_id, workspace_id, actor_id, command_type, target_id, idempotency_key,
        fingerprint, state, result, created_at, completed_at)
       SELECT tenant_id, workspace_id, actor_id, command_type, target_id,
        'duplicate-party-command', fingerprint, state, result, created_at, completed_at
       FROM deal_management.command_claims WHERE command_type='create_deal' LIMIT 1`,
      ).then(() => undefined),
  },
  {
    name: "shifted aggregate version",
    code: "HISTORY_COUNT",
    apply: (pool) =>
      pool.query(
        `UPDATE deal_management.aggregate_history SET aggregate_version=99
       WHERE aggregate_version=1`,
      ).then(() => undefined),
  },
  {
    name: "wrong event type",
    code: "EVENT_TYPE",
    apply: (pool) =>
      pool.query(
        `UPDATE deal_management.aggregate_history SET event_type='WrongEvent'
       WHERE aggregate_version=1`,
      ).then(() => undefined),
  },
  {
    name: "wrong schema version",
    code: "EVENT_SCHEMA",
    apply: (pool) =>
      pool.query(
        `UPDATE deal_management.aggregate_history SET schema_version=2
       WHERE aggregate_version=1`,
      ).then(() => undefined),
  },
  {
    name: "outbox references another audit event",
    code: "OUTBOX_LINK",
    apply: (pool) =>
      pool.query(
        `UPDATE platform.outbox SET payload=jsonb_set(payload, '{auditEventId}', '"another-audit-event"')
       WHERE aggregate_version=1`,
      ).then(() => undefined),
  },
  {
    name: "wrong tenant",
    code: "HISTORY_COUNT",
    apply: (pool) =>
      pool.query(
        `UPDATE deal_management.aggregate_history SET tenant_id='wrong-tenant'
       WHERE aggregate_version=1`,
      ).then(() => undefined),
  },
  {
    name: "wrong workspace",
    code: "HISTORY_COUNT",
    apply: (pool) =>
      pool.query(
        `UPDATE deal_management.aggregate_history SET workspace_id='wrong-workspace'
       WHERE aggregate_version=1`,
      ).then(() => undefined),
  },
  {
    name: "duplicate evidence",
    code: "OUTBOX_COUNT",
    apply: (pool) =>
      pool.query(
        `INSERT INTO platform.outbox
       (event_id, tenant_id, workspace_id, deal_id, aggregate_type, aggregate_id,
        aggregate_version, event_type, schema_version, payload, correlation_id,
        occurred_at, available_at, dispatch_state)
       SELECT event_id || '-duplicate', tenant_id, workspace_id, deal_id,
        aggregate_type, aggregate_id, aggregate_version, event_type, schema_version,
        payload, correlation_id, occurred_at, available_at, dispatch_state
       FROM platform.outbox WHERE aggregate_version=1`,
      ).then(() => undefined),
  },
];

Deno.test({
  name:
    "PostgreSQL exact reconciliation evidence rejects every corruption shape",
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
      const repositoryInstance = repository(transactions);
      const source = new InMemoryLegacyDealSource([record()]);
      const mapper = new DeterministicLegacyDealMapper();
      const service = new DealManagementService({
        repository: repositoryInstance,
        authorization: new RecordingDealAuthorization(),
        ids: new SequentialDealIdFactory("evidence-corruption"),
        clock: new FixedDealClock(context.now),
        audit: new DealAuditEventFactoryAdapter(),
      });
      const store = new PostgresDealReconciliationStore(transactions);
      const executor = new DealReconciliationExecutor(
        source,
        mapper,
        store,
        service,
        repositoryInstance,
        new PostgresReconciliationEvidenceVerifier(transactions),
      );
      for (const corruption of corruptions) {
        await truncate(pool);
        const applied = await executor.run({
          mode: "apply",
          legacyDealId: record().legacyDealId,
          operator: operator(),
        });
        assert(applied.outcomes[0]?.kind === "verified", corruption.name);
        const stored = await store.find({
          scope,
          legacySource: record().source,
          legacyDealId: record().legacyDealId,
        });
        assert(stored?.intendedDeal !== undefined, corruption.name);
        await corruption.apply(pool);
        const result = await new PostgresReconciliationEvidenceVerifier(
          transactions,
        ).verify({
          scope,
          intendedDeal: stored!.intendedDeal!,
          legacySource: record().source,
          legacyDealId: record().legacyDealId,
          operator: operator(),
        });
        assertFalse(result.ok, corruption.name);
        assertStringIncludes(
          result.ok ? "" : result.missing.join("\n"),
          corruption.code,
          corruption.name,
        );
      }
    } finally {
      await truncate(pool).catch(() => {});
      await pool.end();
    }
  },
});
