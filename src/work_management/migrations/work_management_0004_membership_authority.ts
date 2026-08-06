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
    statements: [{
      schema: "work_management",
      sql: membershipReconciliationSql,
    }, {
      schema: "work_management",
      sql: membershipEnforcementSql,
    }, {
      schema: "work_management",
      sql: `
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
