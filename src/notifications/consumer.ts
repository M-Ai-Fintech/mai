import type { OutboxEvent } from "../platform/events/v1.ts";
import type {
  InboxClaimResult,
  InboxMessage,
} from "../platform/events/inbox.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { DurableJob, JobRepository } from "../platform/jobs/v1.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import { type ActorId, parseActorId } from "../shared/contracts/identifiers.ts";
import {
  freezeEventPayload,
  freezeProjection,
  type NotificationClock,
  type NotificationEventPayload,
  type NotificationProjection,
  type NotificationRecipientTarget,
  type NotificationScope,
  parseSubscriptionId,
} from "./model.ts";
import {
  deterministicNotificationId,
  deterministicNotificationIdempotencyKey,
  deterministicNotificationJobId,
  deterministicNotificationOperationId,
} from "./v1.ts";
import type {
  AuthorizedNotificationScope,
  NotificationAuthorizationAction,
} from "./projection.ts";
import type {
  NotificationRepository,
  SubscriptionIdLookup,
  SubscriptionLookup,
} from "./repository.ts";
import { subscriptionChannelEnabled } from "./subscriptions.ts";

export interface NotificationTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export interface NotificationInboxPort {
  claim(
    transaction: TransactionHandle,
    message: InboxMessage,
  ): Promise<InboxClaimResult>;
  complete(
    transaction: TransactionHandle,
    message: InboxMessage,
    processedAt: Date,
  ): Promise<void>;
}

export interface NotificationEventAuthorizer {
  authorize(
    scope: NotificationScope,
    recipientId: ActorId,
    action: NotificationAuthorizationAction,
    event: OutboxEvent,
  ): Promise<AuthorizedNotificationScope>;
}

export interface NotificationConsumerDependencies {
  readonly transactions: NotificationTransactionRunner;
  readonly inbox: NotificationInboxPort;
  readonly repository: NotificationRepository;
  readonly jobs: Pick<JobRepository, "enqueue">;
  readonly authorizer: NotificationEventAuthorizer;
  readonly clock: NotificationClock;
  readonly inboxSourceIdentity?: string;
}

export type NotificationConsumeResult =
  | { readonly status: "duplicate"; readonly eventId: string }
  | {
    readonly status: "projected";
    readonly eventId: string;
    readonly projectionCount: number;
    readonly jobCount: number;
  }
  | { readonly status: "ignored"; readonly eventId: string };

export class NotificationEventConsumer {
  constructor(
    private readonly dependencies: NotificationConsumerDependencies,
  ) {}

  /**
   * Projects one committed outbox event in the same transaction as inbox
   * completion and durable job enqueue.
   *
   * @example await consumer.consume(claimedOutboxEvent)
   */
  async consume(event: OutboxEvent): Promise<NotificationConsumeResult> {
    const payload = readEventPayload(event);
    const message = await inboxMessage(
      event,
      payloadDigest(event.payload),
      this.dependencies.clock.now(),
      this.dependencies.inboxSourceIdentity ?? "notifications",
    );
    return await this.dependencies.transactions.run(async (transaction) => {
      const claim = await this.dependencies.inbox.claim(transaction, message);
      if (claim.status === "duplicate") {
        return { status: "duplicate", eventId: event.eventId };
      }
      const result = await projectRecipients(
        transaction,
        event,
        payload,
        this.dependencies,
      );
      await this.dependencies.inbox.complete(
        transaction,
        message,
        this.dependencies.clock.now(),
      );
      return result;
    });
  }
}

async function projectRecipients(
  transaction: TransactionHandle,
  event: OutboxEvent,
  payload: NotificationEventPayload,
  dependencies: NotificationConsumerDependencies,
): Promise<NotificationConsumeResult> {
  const scope = eventScope(event);
  let projectionCount = 0;
  let jobCount = 0;
  for (const target of payload.recipients) {
    const result = await projectRecipient(
      transaction,
      event,
      payload,
      scope,
      target,
      dependencies,
    );
    projectionCount += result.projectionCount;
    jobCount += result.jobCount;
  }
  if (projectionCount === 0) {
    return { status: "ignored", eventId: event.eventId };
  }
  return {
    status: "projected",
    eventId: event.eventId,
    projectionCount,
    jobCount,
  };
}

