import type { ActorReference } from "../../platform/authz/v1.ts";
import {
  type AggregateVersion,
  API_ERROR_CATALOG,
  createApiError,
  createProtectedNotFoundError,
  createSuccessEnvelope,
  formatEtag,
  type IdempotencyKey,
  parseIdempotencyHeader,
  parseIfMatch,
  type RequestContext,
} from "../../platform/api/v1.ts";
import type { AuthorityProofResolver } from "../../work_management/authority_proof.ts";
import {
  type NegotiationAuthorityCommandInput,
  type NegotiationCommandInput,
  type NegotiationCommandResult,
  NegotiationError,
  type NegotiationScope,
  type NegotiationService,
} from "../../negotiation/v1.ts";
import {
  assertExternalRoundSafe,
  toExternalRound,
} from "../../negotiation/v1.ts";
import { parseNormalizedTermsInput } from "../../negotiation/terms.ts";

export interface NegotiationAuthenticatedContext {
  readonly context: RequestContext;
  readonly actor: ActorReference;
}

export interface NegotiationContextPort {
  contextFor(
    request: Request,
  ): Promise<NegotiationAuthenticatedContext> | NegotiationAuthenticatedContext;
}

export interface NegotiationV1RouteDependencies {
  readonly context: NegotiationContextPort;
  readonly application: NegotiationV1Application;
}

export class NegotiationRequestError extends Error {
  readonly code = "VALIDATION_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "NegotiationRequestError";
  }
}

export class NegotiationV1Application {
  constructor(
    readonly service: NegotiationService,
    private readonly authorityResolver: AuthorityProofResolver,
  ) {}

  scopeFor(context: RequestContext): NegotiationScope {
    if (context.workspaceId === undefined || context.dealId === undefined) {
      throw new NegotiationRequestError(
        "Negotiation routes require authenticated workspace and deal scope.",
      );
    }
    return {
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      dealId: context.dealId,
    };
  }

  validateActor(
    authenticated: NegotiationAuthenticatedContext,
  ): ActorReference {
    if (authenticated.actor.id === authenticated.context.actorId) {
      return authenticated.actor;
    }
    throw new NegotiationError(
      "SCOPE_MISMATCH",
      "Authenticated actor does not match the supplied actor reference.",
    );
  }

  commandInput(
    authenticated: NegotiationAuthenticatedContext,
    roundId: string,
    expectedVersion: AggregateVersion,
    idempotencyKey: IdempotencyKey,
  ): NegotiationCommandInput {
    return {
      context: authenticated.context,
      scope: this.scopeFor(authenticated.context),
      roundId,
      actor: this.validateActor(authenticated),
      expectedVersion,
      idempotencyKey,
    };
  }

  authorityCommandInput(
    authenticated: NegotiationAuthenticatedContext,
    roundId: string,
    expectedVersion: AggregateVersion,
    idempotencyKey: IdempotencyKey,
    protectedCommand: unknown,
    expectedProposalVersion?: AggregateVersion,
  ): NegotiationAuthorityCommandInput {
    return {
      ...this.commandInput(
        authenticated,
        roundId,
        expectedVersion,
        idempotencyKey,
      ),
      authority: { protectedCommand, resolver: this.authorityResolver },
      ...(expectedProposalVersion === undefined
        ? {}
        : { expectedProposalVersion }),
    };
  }

  read(authenticated: NegotiationAuthenticatedContext, roundId: string) {
    return this.service.getRound({
      context: authenticated.context,
      scope: this.scopeFor(authenticated.context),
      roundId,
      actor: this.validateActor(authenticated),
    });
  }
}

export function success(
  value: NegotiationCommandResult | {
    readonly round: unknown;
    readonly replayed: boolean;
  },
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
  status: number,
): Response {
  const round = value
    .round as import("../../negotiation/v1.ts").NegotiationRound;
  const external = toExternalRound(round);
  assertExternalRoundSafe(external);
  const projected = { round: external, replayed: value.replayed };
  return Response.json(createSuccessEnvelope(projected, { correlationId }), {
    status,
    headers: responseHeaders(correlationId, formatEtag(round.version)),
  });
}

export function externalSuccess(
  round: import("../../negotiation/v1.ts").NegotiationRound,
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
): Response {
  const external = toExternalRound(round);
  assertExternalRoundSafe(external);
  return Response.json(
    createSuccessEnvelope({ round: external }, { correlationId }),
    {
      status: 200,
      headers: responseHeaders(correlationId, formatEtag(round.version)),
    },
  );
}

