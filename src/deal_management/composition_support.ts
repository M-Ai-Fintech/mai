import pg from "pg";
import {
  auditEventDigest,
  type AuditEventDraft,
  type AuditEventId,
  type AuditFieldClassification,
  type AuditPayload,
  type AuditPayloadValue,
} from "../audit_activity/v1.ts";
import {
  type AuthenticatedPrincipal,
  IdentityAccessError,
} from "../identity_access/v1.ts";
import type { AuthenticationPort } from "../identity_access/v1.ts";
import type { AllowedAuthorizationDecision } from "../platform/authz/v1.ts";
import type { CorrelationId } from "../platform/api/v1.ts";
import type {
  DealAuditEventFactory,
  DealClock,
  DealCommandContext,
  DealEvent,
} from "./contracts.ts";
import {
  authorityConstraintId,
  dealEventId,
  dealId,
  type DealIdFactory,
  dealPartyId,
  dealRoleId,
  mandateId,
} from "./ids.ts";
import type {
  DealAuthenticatedPrincipal,
  DealAuthenticationPort,
} from "./http_shared.ts";
import {
  DealAuthenticationError,
  DealAuthenticationUnavailableError as UnavailableAuthentication,
} from "./http_shared.ts";
import type {
  DealManagementCompositionConfig,
  DealManagementCompositionResult,
} from "./composition.ts";

const DEFAULT_MAX_POOL_SIZE = 10;
const SAFE_DATABASE_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

/**
 * Adapts the approved Identity Access authentication port to Deal HTTP.
 *
 * @example const authentication = new IdentityAccessDealAuthentication(port)
 */
export class IdentityAccessDealAuthentication
  implements DealAuthenticationPort {
  constructor(private readonly provider: AuthenticationPort) {}

  async authenticate(input: {
    readonly credential: string;
    readonly request: Request;
    readonly correlationId: CorrelationId;
  }): Promise<DealAuthenticatedPrincipal> {
    const principal = await authenticateProvider(
      this.provider,
      input.credential,
    );
    return verifiedPrincipal(principal);
  }
}

/**
 * Converts Deal events into classified, digest-protected Audit Activity drafts.
 *
 * @example const audit = new DealAuditEventFactoryAdapter()
 */
export class DealAuditEventFactoryAdapter implements DealAuditEventFactory {
  async create(input: {
    readonly context: DealCommandContext;
    readonly event: DealEvent;
    readonly authorization: AllowedAuthorizationDecision;
  }): Promise<AuditEventDraft> {
    const draft = auditDraft(input, auditPayload(input.event.payload));
    return { ...draft, contentDigest: await auditEventDigest(draft) };
  }
}

/**
 * Validates process-scoped persistence settings before constructing a pool.
 *
 * @example const unavailable = validateCompositionConfig(config)
 */
export function validateCompositionConfig(
  config: DealManagementCompositionConfig,
): DealManagementCompositionResult | undefined {
  if (config.pool === undefined && config.databaseUrl === undefined) {
    return loadUnavailable(
      "missing_configuration",
      "Deal Management persistence is missing; expected an injected pool or database URL.",
    );
  }
  if (
    config.poolMax !== undefined &&
    (!Number.isSafeInteger(config.poolMax) || config.poolMax < 1)
  ) {
    return loadUnavailable(
      "invalid_configuration",
      `Deal Management poolMax "${config.poolMax}" is invalid; expected a positive safe integer.`,
    );
  }
  if (config.databaseUrl !== undefined) {
    const error = databaseUrlError(config.databaseUrl);
    if (error !== undefined) {
      return loadUnavailable("invalid_configuration", error);
    }
  }
  return undefined;
}

/**
 * Creates or reuses the one process-scoped PostgreSQL pool for composition.
 *
 * @example const pool = createPool({ ...config, pool: injectedPool })
 */