async function projectRecipient(
  transaction: TransactionHandle,
  event: OutboxEvent,
  payload: NotificationEventPayload,
  scope: NotificationScope,
  target: NotificationRecipientTarget,
  dependencies: NotificationConsumerDependencies,
): Promise<{ readonly projectionCount: number; readonly jobCount: number }> {
  const access = await dependencies.authorizer.authorize(
    scope,
    target.recipientId,
    "deliver",
    event,
  );
  const subscription = await findRecipientSubscription(
    transaction,
    scope,
    target,
    payload.notificationType,
    dependencies.repository,
  );
  if (
    subscription === undefined ||
    !subscriptionChannelEnabled(subscription, selectChannel(subscription))
  ) return { projectionCount: 0, jobCount: 0 };
  const projection = createProjection(
    event,
    payload,
    scope,
    target,
    subscription,
  );
  const inserted = await dependencies.repository.insertProjection(
    transaction,
    projection,
  );
  if (inserted === "duplicate") return { projectionCount: 0, jobCount: 0 };
  const channel = selectChannel(subscription);
  const job = createDeliveryJob(event, projection, target.recipientId, channel);
  await dependencies.jobs.enqueue(transaction, job);
  await dependencies.repository.attachDeliveryJob(transaction, {
    access,
    notificationId: projection.notificationId,
    idempotencyKey: projection.idempotencyKey,
    jobId: job.jobId,
    operationId: job.operationId!,
  });
  return { projectionCount: 1, jobCount: 1 };
}

async function findRecipientSubscription(
  transaction: TransactionHandle,
  scope: NotificationScope,
  target: NotificationRecipientTarget,
  eventType: string,
  repository: NotificationRepository,
) {
  if (target.subscriptionId !== undefined) {
    const lookup: SubscriptionIdLookup = {
      scope,
      recipientId: target.recipientId,
      subscriptionId: target.subscriptionId,
    };
    return await repository.findSubscriptionById(transaction, lookup);
  }
  const lookup: SubscriptionLookup = {
    scope,
    recipientId: target.recipientId,
    eventType,
  };
  return await repository.findSubscription(transaction, lookup);
}

function createProjection(
  event: OutboxEvent,
  payload: NotificationEventPayload,
  scope: NotificationScope,
  target: NotificationRecipientTarget,
  subscription:
    Awaited<ReturnType<NotificationRepository["findSubscription"]>> extends
      infer T ? Exclude<T, undefined>
      : never,
): NotificationProjection {
  const expiresAt = earliestExpiry(payload.expiresAt, target.expiresAt);
  return freezeProjection({
    notificationId: deterministicNotificationId(
      event.eventId,
      target.recipientId,
    ),
    scope,
    recipientId: target.recipientId,
    sourceEventId: event.eventId,
    sourceEventType: event.eventType,
    notificationType: payload.notificationType,
    title: payload.title,
    body: payload.body,
    subscriptionId: subscription.subscriptionId,
    subscriptionVersion: subscription.version,
    createdAt: event.occurredAt,
    ...(expiresAt === undefined ? {} : { expiresAt }),
    deliveryState: "queued",
    idempotencyKey: deterministicNotificationIdempotencyKey(
      event.eventId,
      target.recipientId,
    ),
  });
}

function createDeliveryJob(
  event: OutboxEvent,
  projection: NotificationProjection,
  recipientId: ActorId,
  channel: "in_app" | "email",
): DurableJob {
  const now = event.occurredAt;
  const timeoutAt = projection.expiresAt !== undefined &&
      projection.expiresAt > now
    ? projection.expiresAt
    : new Date(now.getTime() + 300_000);
  return {
    jobId: deterministicNotificationJobId(projection.notificationId),
    operationId: deterministicNotificationOperationId(
      projection.notificationId,
    ),
    jobType: "notification.delivery",
    schemaVersion: 1,
    tenantId: projection.scope.tenantId,
    workspaceId: projection.scope.workspaceId,
    ...(projection.scope.dealId === undefined
      ? {}
      : { dealId: projection.scope.dealId }),
    initiatingActorId: recipientId,
    correlationId: event.correlationId,
    idempotencyKey: projection.idempotencyKey,
    inputVersionReferences: [{
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      version: event.aggregateVersion,
    }],
    payload: {
      notificationId: projection.notificationId,
      recipientId,
      channel,
      expiresAt: projection.expiresAt?.toISOString(),
    },
    timeoutAt,
    createdAt: now,
  };
}

