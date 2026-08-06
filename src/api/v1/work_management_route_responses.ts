import {
  API_ERROR_CATALOG,
  createApiError,
  createSuccessEnvelope,
  parseCorrelationHeader,
} from "../../platform/api/v1.ts";
import type { CorrelationId } from "../../platform/api/v1.ts";
import { WorkManagementContextError } from "./work_management_contracts.ts";
import type {
  WorkManagementApiResult,
  WorkManagementAuthenticatedContext,
} from "./work_management_contracts.ts";

export function contextFailureResponse(
  error: unknown,
  request: Request,
): Response {
  const code = contextFailureCode(error);
  const correlationId = correlationFromRequest(request);
  const message = contextFailureMessage(code);
  return Response.json(
    createApiError({
      code,
      message,
      correlationId,
      retryable: code === "DEPENDENCY_UNAVAILABLE",
    }),
    {
      status: API_ERROR_CATALOG[code].httpStatus,
      headers: responseHeaders(correlationId),
    },
  );
}

function correlationFromRequest(request: Request): CorrelationId {
  const parsed = parseCorrelationHeader(
    request.headers.get("X-Correlation-Id"),
  );
  return parsed.ok ? parsed.value : "cor_route" as CorrelationId;
}

function contextFailureCode(
  error: unknown,
): "UNAUTHENTICATED" | "ACTION_FORBIDDEN" | "DEPENDENCY_UNAVAILABLE" {
  if (error instanceof WorkManagementContextError) return error.code;
  const code = errorCode(error);
  if (code === "UNAUTHENTICATED" || code === "AUTHENTICATION_FAILED") {
    return "UNAUTHENTICATED";
  }
  if (code === "ACTION_FORBIDDEN" || code === "AUTHORIZATION_DENIED") {
    return "ACTION_FORBIDDEN";
  }
  return "DEPENDENCY_UNAVAILABLE";
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return;
  }
  return String(error.code);
}

function contextFailureMessage(
  code: "UNAUTHENTICATED" | "ACTION_FORBIDDEN" | "DEPENDENCY_UNAVAILABLE",
): string {
  if (code === "UNAUTHENTICATED") return "Authentication is required.";
  if (code === "ACTION_FORBIDDEN") {
    return "The requested action is not permitted.";
  }
  return "Work Management authentication is temporarily unavailable.";
}

export function writeResult(
  result: WorkManagementApiResult<unknown>,
  correlationId: CorrelationId,
  successStatus: number,
): Response {
  if (result.kind === "error") return errorResult(result, correlationId);
  const view = readView(result.value);
  const headers = responseHeaders(correlationId);
  if (view.etag !== undefined) headers.ETag = view.etag;
  return Response.json(createSuccessEnvelope(view.value, { correlationId }), {
    status: successStatus,
    headers,
  });
}

function errorResult(
  result: Extract<WorkManagementApiResult<unknown>, { readonly kind: "error" }>,
  correlationId: CorrelationId,
): Response {
  return Response.json(result.error, {
    status: API_ERROR_CATALOG[result.error.error.code].httpStatus,
    headers: responseHeaders(correlationId),
  });
}

function readView(
  value: unknown,
): { readonly value: unknown; readonly etag?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { value };
  }
  const record = Object.fromEntries(Object.entries(value));
  if (typeof record.etag !== "string" || !("value" in record)) return { value };
  return { value: record.value, etag: record.etag };
}

export function validationResponse(
  error: unknown,
  correlationId: CorrelationId | undefined,
): Response {
  const value = correlationId ?? "cor_route" as CorrelationId;
  const message = validationPublicMessage(error);
  return Response.json(
    createApiError({
      code: "VALIDATION_FAILED",
      message,
      correlationId: value,
      retryable: false,
      fieldErrors: {
        request: [{ field: "request", code: "INVALID_TYPE", message }],
      },
    }),
    { status: 422, headers: responseHeaders(value) },
  );
}

function validationPublicMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : "";
  if (detail.includes("server-owned")) {
    return "The request contains server-owned fields.";
  }
  if (detail.toLowerCase().includes("payload")) {
    return "The request payload is invalid.";
  }
  if (detail.includes("cross-Deal")) {
    return "The requested cross-Deal reference is invalid.";
  }
  if (detail.includes("Idempotency-Key")) {
    return "The request is invalid: Idempotency-Key is required.";
  }
  if (detail.toLowerCase().includes("strong")) {
    return "The request is invalid: a strong ETag is required in If-Match.";
  }
  if (detail.includes("If-Match")) {
    return "The request is invalid: If-Match is required.";
  }
  return "The Work Management request is invalid.";
}

export function responseHeaders(
  correlationId: CorrelationId,
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
  };
}

export function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
}

export function authenticatedCorrelation(
  authenticated: WorkManagementAuthenticatedContext,
): CorrelationId {
  return authenticated.context.correlationId;
}
