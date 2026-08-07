import { defineMigration } from "../../platform/persistence/v1.ts";

export const dealGovernanceMigration = defineMigration({
  owner: "deal_governance",
  schema: "deal_governance",
  id: "deal_governance-0001",
  version: 1,
  forwardNotes:
    "Additive Deal Governance schema for scoped lifecycle state, retention, legal holds, deletion authority, resumable orchestration, immutable manifests, history, and idempotency.",
  rollbackNotes:
    "Disable new governance commands and workers while retaining lifecycle history, legal holds, deletion approvals, checkpoints, manifests, and proof; rollback never physically erases governed records.",
  statements: [
    {
      schema: "deal_governance",
      sql: "CREATE SCHEMA IF NOT EXISTS deal_governance",
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.governance_aggregates (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'paused', 'terminated', 'archived')),
          document JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id),
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_id)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.retention_assignments (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL DEFAULT 'assigned',
          document JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id),
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_id)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.legal_holds (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('active', 'released')),
          document JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_id)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.deletion_requests (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN (
            'draft', 'impact_assessed', 'approval_pending', 'waiting_period',
            'scheduled', 'on_hold', 'executing', 'completed', 'rejected', 'cancelled'
          )),
          document JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_id)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.orchestrations (
          aggregate_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'paused', 'failed', 'completed', 'blocked')),
          document JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, aggregate_id)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.erasure_manifests (
          manifest_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          request_id TEXT NOT NULL,
          orchestration_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('draft', 'verified', 'blocked')),
          document JSONB NOT NULL,
          generated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, workspace_id, deal_id, manifest_id)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.command_claims (
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          payload_digest CHAR(64) NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('in_progress', 'completed')),
          result JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tenant_id, workspace_id, deal_id, actor_id, command_type, target_id, idempotency_key)
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TABLE deal_governance.history (
          position BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          event_id TEXT NOT NULL UNIQUE,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT NOT NULL,
          deal_id TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL,
          correlation_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          schema_version INTEGER NOT NULL CHECK (schema_version > 0),
          payload JSONB NOT NULL,
          occurred_at TIMESTAMPTZ NOT NULL
        )
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE FUNCTION deal_governance.reject_history_mutation() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Deal Governance history is append-only';
        END;
        $$
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE TRIGGER deal_governance_history_no_update
        BEFORE UPDATE OR DELETE ON deal_governance.history
        FOR EACH ROW EXECUTE FUNCTION deal_governance.reject_history_mutation()
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE INDEX deal_governance_holds_scope_idx
        ON deal_governance.legal_holds (tenant_id, workspace_id, deal_id, state)
      `,
    },
    {
      schema: "deal_governance",
      sql: `
        CREATE INDEX deal_governance_deletion_state_idx
        ON deal_governance.deletion_requests (tenant_id, workspace_id, deal_id, state)
      `,
    },
  ],
});
