import {
  type ClaimedJob,
  type JobFailure,
  type JobFailurePolicy,
  retryableJobFailure,
  terminalJobFailure,
} from "../platform/jobs/v1.ts";
import { DocumentProviderFailure } from "./source_provider.ts";

export interface DocumentRetryPolicy {
  nextAttempt(attemptNumber: number, now: Date): Date | undefined;
}

export class ExponentialDocumentRetryPolicy implements DocumentRetryPolicy {
  constructor(
    private readonly maximumAttempts: number,
    private readonly baseDelayMilliseconds: number,
  ) {
    assertPositive(this.maximumAttempts, "maximum attempts");
    assertPositive(this.baseDelayMilliseconds, "base retry delay");
  }

  nextAttempt(attemptNumber: number, now: Date): Date | undefined {
    if (attemptNumber >= this.maximumAttempts) return undefined;
    const multiplier = 2 ** Math.max(0, attemptNumber - 1);
    return new Date(now.getTime() + this.baseDelayMilliseconds * multiplier);
  }
}

export class DocumentJobFailurePolicy implements JobFailurePolicy {
  constructor(private readonly retries: DocumentRetryPolicy) {}

  failure(job: ClaimedJob, error: unknown, now: Date): JobFailure {
    const code = failureCode(error);
    const retryAt = this.retries.nextAttempt(job.attemptNumber, now);
    return retryAt === undefined
      ? terminalJobFailure(code, now)
      : retryableJobFailure(code, now, retryAt);
  }
}

function failureCode(error: unknown): string {
  if (error instanceof DocumentProviderFailure) {
    return `PROVIDER_${error.failure.code}`;
  }
  if (
    error instanceof Error && error.message.includes("STALE_DOCUMENT_VERSION")
  ) {
    return "STALE_DOCUMENT_VERSION";
  }
  return "DOCUMENT_PROCESSING_FAILED";
}

function assertPositive(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `${label} "${value}" is invalid; expected a positive integer.`,
  );
}
