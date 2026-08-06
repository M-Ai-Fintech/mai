import { defineMigration } from "../../platform/persistence/v1.ts";

/** Adds monotonic scan ordering for safe activation freshness checks. */
export const workManagementMembershipOperabilityMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0006-membership-operability",
  version: 6,
  forwardNotes:
    "Add a database-assigned reconciliation sequence so activation freshness is not dependent on caller timestamps.",
  rollbackNotes:
    "Disable commands activation while retaining reconciliation scans and findings; never remove evidence during rollback.",
  statements: [{
    schema: "work_management",
    sql: `
      ALTER TABLE work_management.membership_reconciliation_scans
        ADD COLUMN IF NOT EXISTS scan_sequence BIGINT GENERATED ALWAYS AS IDENTITY;
      CREATE UNIQUE INDEX IF NOT EXISTS
        work_management_membership_reconciliation_scans_sequence_idx
        ON work_management.membership_reconciliation_scans (scan_sequence);
    `,
  }],
});
