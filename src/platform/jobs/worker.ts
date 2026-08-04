import { Clock } from "../persistence/idempotency.ts";
import { TransactionHandle } from "../persistence/transaction.ts";
import {
  ClaimedJob,
  JobClaim,
  JobFailure,
  SanitizedJobFailure,
  sanitizedJobFailure,
} from "./repository.ts";

export interface JobWorkerStore {
  claim(
    transaction: TransactionHandle,
    claim: JobClaim,
  ): Promise<ClaimedJob[]>;
  cancellationRequested(
    transaction: TransactionHandle,
    job: ClaimedJob,
    now: Date,
  ): Promise<boolean>;
  assertActiveLease(
    transaction: TransactionHandle,
    job: ClaimedJob,
    now: Date,
  ): Promise<void>;
  extendLease(
    transaction: TransactionHandle,
    job: ClaimedJob,
    now: Date,
    leaseUntil: Date,
  ): Promise<ClaimedJob>;
  cancel(
    transaction: TransactionHandle,
    job: ClaimedJob,
    completedAt: Date,
  ): Promise<void>;
  timeout(
    transaction: TransactionHandle,
    job: ClaimedJob,
    completedAt: Date,
  ): Promise<void>;
  complete(
    transaction: TransactionHandle,
    job: ClaimedJob,
    resultReference: string,
    completedAt: Date,
  ): Promise<void>;
  fail(
    transaction: TransactionHandle,
    job: ClaimedJob,
    failure: JobFailure,
  ): Promise<void>;
}

export interface JobExecutionContext {
  readonly deadline: Date;
  currentLeaseExpiry(): Date;
  cancellationRequested(): Promise<boolean>;
  heartbeat(): Promise<Date>;
  beforeExternalEffect(): Promise<void>;
}

export interface JobExecutor {
  execute(
    job: ClaimedJob,
    context: JobExecutionContext,
  ): Promise<{ readonly resultReference: string }>;
}

export interface JobInputVersionChecker {
  recheck(job: ClaimedJob): Promise<boolean>;
}

export interface JobFailurePolicy {
  failure(job: ClaimedJob, error: unknown, now: Date): JobFailure;
}

export interface JobAuditEvent {
  readonly tenantId: ClaimedJob["tenantId"];
  readonly jobId: ClaimedJob["jobId"];
  readonly eventType: string;
  readonly correlationId: ClaimedJob["correlationId"];
  readonly occurredAt: Date;
}

export interface JobAuditAppendPort {
  append(
    transaction: TransactionHandle,
    event: JobAuditEvent,
  ): Promise<void>;
}

export interface JobWorkerTransactions {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export interface JobWorkerDependencies {
  readonly transactions: JobWorkerTransactions;
  readonly store: JobWorkerStore;
  readonly executor: JobExecutor;
  readonly versions: JobInputVersionChecker;
  readonly clock: Clock;
  readonly failurePolicy: JobFailurePolicy;
  readonly audit: JobAuditAppendPort;
  readonly allowedJobTypes?: readonly string[];
}

export type JobWorkerOutcome =
  | { readonly status: "idle" }
  | {
    readonly status:
      | "succeeded"
      | "failed"
      | "retry_scheduled"
      | "cancelled"
      | "timed_out"
      | "dead_lettered";
    readonly jobId: string;
  };

export class JobWorker {
  constructor(private readonly dependencies: JobWorkerDependencies) {}

  /**
   * Claims and executes at most one job through typed ports.
   *
   * @example await worker.executeOne("worker_a", 60_000)
   */
  async executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<JobWorkerOutcome> {
    const job = await this.claimOne(workerId, leaseMilliseconds);
    if (job === undefined) return { status: "idle" };
    const early = await this.preExecutionOutcome(job);
    if (early !== undefined) return early;
    return await this.executeClaimedJob(job, leaseMilliseconds);
  }

  private claimOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<ClaimedJob | undefined> {
    assertWorkerLease(leaseMilliseconds);
    const now = this.dependencies.clock.now();
    return this.dependencies.transactions.run(async (transaction) => {
      const jobs = await this.dependencies.store.claim(transaction, {
        workerId,
        now,
        leaseUntil: new Date(now.getTime() + leaseMilliseconds),
        limit: 1,
        ...(this.dependencies.allowedJobTypes === undefined
          ? {}
          : { allowedJobTypes: this.dependencies.allowedJobTypes }),
      });
      return jobs[0];
    });
  }

  private async preExecutionOutcome(
    job: ClaimedJob,
  ): Promise<JobWorkerOutcome | undefined> {
    const now = this.dependencies.clock.now();
    await this.assertActiveLease(job, now);
    if (now >= job.timeoutAt) return await this.recordTimeout(job, now);
    if (await this.isCancellationRequested(job)) {
      return await this.recordCancellation(job, now);
    }
    if (await this.dependencies.versions.recheck(job)) return;
    return await this.recordStaleInput(job, now);
  }

  private async executeClaimedJob(
    job: ClaimedJob,
    leaseMilliseconds: number,
  ): Promise<JobWorkerOutcome> {
    let activeJob = job;
    const context = executionContext({
      job: () => activeJob,
      cancellationRequested: () => this.isCancellationRequested(activeJob),
      heartbeat: async () => {
        activeJob = await this.renewLease(activeJob, leaseMilliseconds);
        return activeJob.leaseExpiresAt;
      },
      beforeExternalEffect: () =>
        this.assertActiveLease(activeJob, this.dependencies.clock.now()),
    });
    try {
      const result = await this.dependencies.executor.execute(
        job,
        context,
      );
      return await this.recordSuccess(activeJob, result.resultReference);
    } catch (error) {
      return await this.recordExecutorFailure(activeJob, error);
    }
  }

