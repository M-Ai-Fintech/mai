import { defineMigration } from "../migration.ts";

export const platformJobsMigration = defineMigration({
  owner: "platform",
  schema: "platform",
  id: "platform-0004-jobs",
  version: 4,
  forwardNotes:
    "Create tenant-scoped durable jobs and immutable attempt lifecycle records.",
  rollbackNotes:
    "Stop workers and dispatchers while retaining jobs, attempts, and terminal outcomes.",
  statements: [
    {
      schema: "platform",
      sql: `
        CREATE TABLE platform.jobs (
          job_id TEXT PRIMARY KEY,
          operation_id TEXT,
          job_type TEXT NOT NULL,
          schema_version INTEGER NOT NULL CHECK (schema_version > 0),
          tenant_id TEXT NOT NULL,
          workspace_id TEXT,
          deal_id TEXT,
          initiating_actor_id TEXT NOT NULL,
          authority_snapshot_reference TEXT,
          correlation_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          input_version_references JSONB NOT NULL,
          payload JSONB NOT NULL,
          state TEXT NOT NULL CHECK (
            state IN (
              'queued', 'running', 'retry_scheduled', 'succeeded', 'failed',
              'cancelled', 'timed_out', 'dead_lettered'
            )
          ),
          progress INTEGER NOT NULL DEFAULT 0 CHECK (
            progress >= 0 AND progress <= 100
          ),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          lease_owner TEXT,
          lease_expires_at TIMESTAMPTZ,
          timeout_at TIMESTAMPTZ NOT NULL,
          cancellation_requested_at TIMESTAMPTZ,
          result_reference TEXT,
          sanitized_error TEXT CHECK (
            sanitized_error IS NULL OR length(sanitized_error) <= 128
          ),
          next_attempt_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL,
          started_at TIMESTAMPTZ,
          terminal_at TIMESTAMPTZ,
          UNIQUE (tenant_id, job_id),
          CHECK ((lease_owner IS NULL) = (lease_expires_at IS NULL)),
          CHECK (jsonb_typeof(input_version_references) = 'array'),
          CHECK (jsonb_typeof(payload) = 'object')
        )
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_jobs_claim_idx
        ON platform.jobs (state, next_attempt_at, lease_expires_at, created_at)
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_jobs_tenant_state_idx
        ON platform.jobs (tenant_id, state, created_at)
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_jobs_operation_idx
        ON platform.jobs (tenant_id, operation_id)
        WHERE operation_id IS NOT NULL
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE TABLE platform.job_attempts (
          attempt_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          job_id TEXT NOT NULL,
          attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
          record_kind TEXT NOT NULL CHECK (
            record_kind IN ('started', 'completed')
          ),
          worker_identity TEXT NOT NULL,
          lease_owner TEXT NOT NULL,
          lease_expires_at TIMESTAMPTZ NOT NULL,
          started_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          outcome TEXT,
          sanitized_failure TEXT CHECK (
            sanitized_failure IS NULL OR length(sanitized_failure) <= 128
          ),
          retry_decision TEXT,
          correlation_id TEXT NOT NULL,
          UNIQUE (tenant_id, job_id, attempt_number, record_kind),
          FOREIGN KEY (tenant_id, job_id)
            REFERENCES platform.jobs(tenant_id, job_id),
          CHECK (
            (record_kind = 'started' AND completed_at IS NULL AND outcome IS NULL)
            OR
            (record_kind = 'completed' AND completed_at IS NOT NULL AND outcome IS NOT NULL)
          )
        )
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE INDEX platform_job_attempts_history_idx
        ON platform.job_attempts (
          tenant_id, job_id, attempt_number, attempt_record_id
        )
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE FUNCTION platform.reject_job_attempt_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'platform.job_attempts is append-only';
        END;
        $$
      `,
    },
    {
      schema: "platform",
      sql: `
        CREATE TRIGGER platform_job_attempts_no_update
        BEFORE UPDATE OR DELETE ON platform.job_attempts
        FOR EACH ROW EXECUTE FUNCTION platform.reject_job_attempt_mutation()
      `,
    },
  ],
});
