import { auditActivityMigrations } from "../../src/audit_activity/migrations/index.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  workManagementMigrationOptions,
  workManagementMigrations,
} from "../../src/work_management/migrations/index.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
} from "../platform/support/postgres.ts";
import { requester, scope } from "./target_dispatch_test_setup.ts";
export async function migrate(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
) {
  await ensureWorkManagementTestRoles(pool);
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...auditActivityMigrations,
    ...workManagementMigrations,
  ], workManagementMigrationOptions());
  await resetDispatchContext(pool);
  await activateCommands(pool, `dispatch-${Date.now()}`);
}

async function resetDispatchContext(
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
      work_management.authority_denials,
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
    `SELECT set_config(
        'work_management.activation_writer',
        md5(current_user || txid_current()::text ||
          'work-management-activation-writer-v1'), true);
      INSERT INTO work_management.membership_reconciliation_activation
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
    ["test:dispatch-suite"],
  );
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ($1, current_user, $2, 'bind', now())
     ON CONFLICT (event_id) DO NOTHING`,
    [`binding_event_dispatch_${suffix}`, "test:dispatch-suite"],
  );
  await pool.query(
    "SELECT work_management.scan_membership_authority($1,$2)",
    [scanId, new Date().toISOString()],
  );
  await pool.query(
    "SELECT set_config('work_management.operator_actor',$1,false)",
    ["test:dispatch-suite"],
  );
  await pool.query(
    "SELECT work_management.set_membership_rollout_mode($1,'commands',$2,$3,$4)",
    [
      `activate_${suffix}`,
      scanId,
      "test:dispatch-suite",
      new Date().toISOString(),
    ],
  );
}

export async function dispatchCounts(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  requestId: string,
) {
  const values = [scope.tenantId, scope.workspaceId, scope.dealId, requestId];
  const results = await Promise.all([
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.approval_decision_history WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.target_command_dispatches WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM platform.outbox WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4 AND event_type='work_management.target_command_ready'",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.aggregate_history WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4 AND event_type='approval.approved'",
      values,
    ),
  ]);
  return {
    decisions: results[0].rows[0].count,
    dispatches: results[1].rows[0].count,
    targetOutbox: results[2].rows[0].count,
    approvalEvents: results[3].rows[0].count,
  };
}

export async function approvalCreationCounts(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  requestId: string,
  key: string,
) {
  const values = [scope.tenantId, scope.workspaceId, scope.dealId, requestId];
  const targetId = `${scope.workspaceId}|${scope.dealId}|${requestId}`;
  const queries = await Promise.all([
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.approval_requests_current WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
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
      "SELECT count(*)::int AS count FROM platform.idempotency_records WHERE tenant_id=$1 AND actor_id=$2 AND command_type='create_approval_request' AND target_id=$3 AND idempotency_key=$4",
      [scope.tenantId, requester.id, targetId, key],
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

export async function denialCounts(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  requestId: string,
  key: string,
) {
  const values = [scope.tenantId, scope.workspaceId, scope.dealId, requestId];
  const targetId = `${scope.workspaceId}|${scope.dealId}|${requestId}`;
  const results = await Promise.all([
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.approval_requests_current WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
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
      "SELECT count(*)::int AS count FROM work_management.notifications WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND aggregate_id=$4",
      values,
    ).catch(() => ({ rows: [{ count: 0 }] })),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.target_command_dispatches WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND approval_request_id=$4",
      values,
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.authority_denials WHERE denial_id LIKE $1",
      [`authority_denial_v1_%`],
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM work_management.authority_evaluations",
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM platform.idempotency_records WHERE tenant_id=$1 AND actor_id=$2 AND command_type='create_approval_request' AND target_id=$3 AND idempotency_key=$4",
      [scope.tenantId, requester.id, targetId, key],
    ),
  ]);
  return {
    aggregate: results[0].rows[0].count,
    history: results[1].rows[0].count,
    audit: results[2].rows[0].count,
    outbox: results[3].rows[0].count,
    notification: results[4].rows[0].count,
    dispatch: results[5].rows[0].count,
    denial: results[6].rows[0].count,
    evaluation: results[7].rows[0].count,
    idempotency: results[8].rows[0].count,
  };
}
