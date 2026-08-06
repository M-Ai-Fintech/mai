import { assertEquals, assertRejects } from "@std/assert";
import type {
  AuditEventDraft,
  AuditEventId,
} from "../../src/audit_activity/model.ts";
import { PostgresAuditEventRepository } from "../../src/audit_activity/repository.ts";
import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import {
  action,
  type AuthorizationDecision,
} from "../../src/platform/authz/v1.ts";
import { parseIdempotencyKey } from "../../src/platform/api/v1.ts";
import {
  payloadDigest,
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
  type TransactionHandle,
} from "../../src/platform/persistence/v1.ts";
import { createPostgresWorkManagementComposition } from "../../src/work_management/composition.ts";
import type { WorkManagementEvent } from "../../src/work_management/events.ts";
import {
  actor,
  deal,
  taskId,
  tenant,
  type WorkScope,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import { workManagementMigrations } from "../../src/work_management/migrations/index.ts";
import type { WorkManagementAuditPort } from "../../src/work_management/transactional_effects.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();
const scope: WorkScope = {
  tenantId: tenant("tenant_command-pg"),
  workspaceId: workspace("workspace_command-pg"),
  dealId: deal("deal_command-pg"),
};
const human = {
  id: actor("actor_command-pg"),
  kind: "human" as const,
  state: "active" as const,
};
const context = {
  actorId: human.id,
  ...scope,
  correlationId:
    "cor_command_pg" as import("../../src/platform/api/v1.ts").CorrelationId,
  origin: "http" as const,
};

Deno.test({
  name:
    "PostgreSQL command transaction durably replays without duplicate side effects",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = Date.now().toString();
    const id = workstreamId(`workstream_replay-${suffix}`);
    const key = idempotency(`replay-${suffix}`);
    const first = composition(runner, new RecordingAuditPort()).service;
    const created = await first.createWorkstream({
      ...command(id, key),
      name: "Replay",
      ownerId: human.id,
    });
    const restarted = composition(runner, new RecordingAuditPort()).service;
    const replay = await restarted.createWorkstream({
      ...command(id, key),
      name: "Replay",
      ownerId: human.id,
    });
    assertEquals(replay, created);
    assertEquals(await sideEffectCounts(pool, id, key), {
      aggregate: 1,
      history: 1,
      audit: 1,
      outbox: 1,
      idempotency: 1,
      results: 1,
    });
    await assertRejects(
      () =>
        restarted.createWorkstream({
          ...command(id, key),
          name: "Changed payload",
          ownerId: human.id,
        }),
      Error,
      "payload digest changed",
    );
    await pool.end();
  },
});

