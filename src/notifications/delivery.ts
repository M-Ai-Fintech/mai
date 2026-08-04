import type {
  ClaimedJob,
  JobClaim,
  JobFailure,
  SanitizedJobFailure,
} from "../platform/jobs/repository.ts";
import { sanitizedJobFailure } from "../platform/jobs/repository.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  ActorId,
  JobId,
  OperationId,
} from "../shared/contracts/identifiers.ts";
import {
  createDeliveryReceiptId,
  type DeliveryReceipt,
  type NotificationChannel,
  type NotificationClock,
  type NotificationId,
  type NotificationProjection,
  type NotificationScope,
  parseNotificationId,
} from "./model.ts";
import type {
  AuthorizedNotificationScope,
  NotificationReadProjection,
} from "./projection.ts";
import type {
  NotificationProjectionLookup,
  NotificationRepository,
  NotificationStateUpdate,
} from "./repository.ts";
import type { DeliveryRetryPolicy } from "./retry.ts";
import { projectNotification } from "./projection.ts";

export interface NotificationJobPort {
  claim(
    transaction: TransactionHandle,
    claim: JobClaim,
  ): Promise<ClaimedJob[]>;
  assertActiveLease(
    transaction: TransactionHandle,
    job: ClaimedJob,
    now: Date,
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
    job: ClaimedJob,
  ): Promise<AuthorizedNotificationScope>;
}

export interface NotificationDeliveryDependencies {
  readonly transactions: {
    run<TResult>(
      callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
    ): Promise<TResult>;
  };
  readonly jobs: NotificationJobPort;
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
  ): Promise<ClaimedJob | undefined> {
    const claim: JobClaim = {
      workerId,
      now,
      leaseUntil: new Date(now.getTime() + leaseMilliseconds),
      limit: 1,
    };
    return await this.dependencies.transactions.run(async (transaction) => {
      const jobs = await this.dependencies.jobs.claim(transaction, claim);
      return jobs[0];
    });
  }

  private async processClaimedJob(
    job: ClaimedJob,
  ): Promise<NotificationDeliveryResult> {
    const input = parseDeliveryJob(job);
    const access = await this.dependencies.authorizer.authorize(
      input.scope,
      input.recipientId,
      job,
    );
    const projection = await this.loadProjection(job, input, access);
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
    const result = await deliverSafely(adapter, {
      channel: input.channel,
      notification: projectNotification(projection, access),
      recipientId: input.recipientId,
      jobId: job.jobId,
      attemptNumber: job.attemptNumber,
    });
    if (result.status === "succeeded") {
      return await this.recordSuccess(job, projection, access, result, now);
    }
    if (result.status === "retryable") {
      return await this.recordRetry(
        job,
        projection,
        access,
        result.failureCode,
        now,
      );
    }
    return await this.recordTerminal(
      job,
      projection,
      access,
      result.failureCode,
      now,
    );
  }

  private loadProjection(
    job: ClaimedJob,
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
    job: ClaimedJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    now: Date,
  ): Promise<void> {
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobs.assertActiveLease(transaction, job, now);
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
    job: ClaimedJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    result: Extract<
      NotificationAdapterResult,
      { readonly status: "succeeded" }
    >,
    now: Date,
  ): Promise<NotificationDeliveryResult> {
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobs.assertActiveLease(transaction, job, now);
      await this.dependencies.repository.updateDeliveryState(
        transaction,
        stateUpdate(access, projection, job, "succeeded"),
      );
      await this.dependencies.repository.appendReceipt(
        transaction,
        receipt(projection, access, job, "succeeded", now),
      );
      await this.dependencies.jobs.complete(
        transaction,
        job,
        result.resultReference,
        now,
      );
    });
    return { status: "succeeded", jobId: job.jobId };
  }

  private async recordRetry(
    job: ClaimedJob,
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
    job: ClaimedJob,
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
    job: ClaimedJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    now: Date,
  ): Promise<NotificationDeliveryResult> {
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobs.assertActiveLease(transaction, job, now);
      await this.dependencies.repository.updateDeliveryState(
        transaction,
        stateUpdate(access, projection, job, "expired"),
      );
      await this.dependencies.repository.appendReceipt(
        transaction,
        receipt(projection, access, job, "expired", now),
      );
      await this.dependencies.jobs.fail(transaction, job, {
        outcome: "failed",
        failure: sanitizedJobFailure("NOTIFICATION_EXPIRED"),
        completedAt: now,
      });
    });
    return { status: "expired", jobId: job.jobId };
  }

  private async recordMissingProjection(
    job: ClaimedJob,
    input: ParsedDeliveryJob,
    access: AuthorizedNotificationScope,
  ): Promise<NotificationDeliveryResult> {
    const now = this.dependencies.clock.now();
    await this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobs.assertActiveLease(transaction, job, now);
      await this.dependencies.repository.appendReceipt(
        transaction,
        missingReceipt(input, access, job, now),
      );
      await this.dependencies.jobs.fail(transaction, job, {
        outcome: "dead_lettered",
        failure: sanitizedJobFailure("NOTIFICATION_NOT_FOUND"),
        completedAt: now,
      });
    });
    return { status: "dead_lettered", jobId: job.jobId };
  }

  private recordFailure(
    job: ClaimedJob,
    projection: NotificationProjection,
    access: AuthorizedNotificationScope,
    outcome: "retry_scheduled" | "dead_lettered",
    failureCode: string,
    nextAttemptAt: Date | undefined,
    now: Date,
  ): Promise<void> {
    const failure = sanitizedFailure(failureCode);
    return this.dependencies.transactions.run(async (transaction) => {
      await this.dependencies.jobs.assertActiveLease(transaction, job, now);
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
      await this.dependencies.jobs.fail(transaction, job, {
        outcome,
        failure,
        completedAt: now,
        ...(nextAttemptAt === undefined ? {} : { nextAttemptAt }),
      });
    });
  }
}

