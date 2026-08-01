import {
  type ActorId,
  type CorrelationId,
  type IdempotencyKey,
} from "../shared/contracts/identifiers.ts";
import {
  createApiError,
  type ErrorEnvelope,
  parseCorrelationHeader,
  parseIdempotencyHeader,
  parseIfMatch,
} from "../platform/api/v1.ts";
import type { PolicyClock } from "../platform/authz/v1.ts";
import type {
  AdministrationContext,
  IdentityAccessRepository,
  SessionContext,
} from "./contracts.ts";
import type {
  AuthenticatedPrincipal,
  AuthenticationPort,
  SessionRegistry,
} from "./authentication.ts";
import { correlationId, sessionId } from "./ids.ts";
import type { IdentityAccessService } from "./service.ts";

export interface IdentityAccessHttpDependencies {
  readonly authentication: AuthenticationPort;
  readonly repository: IdentityAccessRepository;
  readonly service: IdentityAccessService;
  readonly now: () => string;
  readonly nextCorrelationId: () => CorrelationId;
  readonly nextSessionId: () => ReturnType<typeof sessionId>;
  readonly sessionRegistry?: SessionRegistry;
  readonly policyClock?: PolicyClock;
}

export interface AuthenticatedRequest {
  readonly session: SessionContext;
  readonly context: AdministrationContext;
  readonly correlationId: CorrelationId;
}

export type RouteResult =
  | { readonly kind: "ok"; readonly value: AuthenticatedRequest }
  | {
    readonly kind: "error";
    readonly response: ErrorEnvelope;
    readonly status: number;
  };

export class RequestInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestInputError";
  }
}

export function routeSegments(urlValue: string): readonly string[] | undefined {
  const pathname = new URL(urlValue).pathname;
  if (!pathname.startsWith("/api/v1/")) return undefined;
  return pathname.slice("/api/v1/".length).split("/").filter(Boolean);
}

export function requestCorrelation(
  request: Request,
  dependencies: IdentityAccessHttpDependencies | undefined,
): { readonly kind: "ok"; readonly value: CorrelationId } | {
  readonly kind: "error";
  readonly response: ErrorEnvelope;
} {
  const header = request.headers.get("X-Correlation-Id");
  if (header === null && dependencies !== undefined) {
    return { kind: "ok", value: dependencies.nextCorrelationId() };
  }
  const parsed = parseCorrelationHeader(header);
  if (parsed.ok) return { kind: "ok", value: parsed.value };
  const fallback = dependencies?.nextCorrelationId() ??
    correlationId("cor_invalid");
  return {
    kind: "error",
    response: createApiError({
      code: "VALIDATION_FAILED",
      message: "X-Correlation-Id must be a canonical correlation identifier.",
      correlationId: fallback,
      retryable: false,
      fieldErrors: {
        "X-Correlation-Id": [{
          field: "X-Correlation-Id",
          code: "INVALID_TYPE",
          message:
            "X-Correlation-Id must be a canonical correlation identifier.",
        }],
      },
    }),
  };
}

export function requiredIdempotency(
  request: Request,
  correlationIdValue: CorrelationId,
): IdempotencyKey {
  const parsed = parseIdempotencyHeader(request.headers.get("Idempotency-Key"));
  if (parsed.ok) return parsed.value;
  throw new RequestInputError(
    `idempotency header is invalid for correlation "${correlationIdValue}".`,
  );
}

export function requireIfMatch(value: string | null): number {
  const parsed = parseIfMatch(value);
  if (parsed.ok) return parsed.value;
  throw new RequestInputError("revocation requires a strong If-Match version.");
}

export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RequestInputError("request body must be valid JSON.");
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new RequestInputError("request body must be a JSON object.");
}

export function requiredString(
  body: Record<string, unknown>,
  fieldName: string,
): string {
  const value = body[fieldName];
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new RequestInputError(`${fieldName} is required.`);
}

export function optionalString(
  body: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = body[fieldName];
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new RequestInputError(`${fieldName} must be a non-empty string.`);
}

export function requiredStringArray(
  body: Record<string, unknown>,
  fieldName: string,
): readonly string[] {
  const value = body[fieldName];
  if (
    Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
  ) {
    return value;
  }
  throw new RequestInputError(`${fieldName} must contain one or more strings.`);
}

export function optionalStringArray(
  body: Record<string, unknown>,
  fieldName: string,
): readonly string[] | undefined {
  return body[fieldName] === undefined
    ? undefined
    : requiredStringArray(body, fieldName);
}

export function optionalPurpose(
  value: unknown,
): string | readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (
    Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
  ) {
    return value;
  }
  throw new RequestInputError(
    "purpose must be a string or non-empty string array.",
  );
}

export function optionalActorId(
  body: Record<string, unknown>,
  fieldName: string,
  parse: (value: string) => ActorId,
): ActorId | undefined {
  const value = optionalString(body, fieldName);
  return value === undefined ? undefined : parse(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type { AuthenticatedPrincipal };
