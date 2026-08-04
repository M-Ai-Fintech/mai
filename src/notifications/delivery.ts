import type { ClaimedJob, JobFailure } from "../platform/jobs/repository.ts";
import { sanitizedJobFailure } from "../platform/jobs/repository.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { ActorId, JobId } from "../shared/contracts/identifiers.ts";
import {
  type NotificationChannel,
  type NotificationClock,
  type NotificationProjection,
  type NotificationScope,
} from "./model.ts";
import type {
  AuthorizedNotificationScope,
  NotificationReadProjection,
} from "./projection.ts";
import type {
  NotificationProjectionLookup,
  NotificationRepository,
} from "./repository.ts";
import {
  type DeliveryRetryPolicy,
  missingReceipt,
  type ParsedDeliveryJob,
  parseDeliveryJob,
  receipt,
  sanitizedFailure,
  stateUpdate,
} from "./retry.ts";
import { projectNotification } from "./projection.ts";

export interface NotificationDeliveryClaim {
  readonly workerId: string;
  readonly now: Date;
  readonly leaseUntil: Date;
  readonly limit: number;
}

export type ClaimedNotificationDeliveryJob = Omit<ClaimedJob, "jobType"> & {
  readonly jobType: "notification.delivery";
};

export interface NotificationDeliveryJobStore {
  claimNotificationDelivery(
    transaction: TransactionHandle,
    claim: NotificationDeliveryClaim,
  ): Promise<readonly ClaimedNotificationDeliveryJob[]>;
  assertActiveLease(
    transaction: TransactionHandle,
    job: ClaimedNotificationDeliveryJob,
    now: Date,
  ): Promise<void>;
  complete(
    transaction: TransactionHandle,
    job: ClaimedNotificationDeliveryJob,
    resultReference: string,
    completedAt: Date,
  ): Promise<void>;
  fail(
    transaction: TransactionHandle,
    job: ClaimedNotificationDeliveryJob,
    failure: JobFailure,
  ): Promise<void>;
}

/** Compatibility name for callers that used the original notification port. */
export type NotificationJobPort = NotificationDeliveryJobStore;

export interface NotificationDeliveryRequest {
  readonly channel: NotificationChannel;
  readonly notification: NotificationReadProjection;
  readonly recipientId: ActorId;
  readonly jobId: JobId;
  readonly attemptNumber: number;
}

export type NotificationAdapterResult =
  | { readonly status: "succeeded"; readonly resultReference: string }
  | { readonly status: "retryable"; readonly failureCode: string }
  | { readonly status: "terminal"; readonly failureCode: string }
  | { readonly status: "disabled"; readonly failureCode: "CHANNEL_DISABLED" };

export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  readonly enabled: boolean;
  deliver(
    request: NotificationDeliveryRequest,
  ): Promise<NotificationAdapterResult>;
}

export interface NotificationDeliveryAuthorizer {
  authorize(
    scope: NotificationScope,
    recipientId: ActorId,
    job: ClaimedNotificationDeliveryJob,
  ): Promise<AuthorizedNotificationScope>;
}

export interface NotificationDeliveryDependencies {
  readonly transactions: {
    run<TResult>(
      callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
    ): Promise<TResult>;
  };
  readonly jobStore?: NotificationDeliveryJobStore;
  readonly repository: NotificationRepository;
  readonly authorizer: NotificationDeliveryAuthorizer;
  readonly adapters: ReadonlyMap<
    NotificationChannel,
    NotificationChannelAdapter
  >;
  readonly retryPolicy: DeliveryRetryPolicy;
  readonly clock: NotificationClock;
}

export type NotificationDeliveryResult =
  | { readonly status: "idle" }
  | { readonly status: "succeeded"; readonly jobId: JobId }
  | { readonly status: "retry_scheduled"; readonly jobId: JobId }
  | { readonly status: "expired"; readonly jobId: JobId }
  | { readonly status: "dead_lettered"; readonly jobId: JobId };

export class DisabledNotificationChannelAdapter
  implements NotificationChannelAdapter {
  readonly enabled = false;

  constructor(readonly channel: NotificationChannel) {}

  deliver(): Promise<NotificationAdapterResult> {
    return Promise.resolve({
      status: "disabled",
      failureCode: "CHANNEL_DISABLED",
    });
  }
}

export class NotificationDeliveryClaimUnavailableError extends Error {
  readonly code = "NOTIFICATION_DELIVERY_CLAIM_UNAVAILABLE";

