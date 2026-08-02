import {
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  formatEtag,
} from "../platform/api/v1.ts";
import type { CorrelationId } from "../platform/api/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import { projectDeal } from "./projection.ts";
import type { DealCommandResult, DealFieldMaskDecision } from "./contracts.ts";
import {
  DealAuthorizationError,
  DealError,
  DealIdempotencyConflictError,
  DealProtectedNotFoundError,
  DealVersionConflictError,
} from "./errors.ts";
import {
  DealAuthenticationError,
  DealAuthenticationUnavailableError,
  RequestInputError,
} from "./http_shared.ts";

export function writeSuccess(
  data: unknown,
  correlationId: CorrelationId,
  version: number | undefined,
  status: number,
  baseHeaders: Headers,
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json");
  if (version !== undefined) headers.set("ETag", formatEtag(version));
  return Response.json(createSuccessEnvelope(data, { correlationId }), {
    status,
    headers,
  });
}

export function writeResponse(
  body: unknown,
  status: number,
  baseHeaders: Headers,
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json");
  return Response.json(body, { status, headers });
}

export function mapDealError(
  error: unknown,
  correlationId: CorrelationId,
  baseHeaders: Headers,
): Response {
  const mapped = dealErrorResponse(error, correlationId);
  return writeResponse(mapped.body, mapped.status, baseHeaders);
}

export function safeCommandDto(result: DealCommandResult) {
  return projectDeal(result.deal, SAFE_COMMAND_RESPONSE_MASK);
}

const SAFE_COMMAND_RESPONSE_MASK: DealFieldMaskDecision = Object.freeze({
  include: [],
  omit: ["parties", "roles", "mandate_ceiling", "authority_constraints"],
});

function dealErrorResponse(
  error: unknown,
  correlationId: CorrelationId,
): { readonly body: unknown; readonly status: number } {
  if (
    error instanceof DealProtectedNotFoundError ||
    error instanceof DealError &&
      (error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH" ||
        error.code === "AUTHORIZATION_DENIED")
  ) {
    return { body: createProtectedNotFoundError(correlationId), status: 404 };
  }
  if (
    error instanceof DealAuthorizationError &&
    error.code === "HUMAN_AUTHORITY_REQUIRED"
  ) {
    return {
      body: createApiError({
        code: "ACTION_FORBIDDEN",
        message: error.message,
        correlationId,
        retryable: false,
      }),
      status: 403,
    };
  }
  if (error instanceof DealVersionConflictError) {
    return {
      body: createApiError({
        code: "VERSION_CONFLICT",
        message: error.message,
        correlationId,
        retryable: false,
        expectedVersion: error.expectedVersion as AggregateVersion,
        currentVersion: error.currentVersion as AggregateVersion,
      }),
      status: 409,
    };
  }
  if (error instanceof DealIdempotencyConflictError) {
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
  if (error instanceof DealAuthenticationError) {
    return {
      body: createApiError({
        code: "UNAUTHENTICATED",
        message: error.message,
        correlationId,
        retryable: false,
      }),
      status: 401,
    };
  }
  if (error instanceof DealAuthenticationUnavailableError) {
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
  const message =
    error instanceof RequestInputError || error instanceof DealError
      ? error.message
      : "The Deal Management request could not be processed.";
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
    status: 422,
  };
}