export function createPool(
  config: DealManagementCompositionConfig,
): PoolResult {
  if (config.pool !== undefined) {
    return { kind: "configured", pool: config.pool };
  }
  if (config.databaseUrl === undefined) {
    return unavailablePool(
      "missing_configuration",
      "Deal Management persistence is missing; expected a validated database URL.",
    );
  }
  return {
    kind: "configured",
    pool: new pg.Pool({
      connectionString: config.databaseUrl,
      max: config.poolMax ?? DEFAULT_MAX_POOL_SIZE,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
    }),
  };
}

export type PoolResult =
  | { readonly kind: "configured"; readonly pool: pg.Pool }
  | {
    readonly kind: "unavailable";
    readonly reason: "missing_configuration" | "invalid_configuration";
    readonly message: string;
  };

/**
 * Provides the default wall-clock implementation for composed services.
 *
 * @example const clock = systemClock()
 */
export function systemClock(): DealClock {
  return { now: () => new Date().toISOString() };
}

/**
 * Generates a correlation identifier for requests without a supplied header.
 *
 * @example const correlationId = randomCorrelationId()
 */
export function randomCorrelationId(): CorrelationId {
  return `cor_${crypto.randomUUID().replaceAll("-", "")}` as CorrelationId;
}

/**
 * Creates production-safe opaque Deal aggregate identifier factories.
 *
 * @example const ids = randomDealIds()
 */
export function randomDealIds(): DealIdFactory {
  const next = (prefix: string): string =>
    `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
  return {
    nextDealId: () => dealId(next("deal")),
    nextDealPartyId: () => dealPartyId(next("party")),
    nextDealRoleId: () => dealRoleId(next("dealrole")),
    nextMandateId: () => mandateId(next("mandate")),
    nextAuthorityConstraintId: () => authorityConstraintId(next("constraint")),
    nextEventId: () => dealEventId(next("event")),
  };
}

function authenticateProvider(
  provider: AuthenticationPort,
  credential: string,
): Promise<AuthenticatedPrincipal> {
  return provider.authenticate({ credential }).catch((error: unknown) => {
    throw mapAuthenticationFailure(error);
  });
}

function mapAuthenticationFailure(error: unknown): Error {
  if (
    error instanceof IdentityAccessError &&
    error.code === "AUTHENTICATION_FAILED"
  ) {
    return new DealAuthenticationError(error.message);
  }
  return new UnavailableAuthentication(
    "Identity Access authentication dependency is unavailable; expected a provider response.",
  );
}

function verifiedPrincipal(
  principal: AuthenticatedPrincipal,
): DealAuthenticatedPrincipal {
  if (principal.workspaceId === undefined) {
    throw new DealAuthenticationError(
      `Authenticated actor "${principal.actor.id}" has no verified workspace; expected Identity Access to provide tenant and workspace scope.`,
    );
  }
  return {
    actor: principal.actor,
    tenantId: principal.tenantId,
    workspaceId: principal.workspaceId,
  };
}

function databaseUrlError(value: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Deal Management database URL is invalid; expected a postgres:// or postgresql:// URL with a database name.";
  }
  if (
    !SAFE_DATABASE_PROTOCOLS.has(parsed.protocol) ||
    parsed.hostname.length === 0 || parsed.pathname.length <= 1
  ) {
    return `Deal Management database URL "${
      safeUrl(value)
    }" is invalid; expected postgres://host/database with a non-empty database name.`;
  }
  return undefined;
}

function safeUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.hostname}${
      parsed.port.length === 0 ? "" : `:${parsed.port}`
    }${parsed.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

/**
 * Returns a typed fail-closed composition result without constructing defaults.
 *
 * @example return loadUnavailable("missing_configuration", "database is absent")
 */
export function loadUnavailable(
  reason: "missing_configuration" | "invalid_configuration",
  message: string,
): DealManagementCompositionResult {
  return { kind: "unavailable", reason, message };
}

function unavailablePool(
  reason: "missing_configuration" | "invalid_configuration",
  message: string,
): PoolResult {
  return { kind: "unavailable", reason, message };
}

function auditDraft(
  input: {
    readonly context: DealCommandContext;
    readonly event: DealEvent;
    readonly authorization: AllowedAuthorizationDecision;
  },
  payload: AuditPayload,
): AuditEventDraft {
  const event = input.event;
  const actorKind = auditActorKind(input.context.actor.kind);
  return {
    ...auditIdentity(input, actorKind),
    authoritySnapshot: auditAuthoritySnapshot(input, actorKind),
    evidenceSnapshot: { capturedAt: event.occurredAt, references: [] },
    provenance: auditProvenance(input, actorKind),
    payload,
    classifications: auditClassifications(payload),
    contentDigest: "",
    occurredAt: event.occurredAt,
  };
}

function auditIdentity(
  input: {
    readonly context: DealCommandContext;
    readonly event: DealEvent;
  },
  actorKind: "human" | "agent" | "system",
): Pick<
  AuditEventDraft,
  | "eventId"
  | "tenantId"
  | "workspaceId"
  | "dealId"
  | "actorId"
  | "actorKind"
  | "origin"
  | "correlationId"
  | "aggregateType"
  | "aggregateId"
  | "aggregateVersion"
  | "eventType"
  | "schemaVersion"
> {
  const event = input.event;
  return {
    eventId: event.eventId as unknown as AuditEventId,
    tenantId: event.tenantId,
    workspaceId: event.workspaceId,
    dealId: event.dealId,
    actorId: input.context.actor.id,
    actorKind,
    origin: input.context.request.origin,
    correlationId: event.correlationId,
    aggregateType: "deal",
    aggregateId: event.dealId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: 1,
  };
}

function auditAuthoritySnapshot(
  input: {
    readonly context: DealCommandContext;
    readonly event: DealEvent;
    readonly authorization: AllowedAuthorizationDecision;
  },
  actorKind: "human" | "agent" | "system",
): AuditEventDraft["authoritySnapshot"] {
  const event = input.event;
  return {
    snapshotId: String(
      input.authorization.authoritySnapshotReference ?? "deal-authz-v1",
    ),
    actorId: input.context.actor.id,
    actorKind,
    policyVersion: authorizationPolicyVersion(input.authorization),
    scope: {
      tenantId: event.tenantId,
      workspaceId: event.workspaceId,
      dealId: event.dealId,
    },
    capturedAt: event.occurredAt,
  };
}

function auditProvenance(
  input: { readonly context: DealCommandContext },
  actorKind: "human" | "agent" | "system",
): AuditEventDraft["provenance"] {
  return {
    actorId: input.context.actor.id,
    actorKind,
    origin: input.context.request.origin,
  };
}

function authorizationPolicyVersion(
  decision: AllowedAuthorizationDecision,
): string {
  const scope = decision.approvedScope as
    | { readonly policyVersion?: string }
    | undefined;
  return scope?.policyVersion ?? "authz-v1";
}

function auditPayload(value: Readonly<Record<string, unknown>>): AuditPayload {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      auditPayloadValue(item, key),
    ]),
  ) as AuditPayload;
}

function auditPayloadValue(value: unknown, path: string): AuditPayloadValue {
  if (
    value === null || typeof value === "boolean" || typeof value === "string"
  ) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      auditPayloadValue(item, `${path}[${index}]`)
    );
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map((
        [key, item],
      ) => [key, auditPayloadValue(item, `${path}.${key}`)]),
    );
  }
  throw new Error(
    `Audit payload field "${path}" is invalid; expected JSON-safe values.`,
  );
}

function auditClassifications(
  payload: AuditPayload,
): Readonly<Record<string, AuditFieldClassification>> {
  return Object.fromEntries(
    Object.keys(payload).map((key) => [key, "internal"]),
  ) as unknown as Readonly<Record<string, AuditFieldClassification>>;
}

function auditActorKind(
  kind: "human" | "ai" | "service" | "external",
): "human" | "agent" | "system" {
  if (kind === "human") return "human";
  if (kind === "ai") return "agent";
  return "system";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
