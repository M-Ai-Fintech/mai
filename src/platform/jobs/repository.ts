import { JobId, TenantId } from "../../shared/contracts/identifiers.ts";
import { TransactionHandle } from "../persistence/transaction.ts";
import {
  assertJobDefinition,
  assertJobTransition,
  DurableJob,
  JobState,
} from "./model.ts";
import {
  attemptSelectColumns,
  jobClaimSql,
  jobInsertSql,
  jobInsertValues,
  jobSelectColumns,
} from "./repository_sql.ts";
import {
  appendCompletedAttempt,
  appendExpiredAttempt,
  appendStartedAttempt,
  type ClaimedJobAttemptRow,
} from "./repository_attempts.ts";
import {
  assertJobClaim,
  assertJobFailure,
  assertJobLeaseUpdate,
  assertReference,
  jobLeaseFenceValues,
  retryDecision,
} from "./repository_validation.ts";

declare const jobFailureBrand: unique symbol;
export type SanitizedJobFailure = string & {
  readonly [jobFailureBrand]: "SanitizedJobFailure";
};

export interface JobClaim {
  readonly workerId: string;
  readonly now: Date;
  readonly leaseUntil: Date;
  readonly limit: number;
  readonly allowedJobTypes?: readonly string[];
}

export interface ClaimedJob extends DurableJob {
  readonly state: "running";
  readonly attemptNumber: number;
  readonly workerId: string;
  readonly attemptStartedAt: Date;
  readonly leaseExpiresAt: Date;
  readonly progress: number;
}

export interface StoredJob extends DurableJob {
  readonly state: JobState;
  readonly progress: number;
  readonly attemptCount: number;
  readonly operationId: DurableJob["operationId"];
  readonly cancellationRequestedAt?: Date;
  readonly resultReference?: string;
  readonly sanitizedError?: string;
  readonly nextAttemptAt?: Date;
  readonly startedAt?: Date;
  readonly terminalAt?: Date;
}

export interface JobAttemptRecord {
  readonly attemptNumber: number;
  readonly recordKind: "started" | "completed";
  readonly workerIdentity: string;
  readonly leaseExpiresAt: Date;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly outcome?: string;
  readonly sanitizedFailure?: string;
  readonly retryDecision?: string;
}

interface JobAttemptRow extends
  Omit<
    JobAttemptRecord,
    "completedAt" | "outcome" | "sanitizedFailure" | "retryDecision"
  > {
  readonly completedAt: Date | null;
  readonly outcome: string | null;
  readonly sanitizedFailure: string | null;
  readonly retryDecision: string | null;
}

export interface JobFailure {
  readonly outcome: "retry_scheduled" | "failed" | "dead_lettered";
  readonly failure: SanitizedJobFailure;
  readonly completedAt: Date;
  readonly nextAttemptAt?: Date;
}

interface ClaimedJobRow extends StoredJob, ClaimedJobAttemptRow {}

export class JobRepository {
  /**
   * Enqueues one durable job through the caller's transaction.
   *
   * @example await repository.enqueue(transaction, job)
   */
  async enqueue(
    transaction: TransactionHandle,
    job: DurableJob,
  ): Promise<void> {
    assertJobDefinition(job);
    await transaction.query(jobInsertSql(), jobInsertValues(job));
  }

  /**
   * Claims bounded work using skip-locked leases and appends attempt evidence.
   *
   * @example await repository.claim(transaction, claim)
   */
  async claim(
    transaction: TransactionHandle,
    claim: JobClaim,
  ): Promise<ClaimedJob[]> {
    assertJobClaim(claim);
    const result = await transaction.query<ClaimedJobRow>(
      jobClaimSql(),
      [
        claim.now,
        claim.workerId,
        claim.leaseUntil,
        claim.limit,
        claim.allowedJobTypes === undefined ? null : [...claim.allowedJobTypes],
      ],
    );
    const claimed: ClaimedJob[] = [];
    for (const row of result.rows) {
      await appendExpiredAttempt(transaction, row, claim.now);
      await appendStartedAttempt(transaction, row);
      claimed.push(toClaimedJob(row));
    }
    return claimed;
  }

  /**
   * Loads one tenant-scoped job without granting authorization.
   *
   * @example await repository.find(transaction, tenantId, jobId)
   */
  async find(
    transaction: TransactionHandle,
    tenantId: TenantId,
    jobId: JobId,
  ): Promise<StoredJob | undefined> {
    const result = await transaction.query<StoredJob>(
      `${jobSelectColumns()} WHERE tenant_id = $1 AND job_id = $2`,
      [tenantId, jobId],
    );
    return result.rows[0];
  }

