import { defineMigration } from "../../platform/persistence/migration.ts";

export const agentRuntimeDealScopeMigration = defineMigration({
  owner: "agent_runtime",
  schema: "agent_runtime",
  id: "agent_runtime-0002-deal-scope",
  version: 2,
  forwardNotes:
    "Quarantine historical incomplete runtime scopes and require every retained Mission, Plan, Run, idempotency record, and event to carry an exact workspace and deal.",
  rollbackNotes:
    "Pause Agent Runtime consumers and retain the quarantine plus all scoped records; do not restore nullable runtime scope because governed deal isolation depends on the NOT NULL constraints.",
  statements: [
    {
      schema: "agent_runtime",
      sql: `
        CREATE TABLE agent_runtime.unscoped_records_quarantine (
          record_type TEXT NOT NULL,
          record_id TEXT NOT NULL,
          payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
          quarantined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (record_type, record_id)
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'mission', mission_id, to_jsonb(missions)
        FROM agent_runtime.missions
        WHERE workspace_id IS NULL OR deal_id IS NULL
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'plan', plan_id,
          to_jsonb(plan_versions)
        FROM agent_runtime.plan_versions
        WHERE workspace_id IS NULL OR deal_id IS NULL
           OR mission_id IN (
             SELECT mission_id
             FROM agent_runtime.missions
             WHERE workspace_id IS NULL OR deal_id IS NULL
           )
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'run', run_id, to_jsonb(runs)
        FROM agent_runtime.runs
        WHERE workspace_id IS NULL OR deal_id IS NULL
           OR mission_id IN (
             SELECT mission_id
             FROM agent_runtime.missions
             WHERE workspace_id IS NULL OR deal_id IS NULL
           )
           OR plan_id IN (
             SELECT plan_id
             FROM agent_runtime.plan_versions
             WHERE workspace_id IS NULL OR deal_id IS NULL
           )
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'step', step_id, to_jsonb(steps)
        FROM agent_runtime.steps
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'tool_activity', activity_id, to_jsonb(tool_activities)
        FROM agent_runtime.tool_activities
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'result', result_id, to_jsonb(results)
        FROM agent_runtime.results
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'artifact', artifact_id, to_jsonb(artifacts)
        FROM agent_runtime.artifacts
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'attempt', attempt_id, to_jsonb(attempts)
        FROM agent_runtime.attempts
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'command_idempotency',
          concat_ws(':', tenant_id, coalesce(workspace_id, ''),
            coalesce(deal_id, ''), actor_id, command_type, target_type,
            target_id, idempotency_key),
          to_jsonb(command_idempotency)
        FROM agent_runtime.command_idempotency
        WHERE workspace_id IS NULL OR deal_id IS NULL
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        INSERT INTO agent_runtime.unscoped_records_quarantine
          (record_type, record_id, payload)
        SELECT 'runtime_event', event_id, to_jsonb(runtime_events)
        FROM agent_runtime.runtime_events
        WHERE workspace_id IS NULL OR deal_id IS NULL
        ON CONFLICT (record_type, record_id) DO NOTHING
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.artifacts
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.results
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.tool_activities
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.steps
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.attempts
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.runs
        WHERE run_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'run'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.plan_versions
        WHERE plan_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'plan'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.missions
        WHERE mission_id IN (
          SELECT record_id
          FROM agent_runtime.unscoped_records_quarantine
          WHERE record_type = 'mission'
        )
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.command_idempotency
        WHERE workspace_id IS NULL OR deal_id IS NULL
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        DELETE FROM agent_runtime.runtime_events
        WHERE workspace_id IS NULL OR deal_id IS NULL
      `,
    },
    {
      schema: "agent_runtime",
      sql: `
        ALTER TABLE agent_runtime.missions
          ALTER COLUMN workspace_id SET NOT NULL,
          ALTER COLUMN deal_id SET NOT NULL;
        ALTER TABLE agent_runtime.plan_versions
          ALTER COLUMN workspace_id SET NOT NULL,
          ALTER COLUMN deal_id SET NOT NULL;
        ALTER TABLE agent_runtime.runs
          ALTER COLUMN workspace_id SET NOT NULL,
          ALTER COLUMN deal_id SET NOT NULL;
        ALTER TABLE agent_runtime.command_idempotency
          ALTER COLUMN workspace_id SET NOT NULL,
          ALTER COLUMN deal_id SET NOT NULL;
        ALTER TABLE agent_runtime.runtime_events
          ALTER COLUMN workspace_id SET NOT NULL,
          ALTER COLUMN deal_id SET NOT NULL;
      `,
    },
  ],
});