function parseDeliveryJob(job: ClaimedJob): ParsedDeliveryJob {
  if (job.workspaceId === undefined) {
    throw new Error(
      `Notification job "${job.jobId}" has no workspace scope; expected a recipient-scoped job.`,
    );
  }
  const rawId = job.payload.notificationId;
  const parsedId = parseNotificationId(rawId);
  if (!parsedId.ok) {
    throw new Error(
      `Notification job "${job.jobId}" notification ID "${
        String(rawId)
      }" is invalid; expected a notification ID.`,
    );
  }
  const channel = job.payload.channel;
  if (channel !== "in_app" && channel !== "email") {
    throw new Error(
      `Notification job "${job.jobId}" channel "${
        String(channel)
      }" is invalid; expected in_app or email.`,
    );
  }
  return {
    notificationId: parsedId.value,
    recipientId: job.initiatingActorId,
    channel,
    scope: {
      tenantId: job.tenantId,
      workspaceId: job.workspaceId,
      ...(job.dealId === undefined ? {} : { dealId: job.dealId }),
    },
  };
}

interface ParsedDeliveryJob {
  readonly notificationId: NotificationId;
  readonly recipientId: ActorId;
  readonly channel: NotificationChannel;
  readonly scope: NotificationScope;
}

function stateUpdate(
  access: AuthorizedNotificationScope,
  projection: NotificationProjection,
  job: ClaimedJob,
  state: NotificationStateUpdate["state"],
): NotificationStateUpdate {
  return {
    access,
    notificationId: projection.notificationId,
    jobId: job.jobId,
    state,
  };
}

function receipt(
  projection: NotificationProjection,
  access: AuthorizedNotificationScope,
  job: ClaimedJob,
  outcome: DeliveryReceipt["outcome"],
  occurredAt: Date,
  failureCode?: string,
): DeliveryReceipt {
  return {
    receiptId: createDeliveryReceiptId(
      `receipt_${
        receiptToken(projection.notificationId)
      }-${job.attemptNumber}-${receiptToken(outcome)}`,
    ),
    scope: access,
    recipientId: access.recipientId,
    notificationId: projection.notificationId,
    jobId: job.jobId,
    channel: job.payload.channel as NotificationChannel,
    attemptNumber: job.attemptNumber,
    outcome,
    ...(failureCode === undefined ? {} : { failureCode }),
    occurredAt,
  };
}

function missingReceipt(
  input: ParsedDeliveryJob,
  access: AuthorizedNotificationScope,
  job: ClaimedJob,
  occurredAt: Date,
): DeliveryReceipt {
  return {
    receiptId: createDeliveryReceiptId(
      `receipt_${
        receiptToken(input.notificationId)
      }-${job.attemptNumber}-terminal`,
    ),
    scope: input.scope,
    recipientId: access.recipientId,
    notificationId: input.notificationId,
    jobId: job.jobId,
    channel: input.channel,
    attemptNumber: job.attemptNumber,
    outcome: "terminal",
    failureCode: "NOTIFICATION_NOT_FOUND",
    occurredAt,
  };
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

function sanitizedFailure(code: string): SanitizedJobFailure {
  if (/^[A-Z][A-Z0-9_:-]{0,127}$/.test(code)) return sanitizedJobFailure(code);
  return sanitizedJobFailure("CHANNEL_ADAPTER_ERROR");
}

function receiptToken(notificationId: string): string {
  return notificationId.replaceAll("_", "-");
}
