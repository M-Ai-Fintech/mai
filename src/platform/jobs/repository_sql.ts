import { DurableJob } from "./model.ts";

export function jobInsertSql(): string {
  return `INSERT INTO platform.jobs (
    job_id, operation_id, job_type, schema_version, tenant_id, workspace_id,
    deal_id, initiating_actor_id, authority_snapshot_reference, correlation_id,
    idempotency_key, input_version_references, payload, state, timeout_at,
    created_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'queued',
    $14, $15
  )`;
}

export function jobInsertValues(job: DurableJob): unknown[] {
  return [
    job.jobId,
    job.operationId ?? null,
    job.jobType,
    job.schemaVersion,
    job.tenantId,
    job.workspaceId ?? null,
    job.dealId ?? null,
    job.initiatingActorId,
    job.authoritySnapshotReference ?? null,
    job.correlationId,
    job.idempotencyKey,
    JSON.stringify(job.inputVersionReferences),
    JSON.stringify(job.payload),
    job.timeoutAt,
    job.createdAt,
  ];
}

export function jobClaimSql(): string {
  return `WITH candidate AS (
    SELECT job_id, state AS previous_state,
      attempt_count AS previous_attempt_number,
      lease_owner AS previous_lease_owner,
      lease_expires_at AS previous_lease_expires_at
    FROM platform.jobs
    WHERE (
        state = 'queued'
        OR (state = 'retry_scheduled' AND next_attempt_at <= $1)
        OR (state = 'running' AND lease_expires_at <= $1)
      )
      AND ($5::text[] IS NULL OR job_type = ANY($5::text[]))
    ORDER BY created_at, job_id
    FOR UPDATE SKIP LOCKED LIMIT $4
  )
  UPDATE platform.jobs AS job
  SET state = 'running', attempt_count = attempt_count + 1,
    lease_owner = $2, lease_expires_at = $3,
    started_at = COALESCE(started_at, $1), next_attempt_at = NULL
  FROM candidate WHERE job.job_id = candidate.job_id
  RETURNING ${jobReturningColumns("job", "candidate", "$1", "$2", "$3")}`;
}

export function jobSelectColumns(): string {
  return `SELECT ${jobColumns("job")} FROM platform.jobs AS job`;
}

export function completedAttemptFromStartSql(): string {
  return `INSERT INTO platform.job_attempts (
    tenant_id, job_id, attempt_number, record_kind, worker_identity, lease_owner,
    lease_expires_at, started_at, completed_at, outcome, sanitized_failure,
    retry_decision, correlation_id
  )`;
}

export function attemptSelectColumns(): string {
  return `SELECT attempt_number AS "attemptNumber",
    record_kind AS "recordKind", worker_identity AS "workerIdentity",
    lease_expires_at AS "leaseExpiresAt", started_at AS "startedAt",
    completed_at AS "completedAt", outcome,
    sanitized_failure AS "sanitizedFailure",
    retry_decision AS "retryDecision"`;
}

function jobReturningColumns(
  job: string,
  candidate: string,
  startedAt: string,
  worker: string,
  lease: string,
): string {
  return `${jobColumns(job)},
    ${candidate}.previous_state AS "previousState",
    ${candidate}.previous_attempt_number AS "previousAttemptNumber",
    ${candidate}.previous_lease_owner AS "previousLeaseOwner",
    ${candidate}.previous_lease_expires_at AS "previousLeaseExpiresAt",
    ${job}.attempt_count AS "attemptNumber", ${worker} AS "workerId",
    ${startedAt}::timestamptz AS "attemptStartedAt",
    ${lease}::timestamptz AS "leaseExpiresAt"`;
}

function jobColumns(alias: string): string {
  return `${alias}.job_id AS "jobId", ${alias}.operation_id AS "operationId",
    ${alias}.job_type AS "jobType", ${alias}.schema_version AS "schemaVersion",
    ${alias}.tenant_id AS "tenantId", ${alias}.workspace_id AS "workspaceId",
    ${alias}.deal_id AS "dealId",
    ${alias}.initiating_actor_id AS "initiatingActorId",
    ${alias}.authority_snapshot_reference AS "authoritySnapshotReference",
    ${alias}.correlation_id AS "correlationId",
    ${alias}.idempotency_key AS "idempotencyKey",
    ${alias}.input_version_references AS "inputVersionReferences",
    ${alias}.payload, ${alias}.state, ${alias}.progress,
    ${alias}.attempt_count AS "attemptCount", ${alias}.timeout_at AS "timeoutAt",
    ${alias}.cancellation_requested_at AS "cancellationRequestedAt",
    ${alias}.result_reference AS "resultReference",
    ${alias}.sanitized_error AS "sanitizedError",
    ${alias}.next_attempt_at AS "nextAttemptAt",
    ${alias}.created_at AS "createdAt", ${alias}.started_at AS "startedAt",
    ${alias}.terminal_at AS "terminalAt"`;
}
