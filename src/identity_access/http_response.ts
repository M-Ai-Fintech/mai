import {
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  formatEtag,
} from "../platform/api/v1.ts";
import type { CorrelationId } from "../shared/contracts/identifiers.ts";
import type { IdentityAccessAggregate } from "./contracts.ts";
import { IdentityAccessError } from "./errors.ts";
import { RequestInputError } from "./http_shared.ts";

export function writeSuccess(
  data: unknown,
  correlationIdValue: CorrelationId,
  version: number | undefined,
  status: number,
  baseHeaders: Headers,
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json");
  if (version !== undefined) headers.set("ETag", formatEtag(version));
  return Response.json(
    createSuccessEnvelope(data, { correlationId: correlationIdValue }),
    { status, headers },
  );
}

export function writeError(
  envelope: unknown,
  status: number,
  baseHeaders: Headers,
): Response {
  return writeResponse(envelope, status, baseHeaders);
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

export function unauthenticated(correlationIdValue: CorrelationId) {
  return createApiError({
    code: "UNAUTHENTICATED",
    message: "Authentication is required.",
    correlationId: correlationIdValue,
    retryable: false,
  });
}

export function mapDomainError(
  error: unknown,
  correlationIdValue: CorrelationId,
  baseHeaders: Headers,
): Response {
  if (error instanceof IdentityAccessError) {
    const response = mapIdentityAccessError(error, correlationIdValue);
    if (response !== undefined) {
      return writeError(response.envelope, response.status, baseHeaders);
    }
  }
  const message = error instanceof RequestInputError
    ? error.message
    : "The request could not be processed.";
  return writeError(
    createValidationError(correlationIdValue, message),
    422,
    baseHeaders,
  );
}

export function safeAggregateDto(
  aggregate: IdentityAccessAggregate,
): Readonly<Record<string, unknown>> {
  const base = {
    id: aggregate.id,
    aggregateType: aggregate.aggregateType,
    tenantId: aggregate.tenantId,
    version: aggregate.version,
    state: aggregate.state,
  };
  if (aggregate.aggregateType === "institution") {
    return { ...base, name: aggregate.name };
  }
  if (aggregate.aggregateType === "workspace") {
    return {
      ...base,
      institutionId: aggregate.institutionId,
      name: aggregate.name,
    };
  }
  if (aggregate.aggregateType === "user_identity") {
    return { ...base, displayName: aggregate.displayName };
  }
  if (aggregate.aggregateType === "membership") {
    return {
      ...base,
      workspaceId: aggregate.workspaceId,
      identityId: aggregate.identityId,
      rolePolicyIds: aggregate.rolePolicyIds,
    };
  }
  if (aggregate.aggregateType === "invitation") {
    return {
      ...base,
      workspaceId: aggregate.workspaceId,
      identityId: aggregate.identityId,
      purpose: aggregate.purpose,
      expiresAt: aggregate.expiresAt,
    };
  }
  if (aggregate.aggregateType === "role_policy") {
    return {
      ...base,
      workspaceId: aggregate.workspaceId,
      name: aggregate.name,
      resourceKinds: aggregate.resourceKinds,
      actions: aggregate.actions,
      fields: aggregate.fields,
    };
  }
  if (aggregate.aggregateType === "permission_grant") {
    return {
      ...base,
      workspaceId: aggregate.workspaceId,
      identityId: aggregate.identityId,
      access: aggregate.access,
      resourceIds: aggregate.resourceIds,
      resourceKinds: aggregate.resourceKinds,
      actions: aggregate.actions,
      fields: aggregate.fields,
      expiresAt: aggregate.expiresAt,
    };
  }
  if (aggregate.aggregateType === "restriction") {
    return {
      ...base,
      workspaceId: aggregate.workspaceId,
      resourceIds: aggregate.resourceIds,
      resourceKinds: aggregate.resourceKinds,
      actions: aggregate.actions,
      fields: aggregate.fields,
    };
  }
  return {
    ...base,
    targetType: aggregate.targetType,
    targetId: aggregate.targetId,
    targetVersion: aggregate.targetVersion,
    reason: aggregate.reason,
  };
}

function mapIdentityAccessError(
  error: IdentityAccessError,
  correlationIdValue: CorrelationId,
): { readonly envelope: unknown; readonly status: number } | undefined {
  if (error.code === "AUTHENTICATION_FAILED") {
    return { envelope: unauthenticated(correlationIdValue), status: 401 };
  }
  if (error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH") {
    return {
      envelope: createProtectedNotFoundError(correlationIdValue),
      status: 404,
    };
  }
  if (error.code === "HUMAN_AUTHORITY_REQUIRED") {
    return {
      envelope: createApiError({
        code: "ACTION_FORBIDDEN",
        message: "The authenticated actor cannot administer identity access.",
        correlationId: correlationIdValue,
        retryable: false,
      }),
      status: 403,
    };
  }
  if (error.code === "VERSION_CONFLICT") {
    return {
      envelope: createApiError({
        code: "STALE_VERSION",
        message: "The aggregate changed after the supplied version.",
        correlationId: correlationIdValue,
        retryable: false,
      }),
      status: 409,
    };
  }
  if (error.code === "IDEMPOTENCY_CONFLICT") {
    return {
      envelope: createApiError({
        code: "IDEMPOTENCY_CONFLICT",
        message: "The idempotency key was already used with another command.",
        correlationId: correlationIdValue,
        retryable: false,
      }),
      status: 409,
    };
  }
  return undefined;
}

function createValidationError(
  correlationIdValue: CorrelationId,
  message: string,
) {
  return createApiError({
    code: "VALIDATION_FAILED",
    message,
    correlationId: correlationIdValue,
    retryable: false,
    fieldErrors: {
      request: [{ field: "request", code: "INVALID_TYPE", message }],
    },
  });
}
