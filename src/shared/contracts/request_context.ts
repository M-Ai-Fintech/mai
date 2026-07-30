import {
  type ActorId,
  type CorrelationId,
  type DealId,
  parseActorId,
  parseCorrelationId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
  type TenantId,
  type WorkspaceId,
} from "./identifiers.ts";

export type RequestOrigin = "http" | "job" | "internal";

export interface RequestContext {
  readonly actorId: ActorId;
  readonly tenantId: TenantId;
  readonly correlationId: CorrelationId;
  readonly origin: RequestOrigin;
  readonly workspaceId?: WorkspaceId;
  readonly dealId?: DealId;
}

export type ContextIssueCode =
  | "INVALID_CONTEXT"
  | "MISSING_ACTOR"
  | "MISSING_TENANT"
  | "MISSING_CORRELATION"
  | "INVALID_ACTOR_ID"
  | "INVALID_TENANT_ID"
  | "INVALID_WORKSPACE_ID"
  | "INVALID_DEAL_ID"
  | "INVALID_CORRELATION_ID"
  | "INVALID_ORIGIN"
  | "DEAL_REQUIRES_WORKSPACE";

export type ContextParseResult =
  | { readonly ok: true; readonly value: RequestContext }
  | { readonly ok: false; readonly issue: { readonly code: ContextIssueCode } };

/**
 * Parses data-only request scope without loading identities or evaluating policy.
 *
 * @example parseRequestContext({ actorId: "actor_a", tenantId: "tenant_t", correlationId: "cor_c", origin: "http" })
 */
export function parseRequestContext(value: unknown): ContextParseResult {
  if (!isRecord(value)) return contextFailure("INVALID_CONTEXT");
  if (value.actorId === undefined) return contextFailure("MISSING_ACTOR");
  if (value.tenantId === undefined) return contextFailure("MISSING_TENANT");
  if (value.correlationId === undefined) {
    return contextFailure("MISSING_CORRELATION");
  }
  if (value.dealId !== undefined && value.workspaceId === undefined) {
    return contextFailure("DEAL_REQUIRES_WORKSPACE");
  }
  return parsedRequestContext(value);
}

function parsedRequestContext(
  value: Record<string, unknown>,
): ContextParseResult {
  const actor = parseActorId(value.actorId);
  const tenant = parseTenantId(value.tenantId);
  const correlation = parseCorrelationId(value.correlationId);
  if (!actor.ok) return contextFailure("INVALID_ACTOR_ID");
  if (!tenant.ok) return contextFailure("INVALID_TENANT_ID");
  if (!correlation.ok) return contextFailure("INVALID_CORRELATION_ID");
  const origin = value.origin;
  if (!isRequestOrigin(origin)) return contextFailure("INVALID_ORIGIN");
  return parsedOptionalScope(
    value,
    actor.value,
    tenant.value,
    correlation.value,
    origin,
  );
}

function parsedOptionalScope(
  value: Record<string, unknown>,
  actorId: ActorId,
  tenantId: TenantId,
  correlationId: CorrelationId,
  origin: RequestOrigin,
): ContextParseResult {
  const workspace = value.workspaceId === undefined
    ? undefined
    : parseWorkspaceId(value.workspaceId);
  const deal = value.dealId === undefined
    ? undefined
    : parseDealId(value.dealId);
  if (workspace !== undefined && !workspace.ok) {
    return contextFailure("INVALID_WORKSPACE_ID");
  }
  if (deal !== undefined && !deal.ok) return contextFailure("INVALID_DEAL_ID");
  return {
    ok: true,
    value: {
      actorId,
      tenantId,
      correlationId,
      origin,
      ...(workspace === undefined ? {} : { workspaceId: workspace.value }),
      ...(deal === undefined ? {} : { dealId: deal.value }),
    },
  };
}

function contextFailure(code: ContextIssueCode): ContextParseResult {
  return { ok: false, issue: { code } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRequestOrigin(value: unknown): value is RequestOrigin {
  return value === "http" || value === "job" || value === "internal";
}
