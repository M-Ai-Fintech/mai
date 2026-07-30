import { TransactionHandle } from "../persistence/transaction.ts";
import { completedAttemptFromStartSql } from "./repository_sql.ts";
import type { ClaimedJob } from "./repository.ts";

export interface ClaimedJobAttemptRow {
  readonly tenantId: ClaimedJob["tenantId"];
  readonly jobId: ClaimedJob["jobId"];
  readonly previousState: "queued" | "retry_scheduled" | "running";
  readonly previousAttemptNumber: number;
  readonly attemptNumber: number;
  readonly workerId: string;
  readonly attemptStartedAt: Date;
  readonly leaseExpiresAt: Date;
  readonly correlationId: ClaimedJob["correlationId"];
}

export async function appendExpiredAttempt(
  transaction: TransactionHandle,
  row: ClaimedJobAttemptRow,
  completedAt: Date,
): Promise<void> {
  if (row.previousState !== "running") return;
  await transaction.query(
    `${completedAttemptFromStartSql()}
     SELECT tenant_id, job_id, attempt_number, 'completed', worker_identity, lease_owner,
       lease_expires_at, started_at, $4, 'lease_expired', 'LEASE_EXPIRED',
       'recovered', correlation_id
     FROM platform.job_attempts
     WHERE tenant_id = $1 AND job_id = $2 AND attempt_number = $3
       AND record_kind = 'started'`,
    [row.tenantId, row.jobId, row.previousAttemptNumber, completedAt],
  );
}

export function appendStartedAttempt(
  transaction: TransactionHandle,
  row: ClaimedJobAttemptRow,
): Promise<unknown> {
  return transaction.query(
    `INSERT INTO platform.job_attempts (
       tenant_id, job_id, attempt_number, record_kind, worker_identity, lease_owner,
       lease_expires_at, started_at, correlation_id
     ) VALUES ($1, $2, $3, 'started', $4, $4, $5, $6, $7)`,
    [
      row.tenantId,
      row.jobId,
      row.attemptNumber,
      row.workerId,
      row.leaseExpiresAt,
      row.attemptStartedAt,
      row.correlationId,
    ],
  );
}

export function appendCompletedAttempt(
  transaction: TransactionHandle,
  job: ClaimedJob,
  completedAt: Date,
  outcome: string,
  failure: string | null,
  decision: string,
): Promise<unknown> {
  return transaction.query(
    `${completedAttemptFromStartSql()}
     VALUES ($1, $2, $3, 'completed', $4, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      job.tenantId,
      job.jobId,
      job.attemptNumber,
      job.workerId,
      job.leaseExpiresAt,
      job.attemptStartedAt,
      completedAt,
      outcome,
      failure,
      decision,
      job.correlationId,
    ],
  );
}
