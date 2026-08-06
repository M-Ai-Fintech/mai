import { defineMigration } from "../../platform/persistence/v1.ts";

export const workManagementCorrectiveMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0002-corrective",
  version: 2,
  forwardNotes:
    "Add immutable command results and approved target-command dispatch records for atomic durable replay and foreign-context command handoff.",
  rollbackNotes:
    "Disable Work Management commands and consumers while retaining corrective command results, target dispatch, idempotency, history, decisions, audit, and outbox evidence.",
  statements: [{
    schema: "work_management",
    sql: `
      CREATE TABLE work_management.command_results (
        result_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('workstream', 'task', 'approval_request')),
        aggregate_id TEXT NOT NULL,
        aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
        result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
        recorded_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX work_management_command_results_scope_idx
        ON work_management.command_results (tenant_id, workspace_id, deal_id, aggregate_type, aggregate_id);
      CREATE TABLE work_management.target_command_dispatches (
        dispatch_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        approval_request_id TEXT NOT NULL,
        approval_request_version BIGINT NOT NULL CHECK (approval_request_version > 0),
        decision_id TEXT NOT NULL,
        target_aggregate_type TEXT NOT NULL,
        target_aggregate_id TEXT NOT NULL,
        expected_target_version BIGINT NOT NULL CHECK (expected_target_version > 0),
        package_id TEXT NOT NULL,
        package_version BIGINT NOT NULL CHECK (package_version > 0),
        package_digest CHAR(64) NOT NULL CHECK (package_digest ~ '^[0-9a-f]{64}$'),
        authority_snapshot_reference TEXT NOT NULL,
        idempotency_identity TEXT NOT NULL,
        command_type TEXT NOT NULL,
        dispatch JSONB NOT NULL CHECK (jsonb_typeof(dispatch) = 'object'),
        recorded_at TIMESTAMPTZ NOT NULL,
        UNIQUE (tenant_id, workspace_id, deal_id, approval_request_id, decision_id)
      );
      CREATE INDEX work_management_target_dispatch_scope_idx
        ON work_management.target_command_dispatches (tenant_id, workspace_id, deal_id, approval_request_id);
      CREATE FUNCTION work_management.reject_corrective_record_mutation()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'work_management corrective records are append-only';
      END;
      $$;
      CREATE TRIGGER command_results_no_update_or_delete
        BEFORE UPDATE OR DELETE ON work_management.command_results
        FOR EACH ROW EXECUTE FUNCTION work_management.reject_corrective_record_mutation();
      CREATE TRIGGER target_dispatches_no_update_or_delete
        BEFORE UPDATE OR DELETE ON work_management.target_command_dispatches
        FOR EACH ROW EXECUTE FUNCTION work_management.reject_corrective_record_mutation();
    `,
  }],
});