  /**
   * Reads immutable lifecycle records in append order.
   *
   * @example await repository.listAttemptRecords(transaction, tenantId, jobId)
   */
  async listAttemptRecords(
    transaction: TransactionHandle,
    tenantId: TenantId,
    jobId: JobId,
  ): Promise<JobAttemptRecord[]> {
    const result = await transaction.query<JobAttemptRow>(
      `${attemptSelectColumns()}
       FROM platform.job_attempts
       WHERE tenant_id = $1 AND job_id = $2 ORDER BY attempt_record_id`,
      [tenantId, jobId],
    );
    return result.rows.map(toAttemptRecord);
  }

  /**
   * Persists a cancellation request without assuming worker observation.
   *
   * @example await repository.requestCancellation(transaction, tenant, job, now)
   */
  async requestCancellation(
    transaction: TransactionHandle,
    tenantId: TenantId,
    jobId: JobId,
    requestedAt: Date,
  ): Promise<void> {
    const result = await transaction.query(
      `UPDATE platform.jobs
       SET cancellation_requested_at = COALESCE(cancellation_requested_at, $3)
       WHERE tenant_id = $1 AND job_id = $2
         AND state IN ('queued', 'running', 'retry_scheduled')`,
      [tenantId, jobId, requestedAt],
    );
    if (result.rowCount === 1) return;
    throw new Error(
      `Job "${jobId}" cancellation was not recorded; expected one non-terminal tenant-scoped job.`,
    );
  }

  /**
   * Observes cancellation immediately before a worker side effect.
   *
   * @example await repository.cancellationRequested(transaction, job, now)
   */
  async cancellationRequested(
    transaction: TransactionHandle,
    job: ClaimedJob,
    now: Date,
  ): Promise<boolean> {
    const result = await transaction.query<{ requested: boolean }>(
      `SELECT cancellation_requested_at IS NOT NULL AS requested
       FROM platform.jobs
       WHERE job_id = $1 AND tenant_id = $2 AND state = 'running'
         AND lease_owner = $3 AND attempt_count = $4
         AND lease_expires_at = $5 AND lease_expires_at > $6`,
      [...jobLeaseFenceValues(job), now],
    );
    const row = result.rows[0];
    if (row !== undefined) return row.requested;
    assertJobLeaseUpdate(result.rowCount, job);
    return false;
  }

  /**
   * Verifies the claimed lease before a worker reaches an external side effect.
   *
   * @example await repository.assertActiveLease(transaction, job, now)
   */
  async assertActiveLease(
    transaction: TransactionHandle,
    job: ClaimedJob,
    now: Date,
  ): Promise<void> {
    const result = await transaction.query(
      `SELECT 1 FROM platform.jobs
       WHERE job_id = $1 AND tenant_id = $2 AND state = 'running'
         AND lease_owner = $3 AND attempt_count = $4
         AND lease_expires_at = $5 AND lease_expires_at > $6`,
      [...jobLeaseFenceValues(job), now],
    );
    assertJobLeaseUpdate(result.rowCount, job);
  }

  /**
   * Extends only the active worker's lease.
   *
   * @example await repository.extendLease(transaction, job, now, leaseUntil)
   */
  async extendLease(
    transaction: TransactionHandle,
    job: ClaimedJob,
    now: Date,
    leaseUntil: Date,
  ): Promise<ClaimedJob> {
    if (now >= job.leaseExpiresAt || leaseUntil <= job.leaseExpiresAt) {
      throw new Error(
        `Job "${job.jobId}" lease extension "${leaseUntil.toISOString()}" at "${now.toISOString()}" is invalid; expected an active lease and future expiry.`,
      );
    }
    const result = await transaction.query(
      `UPDATE platform.jobs SET lease_expires_at = $7
       WHERE job_id = $1 AND tenant_id = $2 AND state = 'running'
         AND lease_owner = $3 AND attempt_count = $4
         AND lease_expires_at = $5 AND lease_expires_at > $6`,
      [...jobLeaseFenceValues(job), now, leaseUntil],
    );
    assertJobLeaseUpdate(result.rowCount, job);
    return { ...job, leaseExpiresAt: leaseUntil };
  }

  /**
   * Completes a running job with an opaque result reference.
   *
   * @example await repository.complete(transaction, job, "result_1", now)
   */
  async complete(
    transaction: TransactionHandle,
    job: ClaimedJob,
    resultReference: string,
    completedAt: Date,
  ): Promise<void> {
    assertReference(resultReference, "result");
    assertJobTransition("running", "succeeded");
    await updateTerminalJob(
      transaction,
      job,
      "succeeded",
      completedAt,
      resultReference,
    );
    await appendCompletedAttempt(
      transaction,
      job,
      completedAt,
      "succeeded",
      null,
      "terminal",
    );
  }

