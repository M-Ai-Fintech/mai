import type { ActorReference } from "../../platform/authz/v1.ts";
import {
  type AggregateVersion,
  API_ERROR_CATALOG,
  type CorrelationId,
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  formatEtag,
  type IdempotencyKey,
  type RequestContext,
} from "../../platform/api/v1.ts";
import type { AuthorityProofResolver } from "../../work_management/v1.ts";
import {
  type ClosingAuthorityCommandInput,
  type ClosingCommandInput,
  type ClosingCommandResult,
  ClosingError,
  type ClosingService,
} from "../../closing/v1.ts";
import type { ClosingScope, ClosingWorkspace } from "../../closing/v1.ts";

export interface ClosingAuthenticatedContext {
  readonly context: RequestContext;
  readonly actor: ActorReference;
}

export interface ClosingContextPort {
  contextFor(
    request: Request,
  ): Promise<ClosingAuthenticatedContext> | ClosingAuthenticatedContext;
}

export interface ClosingV1RouteDependencies {
  readonly context: ClosingContextPort;
  readonly application: ClosingV1Application;
}

export class ClosingRequestError extends Error {
  readonly code = "VALIDATION_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "ClosingRequestError";
  }
}

export class ClosingV1Application {
  constructor(
    readonly service: ClosingService,
    private readonly authorityResolver: AuthorityProofResolver,
  ) {}

  scopeFor(context: RequestContext): ClosingScope {
    if (context.workspaceId === undefined || context.dealId === undefined) {
      throw new ClosingRequestError(
        "Closing commands require workspace and deal scope; expected an authenticated deal context.",
      );
    }
    return {
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      dealId: context.dealId,
    };
  }

  validateActor(authenticated: ClosingAuthenticatedContext): ActorReference {
    if (authenticated.actor.id === authenticated.context.actorId) {
      return authenticated.actor;
    }
    throw new ClosingRequestError(
      `Authenticated actor "${authenticated.context.actorId}" does not match the supplied actor reference; expected one identity.`,
    );
  }

  commandInput(
    authenticated: ClosingAuthenticatedContext,
    workspaceId: string,
    expectedVersion: AggregateVersion,
    idempotencyKey: IdempotencyKey,
  ): ClosingCommandInput {
    return {
      scope: this.scopeFor(authenticated.context),
      workspaceId,
      actor: this.validateActor(authenticated),
      expectedVersion,
      idempotencyKey,
    };
  }

  authorityCommandInput(
    authenticated: ClosingAuthenticatedContext,
    workspaceId: string,
    expectedVersion: AggregateVersion,
    idempotencyKey: IdempotencyKey,
    protectedCommand: unknown,
  ): ClosingAuthorityCommandInput {
    return {
      ...this.commandInput(
        authenticated,
        workspaceId,
        expectedVersion,
        idempotencyKey,
      ),
      authority: {
        protectedCommand,
        resolver: this.authorityResolver,
      },
    };
  }

  command<TResult>(
    authenticated: ClosingAuthenticatedContext,
    workspaceId: string,
    expectedVersion: AggregateVersion,
    idempotencyKey: IdempotencyKey,
    operation: (input: ClosingCommandInput) => Promise<TResult>,
  ): Promise<TResult> {
    return operation(
      this.commandInput(
        authenticated,
        workspaceId,
        expectedVersion,
        idempotencyKey,
      ),
    );
  }

  authorizedCommand<TResult>(
    authenticated: ClosingAuthenticatedContext,
    workspaceId: string,
    expectedVersion: AggregateVersion,
    idempotencyKey: IdempotencyKey,
    protectedCommand: unknown,
    operation: (input: ClosingAuthorityCommandInput) => Promise<TResult>,
  ): Promise<TResult> {
    return operation(
      this.authorityCommandInput(
        authenticated,
        workspaceId,
        expectedVersion,
        idempotencyKey,
        protectedCommand,
      ),
    );
  }

  read(
    authenticated: ClosingAuthenticatedContext,
    workspaceId: string,
  ): Promise<ClosingWorkspace | undefined> {
    return this.service.getWorkspace(
      this.scopeFor(authenticated.context),
      workspaceId,
    );
  }

  create(
    authenticated: ClosingAuthenticatedContext,
    closingWorkspaceId: string,
    idempotencyKey: IdempotencyKey,
    confirmationEnabled?: boolean,
  ): Promise<ClosingCommandResult> {
    return this.service.createWorkspace({
      scope: this.scopeFor(authenticated.context),
      closingWorkspaceId,
      actor: this.validateActor(authenticated),
      idempotencyKey,
      confirmationEnabled,
    });
  }
}

export function success(
  value: ClosingCommandResult | {
    readonly workspace: unknown;
    readonly replayed: boolean;
  },
  correlationId: CorrelationId,
  status: number,
): Response {
  const workspace = value.workspace as { readonly version: number };
  return Response.json(createSuccessEnvelope(value, { correlationId }), {
    status,
    headers: responseHeaders(correlationId, formatEtag(workspace.version)),
  });
}

export function errorResponse(
  error: unknown,
  correlationId: CorrelationId,
): Response {
  if (error instanceof ClosingError && error.code === "PROTECTED_NOT_FOUND") {
    return Response.json(createProtectedNotFoundError(correlationId), {
      status: 404,
      headers: responseHeaders(correlationId),
    });
  }
  const code = apiErrorCode(error);
  const message = error instanceof Error
    ? error.message
    : "Closing request failed; expected a valid command.";
  const body = code === "VALIDATION_FAILED"
    ? createApiError({
      code,
      message,
      correlationId,
      retryable: false,
      fieldErrors: {
        request: [{ field: "request", code: "INVALID_TYPE", message }],
      },
    })
    : createApiError({ code, message, correlationId, retryable: false });
  return Response.json(body, {
    status: API_ERROR_CATALOG[code].httpStatus,
    headers: responseHeaders(correlationId),
  });
}

export function correlationFromRequest(request: Request): CorrelationId {
  const value = request.headers.get("X-Correlation-Id");
  return value !== null && /^cor_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value as CorrelationId
    : "cor_closing" as CorrelationId;
}

export function responseHeaders(
  correlationId: CorrelationId,
  etag?: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
    ...(etag === undefined ? {} : { ETag: etag }),
  };
}

function apiErrorCode(
  error: unknown,
):
  | "VALIDATION_FAILED"
  | "ACTION_FORBIDDEN"
  | "STALE_VERSION"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_TRANSITION" {
  if (
    error instanceof ClosingRequestError || !(error instanceof ClosingError)
  ) {
    return "VALIDATION_FAILED";
  }
  if (error.code === "IDEMPOTENCY_CONFLICT") return "IDEMPOTENCY_CONFLICT";
  if (error.code === "STALE_VERSION") return "STALE_VERSION";
  if (
    error.code === "INVALID_TRANSITION" ||
    error.code === "PREREQUISITE_BLOCKED"
  ) return "INVALID_TRANSITION";
  if (
    error.code === "SCOPE_MISMATCH" ||
    error.code === "HUMAN_AUTHORITY_REQUIRED" ||
    error.code === "SEPARATION_OF_DUTIES" ||
    error.code === "IRREVERSIBLE_CONFIRMATION"
  ) return "ACTION_FORBIDDEN";
  return "VALIDATION_FAILED";
}