Deno.test({
  name: "PostgreSQL identical concurrent commands execute once",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = Date.now().toString();
    const id = workstreamId(`workstream_concurrent-${suffix}`);
    const key = idempotency(`concurrent-${suffix}`);
    const run = () =>
      composition(runner, new RecordingAuditPort()).service
        .createWorkstream({
          ...command(id, key),
          name: "Concurrent",
          ownerId: human.id,
        });
    const results = await Promise.all([run(), run()]);
    assertEquals(results[0], results[1]);
    assertEquals(await sideEffectCounts(pool, id, key), {
      aggregate: 1,
      history: 1,
      audit: 1,
      outbox: 1,
      idempotency: 1,
      results: 1,
    });
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL concurrent Task attachments use one Workstream If-Match and roll back the loser",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = Date.now().toString();
    const ownerId = workstreamId(`workstream_attach-${suffix}`);
    const owner = await composition(runner, new RecordingAuditPort()).service
      .createWorkstream({
        ...command(ownerId, idempotency(`attach-owner-${suffix}`)),
        name: "Concurrent owner",
        ownerId: human.id,
      });
    const create = (suffixValue: string) =>
      composition(runner, new RecordingAuditPort()).service.createTask({
        context,
        actor: human,
        scope,
        id: taskId(`task_attach-${suffix}-${suffixValue}`),
        idempotencyKey: idempotency(`attach-${suffix}-${suffixValue}`),
        expectedVersion: owner.version,
        workstreamId: owner.id,
        title: `Task ${suffixValue}`,
        assigneeId: human.id,
      });
    const settled = await Promise.allSettled([create("one"), create("two")]);
    assertEquals(
      settled.filter((item) => item.status === "fulfilled").length,
      1,
    );
    assertEquals(
      settled.filter((item) => item.status === "rejected").length,
      1,
    );
    const loserId = taskId(
      `task_attach-${suffix}-${
        settled[0].status === "rejected" ? "one" : "two"
      }`,
    );
    const loserRows = await pool.query(
      `SELECT
         (SELECT count(*) FROM work_management.tasks_current WHERE task_id=$1) AS tasks,
         (SELECT count(*) FROM work_management.aggregate_history WHERE aggregate_id=$1) AS history,
         (SELECT count(*) FROM work_management.command_results WHERE aggregate_id=$1) AS results,
         (SELECT count(*) FROM platform.idempotency_records WHERE target_id LIKE $2) AS idempotency,
         (SELECT count(*) FROM audit_activity.audit_events WHERE aggregate_id=$1) AS audit,
         (SELECT count(*) FROM platform.outbox WHERE aggregate_id=$1) AS outbox`,
      [loserId, `%|${loserId}`],
    );
    assertEquals(loserRows.rows[0], {
      tasks: "0",
      history: "0",
      results: "0",
      idempotency: "0",
      audit: "0",
      outbox: "0",
    });
    const current = await pool.query(
      `SELECT version::int AS version, document->'taskIds' AS "taskIds"
       FROM work_management.workstreams_current WHERE workstream_id=$1`,
      [owner.id],
    );
    assertEquals(current.rows[0].version, 2);
    const winner = settled.find((item) => item.status === "fulfilled");
    if (winner?.status !== "fulfilled") {
      throw new Error("Expected one winning attachment.");
    }
    assertEquals(current.rows[0].taskIds, [winner.value.id]);
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL audit failure rolls back aggregate history outbox result and idempotency",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await migrate(pool);
    const runner = new PostgresTransactionRunner(pool);
    const suffix = Date.now().toString();
    const id = workstreamId(`workstream_rollback-${suffix}`);
    const key = idempotency(`rollback-${suffix}`);
    await assertRejects(
      () =>
        composition(runner, new FailingAuditPort()).service.createWorkstream({
          ...command(id, key),
          name: "Rollback",
          ownerId: human.id,
        }),
      Error,
      "audit-failure",
    );
    assertEquals(await sideEffectCounts(pool, id, key), {
      aggregate: 0,
      history: 0,
      audit: 0,
      outbox: 0,
      idempotency: 0,
      results: 0,
    });
    await pool.end();
  },
});

function composition(
  runner: PostgresTransactionRunner,
  audit: WorkManagementAuditPort,
) {
  return createPostgresWorkManagementComposition({
    mode: "commands",
    transactions: runner,
    audit,
    authorization: {
      authorize: allow,
      transactionSafe: true,
      transactionMode: "postgres_transaction_local",
    },
    clock: { now: () => "2026-08-06T12:00:00.000Z" },
  });
}

class RecordingAuditPort implements WorkManagementAuditPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
  private readonly repository = new PostgresAuditEventRepository();

  async append(
    transaction: TransactionHandle,
    event: WorkManagementEvent,
  ): Promise<string> {
    const audit = await auditDraft(event);
    await this.repository.append(transaction, audit);
    return audit.eventId;
  }
}

class FailingAuditPort implements WorkManagementAuditPort {
  readonly transactionSafe = true as const;
  readonly transactionMode = "postgres_transaction_local" as const;
  append(): Promise<string> {
    return Promise.reject(new Error("audit-failure"));
  }
}

async function auditDraft(
  event: WorkManagementEvent,
): Promise<AuditEventDraft> {
  const eventId = `audit_${event.eventId}` as AuditEventId;
  return {
    eventId,
    tenantId: event.tenantId,
    workspaceId: event.workspaceId,
    dealId: event.dealId,
    actorId: event.actorId,
    actorKind: event.actorKind === "human" ? "human" : "system",
    origin: "http",
    correlationId: event.correlationId,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: 1,
    authoritySnapshot: {
      snapshotId: `authority_${event.eventId}`,
      actorId: event.actorId,
      actorKind: event.actorKind === "human" ? "human" : "system",
      policyVersion: "test-policy-v1",
      scope: {
        tenantId: event.tenantId,
        workspaceId: event.workspaceId,
        dealId: event.dealId,
      },
      capturedAt: event.occurredAt,
    },
    evidenceSnapshot: { capturedAt: event.occurredAt, references: [] },
    provenance: {
      actorId: event.actorId,
      actorKind: event.actorKind === "human" ? "human" : "system",
      origin: "http",
    },
    payload: {
      workEventId: event.eventId,
      state: String(event.payload.state),
    },
    classifications: { workEventId: "internal", state: "internal" },
    contentDigest: await payloadDigest(event.payload),
    occurredAt: event.occurredAt,
  };
}

