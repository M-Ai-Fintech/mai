import { defineMigration } from "../../platform/persistence/migration.ts";

export const agentRuntimeMissionRunMigration = defineMigration({
  owner: "agent_runtime",
  schema: "agent_runtime",
  id: "agent_runtime-0001-mission-run",
  version: 1,
  forwardNotes:
    "Create durable Agent Runtime missions, versioned plans, fenced runs, steps, lineage records, immutable attempts, idempotent commands, and transactional runtime events.",
  rollbackNotes:
    "Stop Agent Runtime consumers and retain all runtime records; rollback is retention-safe and does not drop the append-only evidence tables.",
  statements: [
    {
      schema: "agent_runtime",
      sql: "CREATE SCHEMA IF NOT EXISTS agent_runtime",
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.missions (
          mission_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'ai', 'service')),
          actor_state TEXT NOT NULL CHECK (actor_state IN ('active', 'inactive', 'revoked')),
          objective TEXT NOT NULL CHECK (length(objective) > 0),
          state TEXT NOT NULL CHECK (state IN ('draft', 'active', 'cancelled', 'completed', 'failed')),
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (tenant_id, mission_id)
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.plan_versions (
          plan_id TEXT PRIMARY KEY,
          mission_id TEXT NOT NULL REFERENCES agent_runtime.missions(mission_id),
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'ai', 'service')),
          actor_state TEXT NOT NULL CHECK (actor_state IN ('active', 'inactive', 'revoked')),
          version BIGINT NOT NULL CHECK (version > 0),
          state TEXT NOT NULL CHECK (state IN ('proposed', 'active', 'superseded', 'cancelled')),
          steps JSONB NOT NULL CHECK (jsonb_typeof(steps) = 'array'),
          source_versions JSONB NOT NULL CHECK (jsonb_typeof(source_versions) = 'array'),
          created_at TIMESTAMPTZ NOT NULL,
          UNIQUE (mission_id, version)
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.runs (
          run_id TEXT PRIMARY KEY,
          mission_id TEXT NOT NULL REFERENCES agent_runtime.missions(mission_id),
          plan_id TEXT NOT NULL REFERENCES agent_runtime.plan_versions(plan_id),
          plan_version BIGINT NOT NULL CHECK (plan_version > 0),
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'ai', 'service')),
          actor_state TEXT NOT NULL CHECK (actor_state IN ('active', 'inactive', 'revoked')),
          correlation_id TEXT NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'retry_scheduled', 'succeeded', 'failed', 'cancelled', 'invalidated', 'dead_lettered')),
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          source_versions JSONB NOT NULL CHECK (jsonb_typeof(source_versions) = 'array'),
          model JSONB CHECK (model IS NULL OR jsonb_typeof(model) = 'object'),
          cost_limit NUMERIC,
          cost JSONB NOT NULL CHECK (jsonb_typeof(cost) = 'object'),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          failure TEXT,
          cancellation_requested_at TIMESTAMPTZ,
          next_attempt_at TIMESTAMPTZ,
          lease_owner TEXT,
          lease_expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          CHECK (cost_limit IS NULL OR cost_limit >= 0),
          CHECK ((state = 'running') = (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)),
          UNIQUE (tenant_id, run_id)
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.steps (
          step_id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES agent_runtime.runs(run_id),
          ordinal INTEGER NOT NULL CHECK (ordinal > 0),
          name TEXT NOT NULL CHECK (length(name) > 0),
          kind TEXT NOT NULL CHECK (kind IN ('tool', 'model', 'compute')),
          tool_name TEXT,
          action TEXT,
          resource_kind TEXT,
          resource_id TEXT,
          input JSONB NOT NULL CHECK (jsonb_typeof(input) = 'object'),
          source_versions JSONB NOT NULL CHECK (jsonb_typeof(source_versions) = 'array'),
          state TEXT NOT NULL CHECK (state IN ('queued', 'running', 'retry_scheduled', 'succeeded', 'failed', 'cancelled', 'invalidated')),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          result_id TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE (run_id, ordinal)
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.tool_activities (
          activity_id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES agent_runtime.runs(run_id),
          step_id TEXT NOT NULL REFERENCES agent_runtime.steps(step_id),
          tool_name TEXT NOT NULL,
          action TEXT NOT NULL,
          resource_kind TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          request_digest TEXT NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('requested', 'authorized', 'denied', 'started', 'succeeded', 'failed')),
          authority JSONB CHECK (authority IS NULL OR jsonb_typeof(authority) = 'object'),
          denial_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.results (
          result_id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES agent_runtime.runs(run_id),
          step_id TEXT NOT NULL REFERENCES agent_runtime.steps(step_id),
          kind TEXT NOT NULL CHECK (kind IN ('read', 'proposal', 'reversible_draft', 'calculation')),
          value JSONB NOT NULL CHECK (jsonb_typeof(value) = 'object'),
          lineage JSONB NOT NULL CHECK (jsonb_typeof(lineage) = 'object'),
          cost JSONB NOT NULL CHECK (jsonb_typeof(cost) = 'object'),
          created_at TIMESTAMPTZ NOT NULL
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.artifacts (
          artifact_id TEXT PRIMARY KEY,
          result_id TEXT NOT NULL REFERENCES agent_runtime.results(result_id),
          run_id TEXT NOT NULL REFERENCES agent_runtime.runs(run_id),
          step_id TEXT NOT NULL REFERENCES agent_runtime.steps(step_id),
          artifact_type TEXT NOT NULL,
          content_reference TEXT NOT NULL,
          content_digest TEXT NOT NULL,
          state TEXT NOT NULL CHECK (state IN ('draft', 'proposed', 'stale')),
          source_versions JSONB NOT NULL CHECK (jsonb_typeof(source_versions) = 'array'),
          created_at TIMESTAMPTZ NOT NULL
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.attempts (
          attempt_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          attempt_id TEXT NOT NULL UNIQUE,
          scope TEXT NOT NULL CHECK (scope IN ('run', 'step')),
          subject_id TEXT NOT NULL,
          run_id TEXT NOT NULL REFERENCES agent_runtime.runs(run_id),
          attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
          record_kind TEXT NOT NULL CHECK (record_kind IN ('started', 'completed')),
          worker_id TEXT NOT NULL,
          lease_expires_at TIMESTAMPTZ NOT NULL,
          started_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          outcome TEXT,
          failure TEXT,
          CHECK ((record_kind = 'completed') = (completed_at IS NOT NULL))
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.command_idempotency (
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          actor_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          workspace_key TEXT GENERATED ALWAYS AS (COALESCE(workspace_id, '')) STORED,
          deal_key TEXT GENERATED ALWAYS AS (COALESCE(deal_id, '')) STORED,
          payload_digest CHAR(64) NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
          result_reference TEXT,
          claimed_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          idempotency_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          UNIQUE (tenant_id, workspace_key, deal_key, actor_id, command_type, target_type, target_id, idempotency_key)
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.runtime_events (
          event_sequence BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          event_id TEXT NOT NULL UNIQUE,
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          actor_id TEXT NOT NULL,
          actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'ai', 'service')),
          actor_state TEXT NOT NULL CHECK (actor_state IN ('active', 'inactive', 'revoked')),
          correlation_id TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          aggregate_version BIGINT NOT NULL CHECK (aggregate_version > 0),
          event_type TEXT NOT NULL,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          occurred_at TIMESTAMPTZ NOT NULL
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE INDEX agent_runtime_run_claim_idx
        ON agent_runtime.runs (state, next_attempt_at, lease_expires_at, created_at)
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE INDEX agent_runtime_step_run_idx
        ON agent_runtime.steps (run_id, ordinal)
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE INDEX agent_runtime_attempt_run_idx
        ON agent_runtime.attempts (run_id, attempt_record_id)
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE INDEX agent_runtime_event_scope_idx
        ON agent_runtime.runtime_events (tenant_id, workspace_id, deal_id, event_sequence)
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE FUNCTION agent_runtime.reject_immutable_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Agent Runtime append-only record % is immutable', TG_TABLE_NAME;
        END;
        $$
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TRIGGER agent_runtime_attempts_immutable
        BEFORE UPDATE OR DELETE ON agent_runtime.attempts
        FOR EACH ROW EXECUTE FUNCTION agent_runtime.reject_immutable_mutation()
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        CREATE TRIGGER agent_runtime_events_immutable
        BEFORE UPDATE OR DELETE ON agent_runtime.runtime_events
        FOR EACH ROW EXECUTE FUNCTION agent_runtime.reject_immutable_mutation()
      `,
    },
  ],
});
