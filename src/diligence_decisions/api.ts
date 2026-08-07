import {
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from "../platform/api/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { CommandResult } from "./service.ts";
import { DiligenceDecisionError } from "./errors.ts";

export function diligenceCommandEnvelope<T>(
  result: CommandResult<T>,
  context: RequestContext,
): SuccessEnvelope<
  { readonly status: CommandResult<T>["status"]; readonly value: T }
> {
  return createSuccessEnvelope(
    { status: result.status, value: result.value },
    { correlationId: context.correlationId },
  );
}

export function diligenceDecisionErrorEnvelope(
  error: unknown,
  context: RequestContext,
): ErrorEnvelope {
  if (!(error instanceof DiligenceDecisionError)) {
    return createProtectedNotFoundError(context.correlationId);
  }
  if (error.code === "PROTECTED_NOT_FOUND") {
    return createProtectedNotFoundError(context.correlationId);
  }
  if (
    error.code === "ACTOR_DENIED" || error.code === "HUMAN_AUTHORITY_REQUIRED"
  ) {
    return createApiError({
      code: "ACTION_FORBIDDEN",
      message:
        "The requested Diligence and Decisions action is not authorized.",
      correlationId: context.correlationId,
      retryable: false,
    });
  }
  if (
    error.code === "IDEMPOTENCY_CONFLICT" ||
    error.code === "IDEMPOTENCY_IN_PROGRESS"
  ) {
    return createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message:
        "The idempotency key was reused with a different command payload.",
      correlationId: context.correlationId,
      retryable: false,
    });
  }
  if (
    error.code === "VERSION_CONFLICT" || error.code === "STALE_INVALIDATION"
  ) {
    return createApiError({
      code: "STALE_VERSION",
      message:
        "The Diligence and Decisions aggregate changed; retry with exact current versions.",
      correlationId: context.correlationId,
      retryable: true,
    });
  }
  if (
    error.code === "INVALID_TRANSITION" || error.code === "IMMUTABLE_DECISION"
  ) {
    return createApiError({
      code: "INVALID_TRANSITION",
      message:
        "The Diligence and Decisions lifecycle transition is not allowed.",
      correlationId: context.correlationId,
      retryable: false,
    });
  }
  return createApiError({
    code: "VALIDATION_FAILED",
    message: "The Diligence and Decisions command is invalid.",
    correlationId: context.correlationId,
    retryable: false,
    fieldErrors: {},
  });
}
