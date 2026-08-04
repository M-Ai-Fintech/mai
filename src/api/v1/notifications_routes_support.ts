import {
  createAcceptedJobEnvelope,
  createApiError,
  createProtectedNotFoundError,
} from "../../platform/api/v1.ts";
import type {
  CorrelationId,
  JobId,
} from "../../shared/contracts/identifiers.ts";
import type { Subscription } from "../../notifications/subscriptions.ts";
import { NotificationAuthorizationError } from "../../notifications/projection.ts";
import { SubscriptionVersionConflictError } from "../../notifications/subscriptions.ts";
import { NotificationRepositoryNotFoundError } from "../../notifications/repository.ts";
import {
  type DeliveryReferenceResult,
  NotificationDeliveryUnavailableError,
  NotificationIdempotencyConflictError,
  NotificationValidationError,
} from "./notifications_contracts.ts";

export function subscriptionResponse(
  subscription: Subscription,
): Record<string, unknown> {
  return {
    id: subscription.subscriptionId,
    scope: subscription.scope,
    recipientId: subscription.recipientId,
    eventType: subscription.eventType,
    preferences: subscription.preferences,
    version: subscription.version,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

export function acceptedDeliveryResponse(
  result: DeliveryReferenceResult,
  correlationId: CorrelationId,
) {
  return createAcceptedJobEnvelope({
    operationId: result.operationId,
    jobId: result.jobId as JobId,
    status: "accepted",
    correlationId,
  });
}

export function mapNotificationError(
  error: unknown,
  correlationId: CorrelationId,
): {
  readonly body: unknown;
  readonly status: number;
  readonly headers?: Headers;
} {
  if (
    error instanceof NotificationRepositoryNotFoundError ||
    error instanceof NotificationAuthorizationError
  ) return { body: createProtectedNotFoundError(correlationId), status: 404 };
  if (error instanceof NotificationIdempotencyConflictError) {
    return {
      body: createApiError({
        code: "IDEMPOTENCY_CONFLICT",
        message: error.message,
        correlationId,
        retryable: false,
      }),
      status: 409,
    };
  }
  if (error instanceof SubscriptionVersionConflictError) {
    return {
      body: createApiError({
        code: "VERSION_CONFLICT",
        message: error.message,
        correlationId,
        retryable: false,
        expectedVersion: error.expectedVersion,
        currentVersion: error.currentVersion,
      }),
      status: 409,
    };
  }
  if (error instanceof NotificationDeliveryUnavailableError) {
    return {
      body: createApiError({
        code: "DEPENDENCY_UNAVAILABLE",
        message: error.message,
        correlationId,
        retryable: true,
      }),
      status: 503,
    };
  }
  const message = error instanceof Error
    ? error.message
    : "Invalid notification request.";
  return {
    body: createApiError({
      code: "VALIDATION_FAILED",
      message,
      correlationId,
      retryable: false,
      fieldErrors: {
        request: [{ field: "request", code: "INVALID_TYPE", message }],
      },
    }),
    status: error instanceof NotificationValidationError ? 422 : 404,
  };
}
