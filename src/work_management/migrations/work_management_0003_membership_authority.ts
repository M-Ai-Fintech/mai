import { defineMigration } from "../../platform/persistence/v1.ts";
import { membershipEnforcementSql } from "./membership_enforcement_sql.ts";
import { membershipReconciliationSql } from "./membership_reconciliation_sql.ts";

export const workManagementMembershipAuthorityMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0003-membership-authority",
  version: 3,
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
        'work_management-0003-initial', CURRENT_TIMESTAMP
      );
      SELECT work_management.set_membership_rollout_mode(
        'work_management-0003-read-only', 'read_only',
        'work_management-0003-initial', 'migration:work_management-0003',
        CURRENT_TIMESTAMP
      );
    `,
  }],
});
