import type { ClaimedJob, JobClaim, JobFailure } from "./repository.ts";

export function assertJobClaim(claim: JobClaim): void {
  if (!claim.workerId.trim() || claim.workerId.length > 128) {
    throw new Error(
      `Job worker "${claim.workerId}" is invalid; expected 1-128 characters.`,
    );
  }
  if (claim.leaseUntil <= claim.now) {
    throw new Error(
      `Job lease "${claim.leaseUntil.toISOString()}" is invalid; expected after claim time.`,
    );
  }
  if (
    Number.isSafeInteger(claim.limit) && claim.limit > 0 && claim.limit <= 100
  ) return;
  throw new Error(
    `Job claim limit "${claim.limit}" is invalid; expected 1-100.`,
  );
}

export function assertJobFailure(failure: JobFailure): void {
  const hasRetry = failure.nextAttemptAt !== undefined;
  if ((failure.outcome === "retry_scheduled") === hasRetry) return;
  throw new Error(
    `Job failure outcome "${failure.outcome}" retry time "${failure.nextAttemptAt}" is invalid; expected retry time only for retry_scheduled.`,
  );
}

export function assertJobLeaseUpdate(
  rowCount: number | null,
  job: ClaimedJob,
): void {
  if (rowCount === 1) return;
  throw new Error(
    `Job "${job.jobId}" lease owner "${job.workerId}" did not match; expected one running row.`,
  );
}

export function assertReference(reference: string, kind: string): void {
  if (reference.trim() && reference.length <= 255) return;
  throw new Error(
    `Job ${kind} reference "${reference}" is invalid; expected 1-255 characters.`,
  );
}

export function jobLeaseFenceValues(job: ClaimedJob): unknown[] {
  return [
    job.jobId,
    job.tenantId,
    job.workerId,
    job.attemptNumber,
    job.leaseExpiresAt,
  ];
}

export function retryDecision(failure: JobFailure): string {
  return failure.outcome === "retry_scheduled" ? "retry" : "terminal";
}