  constructor() {
    super(
      "Notification delivery execution is unavailable; expected a Notifications-owned claimNotificationDelivery port.",
    );
    this.name = "NotificationDeliveryClaimUnavailableError";
  }
}

export class NotificationDeliveryWorker {
  constructor(
    private readonly dependencies: NotificationDeliveryDependencies,
  ) {}

  /**
   * Claims and processes at most one notification job with lease fencing.
   *
   * @example await worker.runOne("notification-worker-a", 30_000)
   */
  async runOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<NotificationDeliveryResult> {
    const now = this.dependencies.clock.now();
    const job = await this.claimOne(workerId, leaseMilliseconds, now);
    if (job === undefined) return { status: "idle" };
    return await this.processClaimedJob(job);
  }

  private async claimOne(
    workerId: string,
    leaseMilliseconds: number,
    now: Date,
  ): Promise<ClaimedNotificationDeliveryJob | undefined> {
    const jobStore = this.dependencies.jobStore;
    if (jobStore === undefined) {
      throw new NotificationDeliveryClaimUnavailableError();
    }
    const claim: NotificationDeliveryClaim = {
      workerId,
      now,
      leaseUntil: new Date(now.getTime() + leaseMilliseconds),
      limit: 1,
    };
    return await this.dependencies.transactions.run(async (transaction) => {
      const jobs = await jobStore.claimNotificationDelivery(transaction, claim);
      return jobs[0];
    });
  }

  private async processClaimedJob(
    job: ClaimedNotificationDeliveryJob,
  ): Promise<NotificationDeliveryResult> {
    const input = parseDeliveryJob(job);
    const access = await this.dependencies.authorizer.authorize(
      input.scope,
      input.recipientId,
      job,
    );
    const projection = await this.loadProjection(input, access);
    if (projection === undefined) {
      return await this.recordMissingProjection(job, input, access);
    }
    const now = this.dependencies.clock.now();
    if (projection.expiresAt !== undefined && now >= projection.expiresAt) {
      return await this.recordExpired(job, projection, access, now);
    }
    const adapter = this.dependencies.adapters.get(input.channel);
    if (adapter === undefined || !adapter.enabled) {
      return await this.recordTerminal(
        job,
        projection,
        access,
        "CHANNEL_DISABLED",
        now,
      );
    }
    await this.recordAttempt(job, projection, access, now);
    const preAdapterNow = this.dependencies.clock.now();
    await this.assertActiveLease(job, preAdapterNow);
    const result = await deliverSafely(adapter, {
      channel: input.channel,
      notification: projectNotification(projection, access),
      recipientId: input.recipientId,
      jobId: job.jobId,
      attemptNumber: job.attemptNumber,
    });
    const postAdapterNow = this.dependencies.clock.now();
    if (result.status === "succeeded") {
      return await this.recordSuccess(
        job,
        projection,
        access,
        result,
        postAdapterNow,
      );
    }
    if (result.status === "retryable") {
      return await this.recordRetry(
        job,
        projection,
        access,
        result.failureCode,
        postAdapterNow,
      );
    }
    return await this.recordTerminal(
      job,
      projection,
      access,
      result.failureCode,
      postAdapterNow,
    );
  }

  private assertActiveLease(
    job: ClaimedNotificationDeliveryJob,
    now: Date,
  ): Promise<void> {
    return this.dependencies.transactions.run((transaction) =>
      this.dependencies.jobStore!.assertActiveLease(transaction, job, now)
    );
  }

  private loadProjection(
    input: ParsedDeliveryJob,
    access: AuthorizedNotificationScope,
  ): Promise<NotificationProjection | undefined> {
    const lookup: NotificationProjectionLookup = {
      access,
      notificationId: input.notificationId,
    };
    return this.dependencies.transactions.run((transaction) =>
      this.dependencies.repository.findProjection(transaction, lookup)
    );
  }

