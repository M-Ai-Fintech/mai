import { defineMigration } from "../../platform/persistence/v1.ts";

export const diligenceDecisionsMigration = defineMigration({
  owner: "diligence_decisions",
  schema: "diligence_decisions",
  id: "diligence_decisions-0001",
  version: 1,
  forwardNotes:
    "Create append-only Findings, Impacts, Decision Requests, immutable Decision Records, projections, and history for the Diligence and Decisions context.",
  rollbackNotes:
    "Disable Diligence and Decisions commands and readers while retaining all immutable proposals, records, history, audit, and outbox evidence; never delete decision history as a rollback action.",
  statements: [
    {
      schema: "diligence_decisions",
      sql: "CREATE SCHEMA diligence_decisions",
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TABLE diligence_decisions.findings (
        finding_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
        state TEXT NOT NULL CHECK (state IN ('proposed', 'approved', 'superseded', 'invalidated')),
        payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, finding_id)
      )`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TABLE diligence_decisions.impacts (
        impact_id TEXT NOT NULL,
        finding_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
        state TEXT NOT NULL CHECK (state IN ('proposed', 'approved', 'superseded', 'invalidated')),
        payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, impact_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, finding_id)
          REFERENCES diligence_decisions.findings (tenant_id, workspace_id, deal_id, finding_id)
      )`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TABLE diligence_decisions.decision_requests (
        decision_request_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
        state TEXT NOT NULL CHECK (state IN ('draft', 'requested', 'decided', 'withdrawn', 'expired', 'invalidated')),
        payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, decision_request_id)
      )`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TABLE diligence_decisions.decision_records (
        decision_record_id TEXT NOT NULL,
        decision_request_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        request_version BIGINT NOT NULL CHECK (request_version > 0),
        payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
        recorded_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, decision_record_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, decision_request_id)
          REFERENCES diligence_decisions.decision_requests (tenant_id, workspace_id, deal_id, decision_request_id)
      )`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TABLE diligence_decisions.decision_projections (
        decision_request_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        current_record_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('active', 'superseded', 'invalidated')),
        projection_version BIGINT NOT NULL CHECK (projection_version > 0),
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, decision_request_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, decision_request_id)
          REFERENCES diligence_decisions.decision_requests (tenant_id, workspace_id, deal_id, decision_request_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, current_record_id)
          REFERENCES diligence_decisions.decision_records (tenant_id, workspace_id, deal_id, decision_record_id)
      )`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TABLE diligence_decisions.decision_history (
        history_id TEXT NOT NULL,
        decision_request_id TEXT NOT NULL,
        record_id TEXT NOT NULL,
        replacement_record_id TEXT,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        history_kind TEXT NOT NULL CHECK (history_kind IN ('recorded', 'superseded', 'invalidated')),
        expected_projection_version BIGINT NOT NULL CHECK (expected_projection_version >= 0),
        basis_digest CHAR(64) NOT NULL CHECK (basis_digest ~ '^[0-9a-f]{64}$'),
        payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
        created_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, workspace_id, deal_id, history_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, decision_request_id)
          REFERENCES diligence_decisions.decision_requests (tenant_id, workspace_id, deal_id, decision_request_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, record_id)
          REFERENCES diligence_decisions.decision_records (tenant_id, workspace_id, deal_id, decision_record_id),
        FOREIGN KEY (tenant_id, workspace_id, deal_id, replacement_record_id)
          REFERENCES diligence_decisions.decision_records (tenant_id, workspace_id, deal_id, decision_record_id)
      )`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE OR REPLACE FUNCTION diligence_decisions.reject_immutable_change()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Immutable Diligence decision history cannot be changed';
      END;
      $$`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TRIGGER decision_records_immutable
      BEFORE UPDATE OR DELETE ON diligence_decisions.decision_records
      FOR EACH ROW EXECUTE FUNCTION diligence_decisions.reject_immutable_change()`,
    },
    {
      schema: "diligence_decisions",
      sql: `
      CREATE TRIGGER decision_history_append_only
      BEFORE UPDATE OR DELETE ON diligence_decisions.decision_history
      FOR EACH ROW EXECUTE FUNCTION diligence_decisions.reject_immutable_change()`,
    },
  ],
});