function command(
  id: ReturnType<typeof workstreamId>,
  idempotencyKey: ReturnType<typeof idempotency>,
) {
  return { context, actor: human, scope, id, idempotencyKey };
}

function idempotency(suffix: string) {
  const parsed = parseIdempotencyKey(`idem_${suffix}`);
  if (parsed.ok) return parsed.value;
  throw new Error(`Invalid test idempotency key "${suffix}".`);
}

function allow(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [action("create")],
    approvedScope: undefined as never,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}

async function migrate(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
) {
  await ensureWorkManagementTestRoles(pool);
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...workManagementMigrations,
  ]);
  await resetCommandContext(pool);
  await activateCommands(pool, `command-${Date.now()}`);
}

async function resetCommandContext(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      work_management.tasks_current,
      work_management.workstreams_current,
      work_management.approval_requests_current,
      work_management.aggregate_history,
      work_management.approval_decision_history,
      work_management.command_results,
      work_management.target_command_dispatches,
      work_management.authority_evaluations,
      work_management.command_preparations,
      work_management.membership_reconciliation_resolutions,
      work_management.membership_reconciliation_findings,
      work_management.membership_reconciliation_scans,
      work_management.membership_reconciliation_activation,
      work_management.membership_rollout_events,
      work_management.membership_operator_actor_bindings,
      work_management.membership_operator_actor_binding_events,
      platform.idempotency_records,
      platform.outbox,
      platform.inbox,
      audit_activity.audit_events,
      audit_activity.redaction_overlays
    RESTART IDENTITY CASCADE
  `);
  await pool.query(
    `INSERT INTO work_management.membership_reconciliation_activation
      (activation_id, mode, unresolved_blocking_count, recorded_at)
      VALUES (TRUE, 'read_only', 0, now())`,
  );
}

async function activateCommands(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  suffix: string,
): Promise<void> {
  const scanId = `scan_${suffix}`;
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_bindings
      (session_role, actor_id) VALUES (current_user, $1)
      ON CONFLICT (session_role, actor_id) DO NOTHING`,
    ["test:command-suite"],
  );
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ($1, current_user, $2, 'bind', now())
     ON CONFLICT (event_id) DO NOTHING`,
    [`binding_event_command_${suffix}`, "test:command-suite"],
  );
  await pool.query(
    "SELECT work_management.scan_membership_authority($1,$2)",
    [scanId, new Date().toISOString()],
  );
  await pool.query(
    "SELECT set_config('work_management.operator_actor',$1,false)",
    ["test:command-suite"],
  );
  await pool.query(
    "SELECT work_management.set_membership_rollout_mode($1,'commands',$2,$3,$4)",
    [
      `activate_${suffix}`,
      scanId,
      "test:command-suite",
      new Date().toISOString(),
    ],
  );
}

async function sideEffectCounts(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  id: string,
  key: string,
) {
  const values = [scope.tenantId, scope.workspaceId, scope.dealId, id];
  const targetId = `${scope.workspaceId}|${scope.dealId}|${id}`;
  const queries = await Promise.all([
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.workstreams_current WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND workstream_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.aggregate_history WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM audit_activity.audit_events WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM platform.outbox WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM platform.idempotency_records WHERE tenant_id=$1 AND actor_id=$2 AND command_type='create_workstream' AND target_id=$3 AND idempotency_key=$4",
      [scope.tenantId, human.id, targetId, key],
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.command_results WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ),
  ]);
  return {
    aggregate: queries[0].rows[0].count,
    history: queries[1].rows[0].count,
    audit: queries[2].rows[0].count,
    outbox: queries[3].rows[0].count,
    idempotency: queries[4].rows[0].count,
    results: queries[5].rows[0].count,
  };
}
