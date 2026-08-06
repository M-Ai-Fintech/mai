import { defineMigration } from "../../platform/persistence/v1.ts";

/**
 * Installs immutable authority evaluations and the durable preparation ledger
 * used when a command must keep external work outside its final transaction.
 */
export const workManagementAuthorityAndPreparedMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0004-authority-and-prepared",
  version: 4,
  forwardNotes:
    "Persist digest-bound authority evaluations and short-lived command preparation state without replacing the atomic finalization boundary.",
  rollbackNotes:
    "Disable preparation and authority-proof consumers while retaining immutable evaluations, preparation evidence, and all prior command records.",
  statements: [{
    schema: "work_management",
    sql: `
      ALTER TABLE work_management.target_command_dispatches
        ADD COLUMN IF NOT EXISTS authority_proof_id TEXT,
        ADD COLUMN IF NOT EXISTS authority_proof_digest CHAR(64)
          CHECK (authority_proof_digest IS NULL OR authority_proof_digest ~ '^[0-9a-f]{64}$');
      CREATE INDEX IF NOT EXISTS work_management_target_dispatch_proof_idx
        ON work_management.target_command_dispatches (authority_proof_id, authority_proof_digest);

      CREATE TABLE work_management.authority_evaluations (
        evaluation_id TEXT PRIMARY KEY,
        evaluation_digest CHAR(64) NOT NULL
          CHECK (evaluation_digest ~ '^[0-9a-f]{64}$'),
        approval_package_id TEXT NOT NULL,
        approval_package_version BIGINT NOT NULL CHECK (approval_package_version > 0),
        approval_package_digest CHAR(64) NOT NULL
          CHECK (approval_package_digest ~ '^[0-9a-f]{64}$'),
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        snapshot_reference TEXT NOT NULL,
        command_type TEXT NOT NULL,
        target_aggregate_type TEXT NOT NULL,
        target_aggregate_id TEXT NOT NULL,
        expected_target_version BIGINT NOT NULL CHECK (expected_target_version > 0),
        approver_id TEXT NOT NULL,
        facts JSONB NOT NULL CHECK (jsonb_typeof(facts) = 'object'),
        limits JSONB NOT NULL CHECK (jsonb_typeof(limits) = 'array'),
        limit_results JSONB NOT NULL CHECK (jsonb_typeof(limit_results) = 'array'),
        outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'denied')),
        reasons JSONB NOT NULL CHECK (jsonb_typeof(reasons) = 'array'),
        effective_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        evaluated_at TIMESTAMPTZ NOT NULL,
        evaluation JSONB NOT NULL CHECK (jsonb_typeof(evaluation) = 'object'),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (evaluation_digest)
      );
      CREATE INDEX work_management_authority_evaluations_scope_idx
        ON work_management.authority_evaluations
        (tenant_id, workspace_id, deal_id, target_aggregate_type,
         target_aggregate_id, expected_target_version, evaluated_at);
      CREATE INDEX work_management_authority_evaluations_package_idx
        ON work_management.authority_evaluations
        (approval_package_id, approval_package_version, approval_package_digest);
      CREATE TRIGGER authority_evaluations_no_update_or_delete
        BEFORE UPDATE OR DELETE ON work_management.authority_evaluations
        FOR EACH ROW EXECUTE FUNCTION work_management.reject_corrective_record_mutation();

      CREATE TABLE work_management.command_preparations (
        command_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        command_type TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        payload_digest CHAR(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
        owner_token TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('claimed', 'prepared', 'completed', 'failed')),
        prepared JSONB CHECK (prepared IS NULL OR jsonb_typeof(prepared) = 'object'),
        result JSONB CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
        failure_code TEXT,
        lease_expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (tenant_id, workspace_id, deal_id, actor_id, command_type,
          aggregate_type, aggregate_id, idempotency_key)
      );
      CREATE INDEX work_management_command_preparations_lease_idx
        ON work_management.command_preparations (state, lease_expires_at);
      CREATE INDEX work_management_command_preparations_scope_idx
        ON work_management.command_preparations
        (tenant_id, workspace_id, deal_id, aggregate_type, aggregate_id);
      CREATE TRIGGER command_preparations_no_delete
        BEFORE DELETE ON work_management.command_preparations
        FOR EACH ROW EXECUTE FUNCTION work_management.reject_corrective_record_mutation();
    `,
  }],
});
