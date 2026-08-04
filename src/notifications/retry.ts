import type {
  ClaimedJob,
  SanitizedJobFailure,
} from "../platform/jobs/repository.ts";
import { sanitizedJobFailure } from "../platform/jobs/repository.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
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
import type { AuthorizedNotificationScope } from "./projection.ts";
import type { NotificationStateUpdate } from "./repository.ts";

export interface ParsedDeliveryJob {
  readonly notificationId: NotificationId;
  readonly recipientId: ActorId;
  readonly channel: NotificationChannel;
  readonly scope: NotificationScope;
}

export function parseDeliveryJob(job: ClaimedJob): ParsedDeliveryJob {
  if (job.workspaceId === undefined) {
    throw new Error(
      `Notification job "${job.jobId}" has no workspace scope; expected a recipient-scoped job.`,
    );
  }
  const parsedId = parseNotificationId(job.payload.notificationId);
  if (!parsedId.ok) {
    throw new Error(
      `Notification job "${job.jobId}" notification ID "${
        String(job.payload.notificationId)
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

export function stateUpdate(
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

export function receipt(
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

export function missingReceipt(
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

export function sanitizedFailure(code: string): SanitizedJobFailure {
  if (/^[A-Z][A-Z0-9_:-]{0,127}$/.test(code)) return sanitizedJobFailure(code);
  return sanitizedJobFailure("CHANNEL_ADAPTER_ERROR");
}

function receiptToken(notificationId: string): string {
  return notificationId.replaceAll("_", "-");
}

export interface DeliveryRetryInput {
  readonly attemptNumber: number;
  readonly now: Date;
  readonly expiresAt?: Date;
}

export interface DeliveryRetryDecision {
  readonly nextAttemptAt?: Date;
  readonly terminalFailureCode: string;
}

export interface DeliveryRetryPolicy {
  nextAttempt(input: DeliveryRetryInput): DeliveryRetryDecision;
}

export class ExponentialDeliveryRetryPolicy implements DeliveryRetryPolicy {
  constructor(
    private readonly maximumAttempts = 3,
    private readonly baseDelayMilliseconds = 1_000,
    private readonly maximumDelayMilliseconds = 60_000,
  ) {
    assertPositiveInteger(maximumAttempts, "maximum attempts");
    assertPositiveInteger(baseDelayMilliseconds, "base retry delay");
    assertPositiveInteger(maximumDelayMilliseconds, "maximum retry delay");
  }

  nextAttempt(input: DeliveryRetryInput): DeliveryRetryDecision {
    assertAttempt(input.attemptNumber);
    const delay = Math.min(
      this.maximumDelayMilliseconds,
      this.baseDelayMilliseconds * 2 ** (input.attemptNumber - 1),
    );
    const nextAttemptAt = new Date(input.now.getTime() + delay);
    if (input.attemptNumber >= this.maximumAttempts) {
      return { terminalFailureCode: "DELIVERY_RETRY_EXHAUSTED" };
    }
    if (input.expiresAt !== undefined && nextAttemptAt >= input.expiresAt) {
      return { terminalFailureCode: "DELIVERY_EXPIRY_REACHED" };
    }
    return { nextAttemptAt, terminalFailureCode: "DELIVERY_RETRY_EXHAUSTED" };
  }
}

export class NamedNotificationClock implements NotificationClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds)) {
      throw new Error(
        `Clock advance "${milliseconds}" is invalid; expected an integer millisecond count.`,
      );
    }
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

function assertAttempt(value: number): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `Delivery attempt number "${value}" is invalid; expected a positive integer.`,
  );
}

function assertPositiveInteger(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `Delivery ${label} "${value}" is invalid; expected a positive integer.`,
  );
}
