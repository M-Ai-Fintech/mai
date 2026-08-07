import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { RunId } from "./ids.ts";
import type { RunRecord, RuntimeScope } from "./model.ts";
import {
  type RawAttemptRow,
  type RawRunRow,
  toAttempt,
  toRun,
} from "./postgres_rows.ts";
import { insertAttempt } from "./postgres_record_writes.ts";
import { loadRun } from "./postgres_record_reads.ts";
import { runSelect } from "./postgres_sql.ts";
import type { RuntimeRunClaim } from "./repository.ts";

export async function claimCandidate(
  transaction: TransactionHandle,
  now: Date,
): Promise<RawRunRow | undefined> {
  const result = await transaction.query<RawRunRow>(
    `${runSelect()}
     WHERE state = 'queued'
        OR (state = 'retry_scheduled' AND (next_attempt_at IS NULL OR next_attempt_at <= $1))
        OR (state = 'running' AND lease_expires_at <= $1)
     ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
    [now],
  );
  return result.rows[0];
}

export async function claimCandidateRow(
  transaction: TransactionHandle,
  runId: RunId,
  claim: RuntimeRunClaim,
  attemptNumber: number,
): Promise<void> {
  const result = await transaction.query(
    `UPDATE agent_runtime.runs
     SET state = 'running', attempt_count = $2, lease_owner = $3,
         lease_expires_at = $4, next_attempt_at = NULL, updated_at = $5
     WHERE run_id = $1`,
    [runId, attemptNumber, claim.workerId, claim.leaseUntil, claim.now],
  );
  if (result.rowCount === 1) return;
  throw new Error(
    `Run "${runId}" could not be claimed; expected the locked candidate row.`,
  );
}

export async function completeExpiredAttempt(
  transaction: TransactionHandle,
  run: RunRecord,
  completedAt: Date,
): Promise<void> {
  const result = await transaction.query<RawAttemptRow>(
    `SELECT attempt_id AS "attemptId", scope, subject_id AS "subjectId",
       run_id AS "runId", attempt_number AS "attemptNumber",
       record_kind AS "recordKind", worker_id AS "workerId",
       lease_expires_at AS "leaseExpiresAt", started_at AS "startedAt",
       completed_at AS "completedAt", outcome, failure
     FROM agent_runtime.attempts
     WHERE run_id = $1 AND scope = 'run' AND attempt_number = $2
       AND record_kind = 'started'
     ORDER BY attempt_record_id DESC LIMIT 1`,
    [run.runId, run.attemptCount],
  );
  const started = result.rows[0];
  if (started === undefined) return;
  const record = toAttempt(started);
  await insertAttempt(transaction, {
    ...record,
    attemptId: `${record.attemptId}-completed`,
    recordKind: "completed",
    completedAt,
    outcome: "lease_expired",
    failure: "LEASE_EXPIRED",
  });
}

export async function loadRequiredRun(
  transaction: TransactionHandle,
  runId: RunId,
  scope: RuntimeScope,
): Promise<RunRecord> {
  const row = await loadRun(transaction, runId, scope);
  if (row !== undefined) return toRun(row);
  throw new Error(
    `Run "${runId}" disappeared while being claimed; expected a durable runtime row.`,
  );
}
