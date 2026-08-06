import { defineMigration } from "../../platform/persistence/v1.ts";

export const workManagementMigration = defineMigration({
  owner: "work_management",
  schema: "work_management",
  id: "work_management-0001",
  version: 1,
  forwardNotes:
    "Create additive tenant/workspace/deal-scoped Work Management aggregates, immutable approval packages and decision history, with append-only transition evidence.",
  rollbackNotes:
    "Disable Work Management commands and notification consumers, route reads to the legacy read-only view, and retain every aggregate, package, decision, idempotency, audit, and outbox record for reconciliation.",
  statements: [
    {
      schema: "work_management",
      sql: `
        CREATE SCHEMA IF NOT EXISTS work_management;
        CREATE TABLE work_management.workstreams_current (
          workstream_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, workstream_id)
        );
        CREATE INDEX work_management_workstreams_scope_idx
          ON work_management.workstreams_current (tenant_id, workspace_id, deal_id, updated_at, workstream_id);
        CREATE TABLE work_management.tasks_current (
          task_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          workstream_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, task_id),
          UNIQUE (tenant_id, workspace_id, deal_id, workstream_id, task_id)
        );
        CREATE INDEX work_management_tasks_workstream_idx
          ON work_management.tasks_current (tenant_id, workspace_id, deal_id, workstream_id, updated_at, task_id);
        CREATE TABLE work_management.approval_requests_current (
          approval_request_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          requester_id TEXT NOT NULL,
          named_approver_id TEXT NOT NULL,
          package_id TEXT NOT NULL,
          package_version BIGINT NOT NULL CHECK (package_version > 0),
          package_digest CHAR(64) NOT NULL CHECK (package_digest ~ '^[0-9a-f]{64}$'),
          state TEXT NOT NULL CHECK (state IN ('draft', 'open', 'decided', 'withdrawn', 'expired', 'invalidated')),
          document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, approval_request_id),
          CHECK (requester_id <> named_approver_id)
        );
        CREATE INDEX work_management_approval_scope_idx
          ON work_management.approval_requests_current (tenant_id, workspace_id, deal_id, state, updated_at, approval_request_id);
        CREATE TABLE work_management.aggregate_history (
          event_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('workstream', 'task', 'approval_request')),
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          occurred_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_type, aggregate_id, aggregate_version)
        );
        CREATE INDEX work_management_history_scope_idx
          ON work_management.aggregate_history (tenant_id, workspace_id, deal_id, aggregate_type, aggregate_id, aggregate_version);
        CREATE TABLE work_management.approval_decision_history (
          decision_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          approval_request_id TEXT NOT NULL,
          approval_request_version BIGINT NOT NULL CHECK (approval_request_version > 0),
          package_id TEXT NOT NULL,
          package_version BIGINT NOT NULL CHECK (package_version > 0),
          package_digest CHAR(64) NOT NULL CHECK (package_digest ~ '^[0-9a-f]{64}$'),
          outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'rejected')),
          approver_id TEXT NOT NULL,
          decision JSONB NOT NULL CHECK (jsonb_typeof(decision) = 'object'),
          recorded_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, approval_request_id)
        );
        CREATE FUNCTION work_management.reject_aggregate_history_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'work_management aggregate history is append-only';
        END;
        $$;
        CREATE TRIGGER aggregate_history_no_update_or_delete
          BEFORE UPDATE OR DELETE ON work_management.aggregate_history
          FOR EACH ROW EXECUTE FUNCTION work_management.reject_aggregate_history_mutation();
        CREATE FUNCTION work_management.reject_decision_history_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'work_management approval decision history is append-only';
        END;
        $$;
        CREATE TRIGGER approval_decision_history_no_update_or_delete
          BEFORE UPDATE OR DELETE ON work_management.approval_decision_history
          FOR EACH ROW EXECUTE FUNCTION work_management.reject_decision_history_mutation();
      `,
    },
  ],
});

export const workManagementMigrations = Object.freeze([
  workManagementMigration,
]);
