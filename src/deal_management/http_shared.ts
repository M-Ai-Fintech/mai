import {
  type CorrelationId,
  createApiError,
  type IdempotencyKey,
  parseCorrelationHeader,
  parseIdempotencyHeader,
  parseIfMatch,
} from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { ActorId, TenantId, WorkspaceId } from "../platform/api/v1.ts";
import type { DealCommandContext } from "./contracts.ts";
import type { DealManagementService } from "./service.ts";
import type { DealAuthorizationPort } from "./contracts.ts";
import type { DealRepository } from "./repository.ts";

export interface DealAuthenticatedPrincipal {
  readonly actor: ActorReference;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
}

export interface DealAuthenticationPort {
  authenticate(input: {
    readonly credential: string;
    readonly request: Request;
    readonly correlationId: CorrelationId;
  }): Promise<DealAuthenticatedPrincipal> | DealAuthenticatedPrincipal;
}

export interface DealManagementHttpDependencies {
  readonly authentication: DealAuthenticationPort;
  readonly authorization: DealAuthorizationPort;
  readonly repository: DealRepository;
  readonly service: DealManagementService;
  readonly now: () => string;
  readonly nextCorrelationId: () => CorrelationId;
}

/**
 * Represents a safe request validation failure at the HTTP boundary.
 *
 * @example throw new RequestInputError("name received undefined; expected a string")
 */
export class RequestInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestInputError";
  }
}

/**
 * Represents invalid or absent credential proof.
 *
 * @example throw new DealAuthenticationError("Authentication is required.")
 */
export class DealAuthenticationError extends Error {
  constructor(message = "Authentication failed.") {
    super(message);
    this.name = "DealAuthenticationError";
  }
}

/**
 * Represents an unavailable authentication provider dependency.
 *
 * @example throw new DealAuthenticationUnavailableError()
 */
export class DealAuthenticationUnavailableError extends Error {
  constructor(message = "Authentication provider is unavailable.") {
    super(message);
    this.name = "DealAuthenticationUnavailableError";
  }
}

/**
 * Extracts API v1 route segments without exposing non-API paths.
 *
 * @example const segments = routeSegments(request.url)
 */
export function routeSegments(urlValue: string): readonly string[] | undefined {
  const pathname = new URL(urlValue).pathname;
  if (!pathname.startsWith("/api/v1/")) return undefined;
  return pathname.slice("/api/v1/".length).split("/").filter(Boolean);
}

/**
 * Validates or generates a request correlation identifier.
 *
 * @example const correlation = requestCorrelation(request, dependencies)
 */
export function requestCorrelation(
  request: Request,
  dependencies: DealManagementHttpDependencies | undefined,
): { readonly kind: "ok"; readonly value: CorrelationId } | {
  readonly kind: "error";
  readonly response: ReturnType<typeof createApiError>;
} {
  const header = request.headers.get("X-Correlation-Id");
  if (header === null && dependencies !== undefined) {
    return { kind: "ok", value: dependencies.nextCorrelationId() };
  }
  const parsed = parseCorrelationHeader(header);
  if (parsed.ok) return { kind: "ok", value: parsed.value };
  const fallback = dependencies?.nextCorrelationId() ??
    "cor_invalid" as CorrelationId;
  return invalidCorrelation(header, fallback);
}

function invalidCorrelation(header: string | null, fallback: CorrelationId) {
  const message = `X-Correlation-Id received ${
    safeInput(header)
  }; expected a canonical correlation identifier.`;
  return {
    kind: "error" as const,
    response: createApiError({
      code: "VALIDATION_FAILED",
      message,
      correlationId: fallback,
      retryable: false,
      fieldErrors: {
        "X-Correlation-Id": [{
          field: "X-Correlation-Id",
          code: "INVALID_TYPE",
          message,
        }],
      },
    }),
  };
}

/**
 * Requires the canonical idempotency header used by Deal commands.
 *
 * @example const key = requiredIdempotency(request)
 */
export function requiredIdempotency(request: Request): IdempotencyKey {
  const received = request.headers.get("Idempotency-Key");
  const parsed = parseIdempotencyHeader(received);
  if (parsed.ok) return parsed.value;
  throw new RequestInputError(
    `Idempotency-Key received ${
      safeInput(received)
    }; expected a canonical idempotency key.`,
  );
}

/**
 * Requires a strong aggregate version from the If-Match header.
 *
 * @example const version = requiredIfMatch(request)
 */
export function requiredIfMatch(request: Request): number {
  const received = request.headers.get("If-Match");
  const parsed = parseIfMatch(received);
  if (parsed.ok) return parsed.value;
  throw new RequestInputError(
    `If-Match received ${
      safeInput(received)
    }; expected a strong aggregate ETag such as "v1".`,
  );
}

/**
 * Parses a JSON object body and rejects non-object input.
 *
 * @example const body = await readBody(request)
 */
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RequestInputError(
      "request body could not be parsed as JSON; expected a JSON object.",
    );
  }
  if (isRecord(value)) return value;
  throw new RequestInputError(
    `request body received ${safeInput(value)}; expected a JSON object.`,
  );
}

/**
 * Builds the scoped command context from a verified principal.
 *
 * @example const context = createDealContext(principal, correlationId, now)
 */
export function createDealContext(
  principal: DealAuthenticatedPrincipal,
  correlationId: CorrelationId,
  now: string,
): DealCommandContext {
  const request = {
    actorId: principal.actor.id as ActorId,
    tenantId: principal.tenantId,
    workspaceId: principal.workspaceId,
    correlationId,
    origin: "http" as const,
  };
  return { actor: principal.actor, request, now };
}

/**
 * Reads a required non-empty string field from a request body.
 *
 * @example const name = requiredString(body, "name")
 */
export function requiredString(
  body: Record<string, unknown>,
  fieldName: string,
): string {
  const value = body[fieldName];
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new RequestInputError(
    `${fieldName} received ${safeInput(value)}; expected a non-empty string.`,
  );
}

/**
 * Reads an optional non-empty string field from a request body.
 *
 * @example const label = optionalString(body, "label")
 */
export function optionalString(
  body: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = body[fieldName];
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new RequestInputError(
    `${fieldName} received ${
      safeInput(value)
    }; expected a non-empty string when supplied.`,
  );
}

/**
 * Reads a required finite numeric field from a request body.
 *
 * @example const authority = requiredNumber(body, "authorityLevel")
 */
export function requiredNumber(
  body: Record<string, unknown>,
  fieldName: string,
): number {
  const value = body[fieldName];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new RequestInputError(
    `${fieldName} received ${safeInput(value)}; expected a finite number.`,
  );
}

/**
 * Reads a required boolean field from a request body.
 *
 * @example const humanOnly = requiredBoolean(body, "humanOnly")
 */
export function requiredBoolean(
  body: Record<string, unknown>,
  fieldName: string,
): boolean {
  const value = body[fieldName];
  if (typeof value === "boolean") return value;
  throw new RequestInputError(
    `${fieldName} received ${safeInput(value)}; expected a boolean.`,
  );
}

function safeInput(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return `<${Array.isArray(value) ? "array" : typeof value}>`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type { ActorId };
