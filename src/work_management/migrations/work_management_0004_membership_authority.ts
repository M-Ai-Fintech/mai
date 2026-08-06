import { defineMigration } from "../../platform/persistence/v1.ts";
import { historicalMembershipEnforcementSql } from "./membership_enforcement_sql_historical.ts";
import { historicalMembershipReconciliationRolloutSql } from "./membership_reconciliation_sql_historical_rollout.ts";
import { historicalMembershipReconciliationScanSql } from "./membership_reconciliation_sql_historical_scan.ts";
import { historicalMembershipReconciliationSchemaSql } from "./membership_reconciliation_sql_historical_schema.ts";

/**
 * Supersedes the reviewed membership migration without changing its ledger
 * identity. Existing databases retain the 0003 checksum and receive this
 * evidence-preserving enforcement as an additive upgrade.
 */
export const workManagementMembershipAuthorityUpgradeMigration =
  defineMigration({
    owner: "work_management",
    schema: "work_management",
    id: "work_management-0004-membership-authority",
    version: 4,
    forwardNotes:
      "Install durable append-only membership reconciliation evidence, default commands to read-only, and enforce Workstream taskIds authority with affected-membership checks.",
    rollbackNotes:
      "Return Work Management to read-only while retaining scans, findings, resolutions, rollout events, aggregate history, and current records for operator reconciliation.",
    statements: [{
      schema: "work_management",
      sql: historicalMembershipReconciliationSchemaSql +
        historicalMembershipReconciliationScanSql +
        historicalMembershipReconciliationRolloutSql,
    }, {
      schema: "work_management",
      sql: historicalMembershipEnforcementSql,
    }, {
      schema: "work_management",
      sql: `
        -- Fence legacy writers before the first scan  SHARE conflicts with
        -- row-changing locks, so the scan cannot miss a writer that commits
        -- between reconciliation and trigger activation
        LOCK TABLE work_management.workstreams_current,
          work_management.tasks_current IN SHARE MODE;
        INSERT INTO work_management.membership_operator_actor_bindings
          (session_role, actor_id) VALUES (session_user, 'migration:work_management-0004')
          ON CONFLICT (session_role, actor_id) DO NOTHING;
        INSERT INTO work_management.membership_operator_actor_binding_events
          (event_id, session_role, actor_id, action, recorded_at)
          VALUES ('binding_event_migration_0004', session_user,
            'migration:work_management-0004', 'bind', CURRENT_TIMESTAMP)
          ON CONFLICT (event_id) DO NOTHING;
        SELECT set_config('work_management.operator_actor',
          'migration:work_management-0004', true);
        SELECT work_management.scan_membership_authority(
          'work_management-0004-initial', CURRENT_TIMESTAMP
        );
        SELECT work_management.set_membership_rollout_mode(
          'work_management-0004-read-only', 'read_only',
          'work_management-0004-initial', 'migration:work_management-0004',
          CURRENT_TIMESTAMP
        );
        SELECT work_management.membership_commands_available();
      `,
    }],
  });
