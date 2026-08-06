import { defineMigration } from "../../platform/persistence/v1.ts";
import { membershipEnforcementSql } from "./membership_enforcement_sql.ts";
import { membershipReconciliationSql } from "./membership_reconciliation_sql.ts";

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
    compatibleChecksums: [
      "c515058263da7df8e7c9b78532a7065d94cba032e5bac41c2a6bd2494dc22775",
      "024442c798646aee05df42d085b0a32e8bc0ae0a0943c5c70d21ea70b01fb501",
      "d8aa4a36f908d2bdcc7eb3d80a7fcb2910a556452f0bd29cbbefe48684d92275",
      "1d596d62526edb60f65da8b3aed5ee8eb81f042e0d73737ee4fcaa66412394f5",
      "b5f062b7d0d753c6d24e3df6cb0c15c51836d0655aaf70cdaced0ae2676c55f7",
      "99dea74e62dd73f27ac4f0d18de0c07d0fda0badd0b14c44830b6ba08b5fa089",
      "f49b8f494720f2e52fa71e4799caec739aaa4033f9161b203c37a81a1fa17377",
      "827435ddf9d46b2ac63be0554e53b1e62914672fd671f306f8791e34de462feb",
    ],
    statements: [{
      schema: "work_management",
      sql: membershipReconciliationSql,
    }, {
      schema: "work_management",
      sql: membershipEnforcementSql,
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
