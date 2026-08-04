import type { OpaqueCursor } from "../../platform/api/v1.ts";
import type { TransactionHandle } from "../../platform/persistence/transaction.ts";
import type { RequestContext } from "../../shared/contracts/request_context.ts";
import type { AggregateVersion } from "../../shared/contracts/aggregate_version.ts";
import type {
  IdempotencyKey,
  OperationId,
} from "../../shared/contracts/identifiers.ts";
import type {
  AuthorizedNotificationScope,
  NotificationAuthorizationPort,
  NotificationReadProjection,
} from "../../notifications/projection.ts";
import type { NotificationScope } from "../../notifications/model.ts";
import type {
  Subscription,
  SubscriptionPreferences,
} from "../../notifications/subscriptions.ts";
import type { NotificationRepository } from "../../notifications/repository.ts";

export interface NotificationV1TransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult>;
}

export interface NotificationV1Dependencies {
  readonly repository: NotificationRepository;
  readonly transactions: NotificationV1TransactionRunner;
  readonly authorization: NotificationAuthorizationPort;
  readonly clock: { now(): Date };
}

export interface NotificationListInput {
  readonly context: RequestContext;
  readonly scope: NotificationScope;
  readonly cursor?: OpaqueCursor;
  readonly limit: number;
}

export interface NotificationListResult {
  readonly data: readonly NotificationReadProjection[];
  readonly nextCursor?: OpaqueCursor;
  readonly access: AuthorizedNotificationScope;
}

export interface SubscriptionCommandInput {
  readonly context: RequestContext;
  readonly scope: NotificationScope;
  readonly subscriptionId: string;
  readonly eventType: string;
  readonly preferences: SubscriptionPreferences;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: AggregateVersion;
}

export interface SubscriptionCommandResult {
  readonly subscription: Subscription;
  readonly replayed: boolean;
}

export interface DeliveryReferenceResult {
  readonly jobId: string;
  readonly operationId: OperationId;
  readonly replayed: boolean;
}

export class NotificationIdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";

  constructor(readonly idempotencyKey: IdempotencyKey) {
    super(
      `Notification idempotency key "${idempotencyKey}" was reused with a different payload; expected the original command.`,
    );
    this.name = "NotificationIdempotencyConflictError";
  }
}

export class NotificationValidationError extends Error {
  readonly code = "VALIDATION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "NotificationValidationError";
  }
}

export class NotificationAuthenticationError extends Error {
  readonly code = "UNAUTHENTICATED";

  constructor(message = "Notification authentication is required.") {
    super(message);
    this.name = "NotificationAuthenticationError";
  }
}

export class NotificationDeliveryUnavailableError extends Error {
  readonly code = "DEPENDENCY_UNAVAILABLE";

  constructor(notificationId: string) {
    super(
      `Notification "${notificationId}" has no durable delivery job reference; expected projection consumption before external delivery.`,
    );
    this.name = "NotificationDeliveryUnavailableError";
  }
}
