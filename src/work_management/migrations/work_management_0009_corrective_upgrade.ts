import { defineMigration } from "../../platform/persistence/v1.ts";
import { membershipEnforcementSql } from "./membership_enforcement_sql.ts";
import { membershipReconciliationSql } from "./membership_reconciliation_sql.ts";
import { workManagementAuthorityAndPreparedSql } from "./work_management_0004_authority_and_prepared.ts";

/**
 * Replays every corrective schema delta for databases that already recorded
 * migrations 0004-0006 before the closure corrections were integrated.
 */
export const workManagementCorrectiveUpgradeMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0009-corrective-upgrade",
  version: 9,
  forwardNotes:
    "Apply reconciliation, authority-proof, append-only, bounded-enforcement, actor-binding, and read-only preparation corrections to already-ledgered Work Management databases.",
  rollbackNotes:
    "Disable command activation while retaining all corrective tables, findings, authority evaluations, bindings, preparation evidence, and history.",
  statements: [{
    schema: "work_management",
    sql: workManagementAuthorityAndPreparedSql,
  }, {
    schema: "work_management",
    sql: `
      ALTER TABLE work_management.membership_reconciliation_findings
        DROP CONSTRAINT IF EXISTS membership_reconciliation_findings_finding_class_check;
      ALTER TABLE work_management.membership_reconciliation_findings
        ADD CONSTRAINT membership_reconciliation_finding_class_check CHECK (finding_class IN (
          'malformed_workstream_task_ids', 'malformed_task_id',
          'duplicate_authoritative_task_id',
          'task_document_back_reference_mismatch', 'task_owner_workstream_missing',
          'task_owner_scope_mismatch', 'task_missing_from_authoritative_membership',
          'authoritative_task_missing', 'authoritative_task_wrong_workstream',
          'authoritative_task_scope_mismatch', 'ambiguous_legacy_ownership',
          'terminal_workstream_non_terminal_task', 'legacy_rollout_missing_scan'
        ));
    `,
  }, {
    schema: "work_management",
    sql: membershipReconciliationSql,
  }, {
    schema: "work_management",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'work_management.membership_rollout_events'::regclass
            AND conname = 'membership_rollout_commands_scan_check'
        ) THEN
          ALTER TABLE work_management.membership_rollout_events
            ADD CONSTRAINT membership_rollout_commands_scan_check
            CHECK (mode <> 'commands' OR scan_id IS NOT NULL) NOT VALID;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM work_management.membership_rollout_events
          WHERE mode = 'commands' AND scan_id IS NULL
        ) THEN
          ALTER TABLE work_management.membership_rollout_events
            VALIDATE CONSTRAINT membership_rollout_commands_scan_check;
        END IF;
      END
      $$;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_attribute
          WHERE attrelid = 'work_management.membership_operator_actor_binding_events'::regclass
            AND attname = 'event_sequence'
            AND NOT attisdropped
        ) THEN
          ALTER TABLE work_management.membership_operator_actor_binding_events
            ADD COLUMN event_sequence BIGINT GENERATED ALWAYS AS IDENTITY;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'work_management.membership_operator_actor_binding_events'::regclass
            AND conname = 'membership_operator_actor_binding_events_binding_fk'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM work_management.membership_operator_actor_binding_events
            WHERE (session_role, actor_id) NOT IN (
              SELECT session_role, actor_id
              FROM work_management.membership_operator_actor_bindings
            )
          ) THEN
            RAISE EXCEPTION 'orphaned operator binding events require governed reconciliation';
          END IF;
          ALTER TABLE work_management.membership_operator_actor_binding_events
            ADD CONSTRAINT membership_operator_actor_binding_events_binding_fk
            FOREIGN KEY (session_role, actor_id)
            REFERENCES work_management.membership_operator_actor_bindings(session_role, actor_id);
        END IF;
      END
      $$;
      CREATE UNIQUE INDEX IF NOT EXISTS membership_operator_actor_binding_events_sequence_idx
        ON work_management.membership_operator_actor_binding_events(event_sequence);
    `,
  }, {
    schema: "work_management",
    sql: membershipEnforcementSql,
  }, {
    schema: "work_management",
    sql: `
      LOCK TABLE work_management.workstreams_current,
        work_management.tasks_current IN SHARE MODE;
      INSERT INTO work_management.membership_operator_actor_bindings
        (session_role, actor_id) VALUES (session_user, 'migration:work_management-0009')
        ON CONFLICT (session_role, actor_id) DO NOTHING;
      INSERT INTO work_management.membership_operator_actor_binding_events
        (event_id, session_role, actor_id, action, recorded_at)
        VALUES ('binding_event_migration_0009', session_user,
          'migration:work_management-0009', 'bind', CURRENT_TIMESTAMP)
        ON CONFLICT (event_id) DO NOTHING;
      SELECT set_config('work_management.operator_actor',
        'migration:work_management-0009', true);
      SELECT work_management.scan_membership_authority(
        'work_management-0009-reconciliation', CURRENT_TIMESTAMP
      );
      SELECT set_config(
        'work_management.membership_writer',
        md5(current_user || txid_current()::text || 'work-management-scan-writer-v1'),
        true
      );
      INSERT INTO work_management.membership_reconciliation_findings
        (finding_id, scan_id, finding_class, severity, action, status,
         required_human_action, detected_values, detected_at)
      SELECT md5(concat('work_management-0009-rollout-', event_id)),
        'work_management-0009-reconciliation', 'legacy_rollout_missing_scan',
        'blocking', 'block_commands', 'unresolved', 'repair_membership',
        jsonb_build_object('eventId', event_id, 'mode', mode,
          'scanId', scan_id), CURRENT_TIMESTAMP
      FROM work_management.membership_rollout_events
      WHERE mode = 'commands' AND scan_id IS NULL
      ON CONFLICT (finding_id) DO NOTHING;
      SELECT set_config(
        'work_management.activation_writer',
        md5(current_user || txid_current()::text || 'work-management-activation-writer-v1'),
        true
      );
      UPDATE work_management.membership_reconciliation_activation
        SET mode = 'read_only',
          unresolved_blocking_count = (
            SELECT count(*) FROM work_management.membership_reconciliation_status
            WHERE severity = 'blocking' AND current_status = 'unresolved'
          ),
          recorded_at = CURRENT_TIMESTAMP
        WHERE activation_id = TRUE;
      SELECT set_config('work_management.membership_writer', 'forbidden', true);
      SELECT work_management.set_membership_rollout_mode(
        'work_management-0009-read-only', 'read_only',
        'work_management-0009-reconciliation',
        'migration:work_management-0009', CURRENT_TIMESTAMP
      );
      SELECT work_management.membership_commands_available();
    `,
  }],
});