export function errorResponse(
  error: unknown,
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
): Response {
  if (
    error instanceof NegotiationError && error.code === "PROTECTED_NOT_FOUND"
  ) {
    return Response.json(createProtectedNotFoundError(correlationId), {
      status: 404,
      headers: responseHeaders(correlationId),
    });
  }
  const code = apiErrorCode(error);
  const message = error instanceof Error
    ? error.message
    : "Negotiation request failed; expected a valid command.";
  return Response.json(
    createApiError({
      code,
      message,
      correlationId,
      retryable: false,
      ...(code === "VALIDATION_FAILED"
        ? {
          fieldErrors: {
            request: [{ field: "request", code: "INVALID_TYPE", message }],
          },
        }
        : {}),
    } as never),
    {
      status: API_ERROR_CATALOG[code].httpStatus,
      headers: responseHeaders(correlationId),
    },
  );
}

export function correlationFromRequest(request: Request) {
  const value = request.headers.get("X-Correlation-Id");
  return value !== null && /^cor_[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value as import("../../platform/api/v1.ts").CorrelationId
    : "cor_negotiation" as import("../../platform/api/v1.ts").CorrelationId;
}

export function responseHeaders(
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
  etag?: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
    ...(etag === undefined ? {} : { ETag: etag }),
  };
}

export function requiredIdempotency(request: Request): IdempotencyKey {
  const parsed = parseIdempotencyHeader(request.headers.get("Idempotency-Key"));
  if (parsed.ok) return parsed.value;
  throw new NegotiationRequestError(
    "Negotiation mutations require a valid Idempotency-Key header.",
  );
}

export function requiredIfMatch(request: Request): AggregateVersion {
  const parsed = parseIfMatch(request.headers.get("If-Match"));
  if (parsed.ok) return parsed.value;
  throw new NegotiationRequestError(
    "Negotiation mutations require one strong If-Match header.",
  );
}

export async function jsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new NegotiationRequestError(
      "Negotiation request body must be valid JSON.",
    );
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new NegotiationRequestError(
      "Negotiation request body must be a JSON object.",
    );
  }
  rejectProtectedFields(value as Record<string, unknown>);
  return value as Record<string, unknown>;
}

export function requiredString(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = body[field];
  if (
    typeof value === "string" && value.trim().length > 0 && value.length <= 256
  ) return value;
  throw new NegotiationRequestError(
    `Negotiation field "${field}" must be bounded non-empty text.`,
  );
}

export function requiredNumber(
  body: Record<string, unknown>,
  field: string,
): number {
  const value = body[field];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new NegotiationRequestError(
    `Negotiation field "${field}" must be a finite number.`,
  );
}

export function requiredObject(
  body: Record<string, unknown>,
  field: string,
): Record<string, unknown> {
  const value = body[field];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new NegotiationRequestError(
    `Negotiation field "${field}" must be a JSON object.`,
  );
}

export function requiredTerms(
  body: Record<string, unknown>,
): Parameters<
  typeof import("../../negotiation/terms.ts").createNormalizedTerms
>[0] {
  const terms = requiredObject(body, "terms");
  try {
    return parseNormalizedTermsInput(terms);
  } catch (error) {
    throw new NegotiationRequestError(
      error instanceof Error ? error.message : "Negotiation terms are invalid.",
    );
  }
}

export function protectedCommand(body: Record<string, unknown>): unknown {
  const value = body.protectedCommand;
  if (value === undefined) {
    throw new NegotiationRequestError(
      "Protected negotiation commands require protectedCommand.",
    );
  }
  return value;
}

function rejectProtectedFields(body: Record<string, unknown>): void {
  const forbidden = [
    "internal",
    "positions",
    "batna",
    "mandate",
    "mandateComparison",
    "strategyNotes",
    "authorityProof",
    "deliveryReceipts",
    "providerReference",
  ];
  const found = forbidden.find((field) => field in body);
  if (found !== undefined) {
    throw new NegotiationRequestError(
      `Negotiation field "${found}" is internal or protected and cannot be supplied through this external API.`,
    );
  }
}

function apiErrorCode(error: unknown):
  | "VALIDATION_FAILED"
  | "ACTION_FORBIDDEN"
  | "STALE_VERSION"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_TRANSITION"
  | "DEPENDENCY_UNAVAILABLE" {
  if (
    error instanceof NegotiationRequestError ||
    !(error instanceof NegotiationError)
  ) return "VALIDATION_FAILED";
  if (error.code === "IDEMPOTENCY_CONFLICT") return "IDEMPOTENCY_CONFLICT";
  if (error.code === "STALE_VERSION") return "STALE_VERSION";
  if (
    error.code === "INVALID_TRANSITION" || error.code === "MANDATE_VIOLATION" ||
    error.code === "MANDATE_INDETERMINATE"
  ) return "INVALID_TRANSITION";
  if (error.code === "FEATURE_DISABLED") return "DEPENDENCY_UNAVAILABLE";
  if (
    [
      "SCOPE_MISMATCH",
      "AUTHORIZATION_DENIED",
      "HUMAN_AUTHORITY_REQUIRED",
      "SEPARATION_OF_DUTIES",
      "REFERENCE_MISMATCH",
    ].includes(error.code)
  ) return "ACTION_FORBIDDEN";
  return "VALIDATION_FAILED";
}
