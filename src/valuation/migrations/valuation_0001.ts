import { defineMigration } from "../../platform/persistence/v1.ts";

export const valuationMigration = defineMigration({
  owner: "valuation",
  schema: "valuation",
  id: "valuation-0001",
  version: 1,
  forwardNotes:
    "Create versioned Valuation models, scenarios, exact-basis inputs and immutable results with approval, invalidation, comparison, and audit records.",
  rollbackNotes:
    "Disable Valuation compute and approval consumers while retaining every model version, scenario version, immutable result, approval, invalidation, comparison, audit, and outbox record.",
  statements: [
    {
      schema: "valuation",
      sql: "CREATE SCHEMA valuation",
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.models (
          model_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          model_version BIGINT NOT NULL CHECK (model_version > 0),
          state TEXT NOT NULL CHECK (state IN ('draft', 'active', 'retired')),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, model_id, model_version)
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.scenarios (
          scenario_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          model_id TEXT NOT NULL,
          model_version BIGINT NOT NULL CHECK (model_version > 0),
          state TEXT NOT NULL CHECK (
            state IN ('draft', 'ready', 'queued', 'computing', 'computed',
              'approved', 'stale', 'invalidated')
          ),
          current_input_id TEXT,
          current_input_version BIGINT,
          current_result_id TEXT,
          approved_result_id TEXT,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, scenario_id),
          CHECK ((current_input_id IS NULL) = (current_input_version IS NULL)),
          CHECK (current_input_version IS NULL OR current_input_version > 0)
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.inputs (
          input_id TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          input_version BIGINT NOT NULL CHECK (input_version > 0),
          scenario_version BIGINT NOT NULL CHECK (scenario_version > 0),
          model_id TEXT NOT NULL,
          model_version BIGINT NOT NULL CHECK (model_version > 0),
          basis_digest CHAR(64) NOT NULL CHECK (basis_digest ~ '^[0-9a-f]{64}$'),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, input_id, input_version),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, scenario_id)
            REFERENCES valuation.scenarios (tenant_id, workspace_id, deal_id, scenario_id)
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.results (
          result_id TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          input_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          scenario_version BIGINT NOT NULL CHECK (scenario_version > 0),
          input_version BIGINT NOT NULL CHECK (input_version > 0),
          model_id TEXT NOT NULL,
          model_version BIGINT NOT NULL CHECK (model_version > 0),
          basis_digest CHAR(64) NOT NULL CHECK (basis_digest ~ '^[0-9a-f]{64}$'),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, result_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, scenario_id)
            REFERENCES valuation.scenarios (tenant_id, workspace_id, deal_id, scenario_id)
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.approvals (
          approval_id TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          result_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          scenario_version BIGINT NOT NULL CHECK (scenario_version > 0),
          result_basis_digest CHAR(64) NOT NULL CHECK (result_basis_digest ~ '^[0-9a-f]{64}$'),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          approved_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, approval_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, scenario_id)
            REFERENCES valuation.scenarios (tenant_id, workspace_id, deal_id, scenario_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, result_id)
            REFERENCES valuation.results (tenant_id, workspace_id, deal_id, result_id)
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.invalidations (
          invalidation_id TEXT NOT NULL,
          scenario_id TEXT NOT NULL,
          result_id TEXT,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          scenario_version BIGINT NOT NULL CHECK (scenario_version > 0),
          invalidation_kind TEXT NOT NULL CHECK (invalidation_kind IN ('stale', 'invalidated')),
          reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 1024),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, invalidation_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, scenario_id)
            REFERENCES valuation.scenarios (tenant_id, workspace_id, deal_id, scenario_id),
          FOREIGN KEY (tenant_id, workspace_id, deal_id, result_id)
            REFERENCES valuation.results (tenant_id, workspace_id, deal_id, result_id)
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.comparisons (
          comparison_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          projection_version BIGINT NOT NULL CHECK (projection_version > 0),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, comparison_id)
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TABLE valuation.audit_events (
          event_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          basis_digest CHAR(64),
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          occurred_at TIMESTAMPTZ NOT NULL
        )
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE INDEX valuation_scenarios_scope_state_idx
          ON valuation.scenarios (tenant_id, workspace_id, deal_id, state, updated_at)
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE INDEX valuation_results_scope_scenario_idx
          ON valuation.results (tenant_id, workspace_id, deal_id, scenario_id, scenario_version)
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE OR REPLACE FUNCTION valuation.reject_immutable_change()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Valuation immutable history cannot be changed';
        END;
        $$
      `,
    },
    {
      schema: "valuation",
      sql: `
        CREATE TRIGGER valuation_models_immutable
          BEFORE UPDATE OR DELETE ON valuation.models
          FOR EACH ROW EXECUTE FUNCTION valuation.reject_immutable_change();
        CREATE TRIGGER valuation_inputs_immutable
          BEFORE UPDATE OR DELETE ON valuation.inputs
          FOR EACH ROW EXECUTE FUNCTION valuation.reject_immutable_change();
        CREATE TRIGGER valuation_results_immutable
          BEFORE UPDATE OR DELETE ON valuation.results
          FOR EACH ROW EXECUTE FUNCTION valuation.reject_immutable_change();
        CREATE TRIGGER valuation_approvals_immutable
          BEFORE UPDATE OR DELETE ON valuation.approvals
          FOR EACH ROW EXECUTE FUNCTION valuation.reject_immutable_change();
        CREATE TRIGGER valuation_invalidations_immutable
          BEFORE UPDATE OR DELETE ON valuation.invalidations
          FOR EACH ROW EXECUTE FUNCTION valuation.reject_immutable_change();
        CREATE TRIGGER valuation_comparisons_immutable
          BEFORE UPDATE OR DELETE ON valuation.comparisons
          FOR EACH ROW EXECUTE FUNCTION valuation.reject_immutable_change();
        CREATE TRIGGER valuation_audit_events_immutable
          BEFORE UPDATE OR DELETE ON valuation.audit_events
          FOR EACH ROW EXECUTE FUNCTION valuation.reject_immutable_change();
      `,
    },
  ],
});
