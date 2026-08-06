import { defineMigration } from "../../platform/persistence/v1.ts";

/** Stores governed authority denials that occur before a package exists. */
export const workManagementAuthorityDenialsMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0010-authority-denials",
  version: 10,
  forwardNotes:
    "Add an append-only, digest-bound authority-denial record for governed pre-package and limit denials.",
  rollbackNotes:
    "Disable commands and retain the denial evidence; rollback does not delete immutable authority decisions.",
  statements: [{
    schema: "work_management",
    sql: `
      CREATE TABLE IF NOT EXISTS work_management.authority_denials (
        denial_id TEXT PRIMARY KEY,
        denial_digest TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        requester_id TEXT NOT NULL,
        named_approver_id TEXT NOT NULL,
        requested_action TEXT NOT NULL,
        denial_stage TEXT NOT NULL CHECK (denial_stage IN ('pre_package', 'limit_evaluation')),
        target_aggregate_type TEXT,
        target_aggregate_id TEXT,
        expected_target_version BIGINT,
        reasons JSONB NOT NULL,
        denial JSONB NOT NULL,
        evaluated_at TIMESTAMPTZ NOT NULL,
        idempotency_identity TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS authority_denials_digest_idx
        ON work_management.authority_denials(denial_digest);
      CREATE INDEX IF NOT EXISTS authority_denials_idempotency_idx
        ON work_management.authority_denials(idempotency_identity);
      DROP TRIGGER IF EXISTS authority_denials_no_update_or_delete
        ON work_management.authority_denials;
      CREATE TRIGGER authority_denials_no_update_or_delete
        BEFORE UPDATE OR DELETE ON work_management.authority_denials
        FOR EACH ROW EXECUTE FUNCTION work_management.reject_corrective_record_mutation();
    `,
  }],
});