  /**
   * Persists worker-observed cancellation as a terminal attempt outcome.
   *
   * @example await repository.cancel(transaction, job, now)
   */
  async cancel(
    transaction: TransactionHandle,
    job: ClaimedJob,
    completedAt: Date,
  ): Promise<void> {
    await terminateWithoutResult(transaction, job, "cancelled", completedAt);
  }

  /**
   * Persists timeout only after the job's durable deadline.
   *
   * @example await repository.timeout(transaction, job, now)
   */
  async timeout(
    transaction: TransactionHandle,
    job: ClaimedJob,
    completedAt: Date,
  ): Promise<void> {
    if (completedAt < job.timeoutAt) {
      throw new Error(
        `Job "${job.jobId}" timeout at "${completedAt.toISOString()}" is early; expected on or after "${job.timeoutAt.toISOString()}".`,
      );
    }
    await terminateWithoutResult(transaction, job, "timed_out", completedAt);
  }

  /**
   * Records retry, failure, or dead-letter completion append-only.
   *
   * @example await repository.fail(transaction, job, failure)
   */
  async fail(
    transaction: TransactionHandle,
    job: ClaimedJob,
    failure: JobFailure,
  ): Promise<void> {
    assertJobFailure(failure);
    assertJobTransition("running", failure.outcome);
    await updateFailedJob(transaction, job, failure);
    await appendCompletedAttempt(
      transaction,
      job,
      failure.completedAt,
      failure.outcome,
      failure.failure,
      retryDecision(failure),
    );
  }
}

/**
 * Creates a storage-safe job failure code without raw error text.
 * @example sanitizedJobFailure("EXECUTOR_FAILED")
 */
export function sanitizedJobFailure(code: string): SanitizedJobFailure {
  if (/^[A-Z][A-Z0-9_:-]{0,127}$/.test(code)) {
    return code as SanitizedJobFailure;
  }
  throw new Error(
    `Job failure "${code}" is unsafe; expected uppercase code characters only.`,
  );
}

async function updateFailedJob(
  transaction: TransactionHandle,
  job: ClaimedJob,
  failure: JobFailure,
): Promise<void> {
  const terminalAt = failure.outcome === "retry_scheduled"
    ? null
    : failure.completedAt;
  const result = await transaction.query(
    `UPDATE platform.jobs SET state = $6, sanitized_error = $7,
       next_attempt_at = $8, terminal_at = $9,
       lease_owner = NULL, lease_expires_at = NULL
     WHERE job_id = $1 AND tenant_id = $2 AND state = 'running'
       AND lease_owner = $3 AND attempt_count = $4
       AND lease_expires_at = $5 AND lease_expires_at > $10`,
    [
      ...jobLeaseFenceValues(job),
      failure.outcome,
      failure.failure,
      failure.nextAttemptAt ?? null,
      terminalAt,
      failure.completedAt,
    ],
  );
  assertJobLeaseUpdate(result.rowCount, job);
}

async function terminateWithoutResult(
  transaction: TransactionHandle,
  job: ClaimedJob,
  state: "cancelled" | "timed_out",
  completedAt: Date,
): Promise<void> {
  assertJobTransition("running", state);
  await updateTerminalJob(transaction, job, state, completedAt);
  await appendCompletedAttempt(
    transaction,
    job,
    completedAt,
    state,
    null,
    "terminal",
  );
}

async function updateTerminalJob(
  transaction: TransactionHandle,
  job: ClaimedJob,
  state: "succeeded" | "cancelled" | "timed_out",
  completedAt: Date,
  resultReference?: string,
): Promise<void> {
  const result = await transaction.query(
    `UPDATE platform.jobs
     SET state = $6, progress = CASE WHEN $6 = 'succeeded' THEN 100 ELSE progress END,
       result_reference = $7, terminal_at = $8,
       lease_owner = NULL, lease_expires_at = NULL
     WHERE job_id = $1 AND tenant_id = $2 AND state = 'running'
       AND lease_owner = $3 AND attempt_count = $4
       AND lease_expires_at = $5 AND lease_expires_at > $9`,
    [
      ...jobLeaseFenceValues(job),
      state,
      resultReference ?? null,
      completedAt,
      completedAt,
    ],
  );
  assertJobLeaseUpdate(result.rowCount, job);
}

function toClaimedJob(row: ClaimedJobRow): ClaimedJob {
  return {
    ...row,
    state: "running",
    operationId: row.operationId ?? undefined,
    workspaceId: row.workspaceId ?? undefined,
    dealId: row.dealId ?? undefined,
    authoritySnapshotReference: row.authoritySnapshotReference ?? undefined,
  };
}

function toAttemptRecord(row: JobAttemptRow): JobAttemptRecord {
  return {
    ...row,
    completedAt: row.completedAt ?? undefined,
    outcome: row.outcome ?? undefined,
    sanitizedFailure: row.sanitizedFailure ?? undefined,
    retryDecision: row.retryDecision ?? undefined,
  };
}
