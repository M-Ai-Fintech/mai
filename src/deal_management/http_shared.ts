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

export class RequestInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestInputError";
  }
}

export class DealAuthenticationError extends Error {
  constructor(message = "Authentication failed.") {
    super(message);
    this.name = "DealAuthenticationError";
  }
}

export function routeSegments(urlValue: string): readonly string[] | undefined {
  const pathname = new URL(urlValue).pathname;
  if (!pathname.startsWith("/api/v1/")) return undefined;
  return pathname.slice("/api/v1/".length).split("/").filter(Boolean);
}

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

export function requiredIdempotency(request: Request): IdempotencyKey {
  const parsed = parseIdempotencyHeader(request.headers.get("Idempotency-Key"));
  if (parsed.ok) return parsed.value;
  throw new RequestInputError(
    "Idempotency-Key must be a canonical idempotency key.",
  );
}

export function requiredIfMatch(request: Request): number {
  const parsed = parseIfMatch(request.headers.get("If-Match"));
  if (parsed.ok) return parsed.value;
  throw new RequestInputError(
    'If-Match must be a strong aggregate ETag such as "v1".',
  );
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
  if (isRecord(value)) return value;
  throw new RequestInputError("request body must be a JSON object.");
}

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

export function requiredString(
  body: Record<string, unknown>,
  fieldName: string,
): string {
  const value = body[fieldName];
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new RequestInputError(
    `${fieldName} is required and must be a non-empty string.`,
  );
}

export function optionalString(
  body: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = body[fieldName];
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim().length > 0) return value;
  throw new RequestInputError(
    `${fieldName} must be a non-empty string when supplied.`,
  );
}

export function requiredNumber(
  body: Record<string, unknown>,
  fieldName: string,
): number {
  const value = body[fieldName];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new RequestInputError(`${fieldName} must be a finite number.`);
}

export function requiredBoolean(
  body: Record<string, unknown>,
  fieldName: string,
): boolean {
  const value = body[fieldName];
  if (typeof value === "boolean") return value;
  throw new RequestInputError(`${fieldName} must be a boolean.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type { ActorId };