  private async recordAttempt(
    job: ClaimedNotificationDeliveryJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    now: Date,
  ): Promise<void> {
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobStore!.assertActiveLease(
        transaction,
        job,
        now,
      );
      await this.dependencies.repository.updateDeliveryState(
        transaction,
        stateUpdate(access, projection, job, "attempting"),
      );
      await this.dependencies.repository.appendReceipt(
        transaction,
        receipt(projection, access, job, "attempted", now),
      );
    });
  }

  private async recordSuccess(
    job: ClaimedNotificationDeliveryJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    result: Extract<
      NotificationAdapterResult,
      { readonly status: "succeeded" }
    >,
    now: Date,
  ): Promise<NotificationDeliveryResult> {
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobStore!.assertActiveLease(
        transaction,
        job,
        now,
      );
      await this.dependencies.repository.updateDeliveryState(
        transaction,
        stateUpdate(access, projection, job, "succeeded"),
      );
      await this.dependencies.repository.appendReceipt(
        transaction,
        receipt(projection, access, job, "succeeded", now),
      );
      await this.dependencies.jobStore!.complete(
        transaction,
        job,
        result.resultReference,
        now,
      );
    });
    return { status: "succeeded", jobId: job.jobId };
  }

  private async recordRetry(
    job: ClaimedNotificationDeliveryJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    failureCode: string,
    now: Date,
  ): Promise<NotificationDeliveryResult> {
    const decision = this.dependencies.retryPolicy.nextAttempt({
      attemptNumber: job.attemptNumber,
      now,
      expiresAt: projection.expiresAt,
    });
    if (decision.nextAttemptAt !== undefined) {
      await this.recordFailure(
        job,
        projection,
        access,
        "retry_scheduled",
        failureCode,
        decision.nextAttemptAt,
        now,
      );
      return { status: "retry_scheduled", jobId: job.jobId };
    }
    await this.recordFailure(
      job,
      projection,
      access,
      "dead_lettered",
      decision.terminalFailureCode,
      undefined,
      now,
    );
    return { status: "dead_lettered", jobId: job.jobId };
  }

  private async recordTerminal(
    job: ClaimedNotificationDeliveryJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    failureCode: string,
    now: Date,
  ): Promise<NotificationDeliveryResult> {
    await this.recordFailure(
      job,
      projection,
      access,
      "dead_lettered",
      failureCode,
      undefined,
      now,
    );
    return { status: "dead_lettered", jobId: job.jobId };
  }

  private async recordExpired(
    job: ClaimedNotificationDeliveryJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    now: Date,
  ): Promise<NotificationDeliveryResult> {
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobStore!.assertActiveLease(
        transaction,
        job,
        now,
      );
      await this.dependencies.repository.updateDeliveryState(
        transaction,
        stateUpdate(access, projection, job, "expired"),
      );
      await this.dependencies.repository.appendReceipt(
        transaction,
        receipt(projection, access, job, "expired", now),
      );
      await this.dependencies.jobStore!.fail(transaction, job, {
        outcome: "failed",
        failure: sanitizedJobFailure("NOTIFICATION_EXPIRED"),
        completedAt: now,
      });
    });
    return { status: "expired", jobId: job.jobId };
  }

  private async recordMissingProjection(
    job: ClaimedNotificationDeliveryJob,
    input: ParsedDeliveryJob,
    access: AuthorizedNotificationScope,
  ): Promise<NotificationDeliveryResult> {
    const now = this.dependencies.clock.now();
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobStore!.assertActiveLease(
        transaction,
        job,
        now,
      );
      await this.dependencies.repository.appendReceipt(
        transaction,
        missingReceipt(input, access, job, now),
      );
      await this.dependencies.jobStore!.fail(transaction, job, {
        outcome: "dead_lettered",
        failure: sanitizedJobFailure("NOTIFICATION_NOT_FOUND"),
        completedAt: now,
      });
    });
    return { status: "dead_lettered", jobId: job.jobId };
  }

  private recordFailure(
    job: ClaimedNotificationDeliveryJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    outcome: "retry_scheduled" | "dead_lettered",
    failureCode: string,
    nextAttemptAt: Date | undefined,
    now: Date,
  ): Promise<void> {
    const failure = sanitizedFailure(failureCode);
    return this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobStore!.assertActiveLease(
        transaction,
        job,
        now,
      );
      await this.dependencies.repository.updateDeliveryState(
        transaction,
        stateUpdate(
          access,
          projection,
          job,
          outcome === "retry_scheduled" ? "retry_scheduled" : "dead_lettered",
        ),
      );
      await this.dependencies.repository.appendReceipt(
        transaction,
        receipt(
          projection,
          access,
          job,
          outcome === "retry_scheduled" ? "retry_scheduled" : "terminal",
          now,
          failureCode,
        ),
      );
      await this.dependencies.jobStore!.fail(transaction, job, {
        outcome,
        failure,
        completedAt: now,
        ...(nextAttemptAt === undefined ? {} : { nextAttemptAt }),
      });
    });
  }
}

async function deliverSafely(
  adapter: NotificationChannelAdapter,
  request: NotificationDeliveryRequest,
): Promise<NotificationAdapterResult> {
  try {
    return await adapter.deliver(request);
  } catch {
    return { status: "retryable", failureCode: "CHANNEL_ADAPTER_ERROR" };
  }
}
