import { defineMigration } from "../../platform/persistence/v1.ts";

export const financialRiskMigration = defineMigration({
  owner: "financial_risk",
  schema: "financial_risk",
  id: "financial_risk-0001",
  version: 1,
  forwardNotes:
    "Create immutable financial-risk result history and scoped audit records for model, fallback, unavailable, failed, cancelled, stale, and superseded outcomes.",
  rollbackNotes:
    "Disable financial-risk commands and retain the result and audit history; do not delete model provenance or evidence receipts during rollback.",
  statements: [
    {
      schema: "financial_risk",
      sql: "CREATE SCHEMA financial_risk",
    },
    {
      schema: "financial_risk",
      sql: `
        CREATE TABLE financial_risk.results (
          result_id TEXT NOT NULL,
          assessment_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          aggregate_type TEXT NOT NULL CHECK (aggregate_type = 'financial_risk_result'),
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN (
            'completed', 'fallback', 'unavailable', 'failed',
            'cancelled', 'stale', 'superseded'
          )),
          actor_id TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          operation_id TEXT NOT NULL,
          job_id TEXT NOT NULL,
          supersedes_result_id TEXT,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, result_id),
          UNIQUE (tenant_id, workspace_id, deal_id, assessment_id, version)
        )
      `,
    },
    {
      schema: "financial_risk",
      sql: `
        CREATE TABLE financial_risk.audit_events (
          event_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          basis_digest CHAR(64) CHECK (basis_digest IS NULL OR basis_digest ~ '^[0-9a-f]{64}$'),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          occurred_at TIMESTAMPTZ NOT NULL
        )
      `,
    },
    {
      schema: "financial_risk",
      sql: `
        CREATE INDEX financial_risk_results_scope_assessment_idx
          ON financial_risk.results (tenant_id, workspace_id, deal_id, assessment_id, version DESC)
      `,
    },
    {
      schema: "financial_risk",
      sql: `
        CREATE INDEX financial_risk_audit_scope_aggregate_idx
          ON financial_risk.audit_events (tenant_id, workspace_id, deal_id, aggregate_id, aggregate_version)
      `,
    },
    {
      schema: "financial_risk",
      sql: `
        CREATE OR REPLACE FUNCTION financial_risk.reject_immutable_change()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Financial-risk immutable history cannot be changed';
        END;
        $$
      `,
    },
    {
      schema: "financial_risk",
      sql: `
        CREATE TRIGGER financial_risk_results_immutable
          BEFORE UPDATE OR DELETE ON financial_risk.results
          FOR EACH ROW EXECUTE FUNCTION financial_risk.reject_immutable_change()
      `,
    },
    {
      schema: "financial_risk",
      sql: `
        CREATE TRIGGER financial_risk_audit_events_immutable
          BEFORE UPDATE OR DELETE ON financial_risk.audit_events
          FOR EACH ROW EXECUTE FUNCTION financial_risk.reject_immutable_change()
      `,
    },
  ],
});