function selectChannel(subscription: {
  readonly preferences: {
    readonly channels: Readonly<Record<string, boolean>>;
  };
}): "in_app" | "email" {
  return subscription.preferences.channels.in_app ? "in_app" : "email";
}

function earliestExpiry(first?: Date, second?: Date): Date | undefined {
  if (first === undefined) return second;
  if (second === undefined) return first;
  return first <= second ? first : second;
}

function eventScope(event: OutboxEvent): NotificationScope {
  if (event.workspaceId === undefined) {
    throw new Error(
      `Notification event "${event.eventId}" has no workspace scope; expected recipient delivery to be workspace-scoped.`,
    );
  }
  return {
    tenantId: event.tenantId,
    workspaceId: event.workspaceId,
    ...(event.dealId === undefined ? {} : { dealId: event.dealId }),
  };
}

function readEventPayload(event: OutboxEvent): NotificationEventPayload {
  const raw = event.payload;
  const recipients = readRecipients(raw.recipients, event.eventId);
  return freezeEventPayload({
    notificationType: readText(
      raw.notificationType,
      "notification type",
      event,
    ),
    title: readText(raw.title, "notification title", event),
    body: readText(raw.body, "notification body", event),
    recipients,
    ...(raw.expiresAt === undefined
      ? {}
      : { expiresAt: readDate(raw.expiresAt, "notification expiry", event) }),
  });
}

function readRecipients(
  value: unknown,
  eventId: string,
): readonly NotificationRecipientTarget[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `Notification event "${eventId}" recipients are invalid; expected a non-empty array.`,
    );
  }
  return value.map((item, index) => readRecipient(item, eventId, index));
}

function readRecipient(
  value: unknown,
  eventId: string,
  index: number,
): NotificationRecipientTarget {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `Notification event "${eventId}" recipient "${index}" is invalid; expected an object.`,
    );
  }
  const record = value as Record<string, unknown>;
  const parsedActor = parseActorId(record.recipientId);
  if (!parsedActor.ok) {
    throw new Error(
      `Notification event "${eventId}" recipient "${
        String(record.recipientId)
      }" is invalid; expected actor ID.`,
    );
  }
  const subscriptionId = record.subscriptionId === undefined
    ? undefined
    : parseSubscriptionId(record.subscriptionId);
  if (subscriptionId !== undefined && !subscriptionId.ok) {
    throw new Error(
      `Notification event "${eventId}" subscription "${
        String(record.subscriptionId)
      }" is invalid; expected subscription ID.`,
    );
  }
  return {
    recipientId: parsedActor.value,
    ...(subscriptionId === undefined
      ? {}
      : { subscriptionId: subscriptionId.value }),
    ...(record.expiresAt === undefined ? {} : {
      expiresAt: readDate(record.expiresAt, "recipient notification expiry", {
        eventId,
      }),
    }),
  };
}

function readText(value: unknown, label: string, event: OutboxEvent): string {
  if (typeof value === "string" && value.trim()) return value;
  throw new Error(
    `Notification event "${event.eventId}" ${label} "${
      String(value)
    }" is invalid; expected non-empty text.`,
  );
}

function readDate(
  value: unknown,
  label: string,
  event: OutboxEvent | { readonly eventId: string },
): Date {
  const date = value instanceof Date
    ? new Date(value)
    : new Date(String(value));
  if (Number.isFinite(date.getTime())) return date;
  throw new Error(
    `Notification event "${event.eventId}" ${label} "${
      String(value)
    }" is invalid; expected a timestamp.`,
  );
}

async function inboxMessage(
  event: OutboxEvent,
  digest: Promise<string>,
  receivedAt: Date,
  sourceIdentity: string,
): Promise<InboxMessage> {
  return {
    tenantId: event.tenantId,
    sourceIdentity,
    messageIdentity: event.eventId,
    payloadDigest: await digest,
    receivedAt,
  };
}