  private isCancellationRequested(job: ClaimedJob): Promise<boolean> {
    const now = this.dependencies.clock.now();
    return this.dependencies.transactions.run((transaction) =>
      this.dependencies.store.cancellationRequested(transaction, job, now)
    );
  }

  private assertActiveLease(job: ClaimedJob, now: Date): Promise<void> {
    return this.dependencies.transactions.run((transaction) =>
      this.dependencies.store.assertActiveLease(transaction, job, now)
    );
  }

  private renewLease(
    job: ClaimedJob,
    leaseMilliseconds: number,
  ): Promise<ClaimedJob> {
    const now = this.dependencies.clock.now();
    const leaseUntil = new Date(now.getTime() + leaseMilliseconds);
    return this.dependencies.transactions.run((transaction) =>
      this.dependencies.store.extendLease(transaction, job, now, leaseUntil)
    );
  }

  private recordCancellation(
    job: ClaimedJob,
    now: Date,
  ): Promise<JobWorkerOutcome> {
    return this.recordTransition(
      job,
      "cancelled",
      now,
      (transaction) => this.dependencies.store.cancel(transaction, job, now),
    );
  }

  private recordTimeout(
    job: ClaimedJob,
    now: Date,
  ): Promise<JobWorkerOutcome> {
    return this.recordTransition(
      job,
      "timed_out",
      now,
      (transaction) => this.dependencies.store.timeout(transaction, job, now),
    );
  }

  private recordStaleInput(
    job: ClaimedJob,
    now: Date,
  ): Promise<JobWorkerOutcome> {
    const failure: JobFailure = {
      outcome: "failed",
      failure: sanitizedJobFailure("INPUT_VERSION_STALE"),
      completedAt: now,
    };
    return this.recordFailure(job, failure);
  }

  private recordSuccess(
    job: ClaimedJob,
    resultReference: string,
  ): Promise<JobWorkerOutcome> {
    const now = this.dependencies.clock.now();
    if (now >= job.timeoutAt) return this.recordTimeout(job, now);
    return this.recordTransition(
      job,
      "succeeded",
      now,
      (transaction) =>
        this.dependencies.store.complete(
          transaction,
          job,
          resultReference,
          now,
        ),
    );
  }

  private recordExecutorFailure(
    job: ClaimedJob,
    error: unknown,
  ): Promise<JobWorkerOutcome> {
    const now = this.dependencies.clock.now();
    if (now >= job.timeoutAt) return this.recordTimeout(job, now);
    const failure = this.dependencies.failurePolicy.failure(
      job,
      error,
      now,
    );
    return this.recordFailure(job, failure);
  }

  private recordFailure(
    job: ClaimedJob,
    failure: JobFailure,
  ): Promise<JobWorkerOutcome> {
    return this.recordTransition(
      job,
      failure.outcome,
      failure.completedAt,
      (transaction) => this.dependencies.store.fail(transaction, job, failure),
    );
  }

  private recordTransition(
    job: ClaimedJob,
    status: Exclude<JobWorkerOutcome["status"], "idle">,
    occurredAt: Date,
    persist: (transaction: TransactionHandle) => Promise<void>,
  ): Promise<JobWorkerOutcome> {
    return this.dependencies.transactions.run(async (transaction) => {
      await persist(transaction);
      await this.dependencies.audit.append(transaction, {
        tenantId: job.tenantId,
        jobId: job.jobId,
        eventType: `job.${status}`,
        correlationId: job.correlationId,
        occurredAt,
      });
      return { status, jobId: job.jobId };
    });
  }
}

function executionContext(dependencies: {
  readonly job: () => ClaimedJob;
  readonly cancellationRequested: () => Promise<boolean>;
  readonly heartbeat: () => Promise<Date>;
  readonly beforeExternalEffect: () => Promise<void>;
}): JobExecutionContext {
  return {
    deadline: dependencies.job().timeoutAt,
    currentLeaseExpiry: () => dependencies.job().leaseExpiresAt,
    cancellationRequested: dependencies.cancellationRequested,
    heartbeat: dependencies.heartbeat,
    beforeExternalEffect: dependencies.beforeExternalEffect,
  };
}

function assertWorkerLease(milliseconds: number): void {
  if (Number.isSafeInteger(milliseconds) && milliseconds > 0) return;
  throw new Error(
    `Worker lease "${milliseconds}" is invalid; expected positive integer milliseconds.`,
  );
}

/**
 * Creates an exhausted retry decision with a sanitized terminal code.
 *
 * @example terminalJobFailure("EXECUTOR_EXHAUSTED", now)
 */
export function terminalJobFailure(
  code: string,
  now: Date,
): JobFailure {
  return {
    outcome: "dead_lettered",
    failure: sanitizedJobFailure(code),
    completedAt: now,
  };
}

/**
 * Creates a retry decision with an explicit next-attempt time.
 *
 * @example retryableJobFailure("EXECUTOR_RETRY", now, retryAt)
 */
export function retryableJobFailure(
  code: string,
  now: Date,
  nextAttemptAt: Date,
): JobFailure {
  return {
    outcome: "retry_scheduled",
    failure: sanitizedJobFailure(code),
    completedAt: now,
    nextAttemptAt,
  };
}

export type { SanitizedJobFailure };
