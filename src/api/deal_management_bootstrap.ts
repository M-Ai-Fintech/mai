import pg from "pg";
import {
  type AuthenticatedPrincipal,
  type AuthenticationPort,
  IdentityAccessError,
  sessionId,
  userIdentityId,
} from "../identity_access/v1.ts";
import {
  action,
  type AuthorizationDecision,
  evaluateAuthorization,
  field,
  type GrantFact,
  purpose,
  resourceKind,
  type RestrictionFact,
  type RoleFact,
  sponsor,
} from "../platform/authz/v1.ts";
import type {
  DealAuthorizationInput,
  DealAuthorizationPort,
} from "../deal_management/v1.ts";
import {
  createDealManagementComposition,
  type DealManagementComposition,
} from "../deal_management/composition.ts";

const DATABASE_KEYS = ["MAI106_DATABASE_URL", "DATABASE_URL"] as const;

/** Loads the executable Deal graph from repository-owned production adapters. */
export function loadExecutableDealManagement(
  environment: Readonly<Record<string, string | undefined>> = {
    MAI106_DATABASE_URL: Deno.env.get("MAI106_DATABASE_URL"),
    DATABASE_URL: Deno.env.get("DATABASE_URL"),
  },
): DealManagementComposition {
  const databaseUrl = configuredDatabaseUrl(environment);
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  const authentication = new PostgresIdentityAccessAuthentication(pool);
  const authorization = new PostgresDealAuthorization(pool);
  const result = createDealManagementComposition({
    pool,
    authentication,
    authorization,
  });
  if (result.kind === "configured") return result.composition;
  void pool.end();
  throw new Error(result.message);
}

/** Authenticates opaque Identity Access session IDs against persisted sessions. */
export class PostgresIdentityAccessAuthentication
  implements AuthenticationPort {
  constructor(private readonly pool: pg.Pool) {}

  async authenticate(
    input: { readonly credential: string },
  ): Promise<AuthenticatedPrincipal> {
    try {
      const id = parseCredential(input.credential);
      const result = await this.pool.query<SessionRow>(sessionQuery, [id]);
      if (result.rowCount !== 1) throw authenticationFailure();
      return activePrincipal(result.rows[0]);
    } catch (error) {
      if (error instanceof IdentityAccessError) throw error;
      throw authenticationFailure();
    }
  }
}

/** Evaluates Deal requests from persisted Identity Access policy facts. */
export class PostgresDealAuthorization implements DealAuthorizationPort {
  constructor(private readonly pool: pg.Pool) {}

  async authorize(
    input: DealAuthorizationInput,
  ): Promise<AuthorizationDecision> {
    try {
      const facts = await loadExactPolicyRows(this.pool, input);
      return evaluateAuthorization(authorizationRequest(input, facts));
    } catch {
      return denyAuthorization(input);
    }
  }

  async assertOperatorScope(
    input: {
      readonly sessionId: string;
      readonly identityId: string;
      readonly actorId: string;
      readonly tenantId: string;
      readonly workspaceId: string;
    },
  ): Promise<void> {
    const sessions = await this.pool.query<SessionRow>(sessionQuery, [
      input.sessionId,
    ]);
    if (sessions.rowCount !== 1) {
      throw new Error("operator session is absent or duplicated");
    }
    const principal = activePrincipal(sessions.rows[0]);
    if (
      principal.sessionId !== input.sessionId ||
      principal.identityId !== input.identityId ||
      principal.actor.id !== input.actorId ||
      principal.tenantId !== input.tenantId ||
      principal.workspaceId !== input.workspaceId
    ) throw new Error("operator session scope mismatch");
    const result = await this.pool.query(operatorScopeQuery, [
      input.tenantId,
      input.workspaceId,
      input.sessionId,
      input.identityId,
      input.actorId,
    ]);
    if (result.rowCount === 1) return;
    throw new Error(
      `Operator actor "${input.actorId}" is not active in scope "${input.tenantId}/${input.workspaceId}".`,
    );
  }
}

function authorizationRequest(
  input: DealAuthorizationInput,
  facts: readonly PolicyRow[],
): Parameters<typeof evaluateAuthorization>[0] {
  const mappedFacts = policyFacts(facts, input);
  return {
    context: input.context.request,
    actor: input.context.actor,
    scope: input.scope,
    resource: input.resource,
    action: input.action,
    requestedFields: input.requestedFields.map((requested) => ({
      ...requested,
      name: field(requested.name),
    })),
    ...mappedFacts,
    relationshipFacts: [],
    authorityRequirement: input.humanOnly
      ? { action: input.action, humanOnly: true }
      : undefined,
    clock: { now: () => new Date().toISOString() },
  };
}

function policyFacts(
  facts: readonly PolicyRow[],
  input: DealAuthorizationInput,
): Pick<
  Parameters<typeof evaluateAuthorization>[0],
  "roleFacts" | "grantFacts" | "restrictionFacts"
> {
  return {
    roleFacts: facts.filter(isRole).map((row) => roleFact(row, input)),
    grantFacts: facts.filter(isGrant).map((row) => grantFact(row, input)),
    restrictionFacts: facts.filter(isRestriction).map((row) =>
      restrictionFact(row, input)
    ),
  };
}

interface SessionRow {
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly state: string;
  readonly expiresAt: Date | string;
  readonly document: unknown;
  readonly actorId: string;
  readonly identityId: string;
}

interface PolicyRow {
  readonly kind: "role" | "grant" | "restriction";
  readonly document: Record<string, unknown>;
}

const sessionQuery =
  `SELECT aggregate_id AS "aggregateId", tenant_id AS "tenantId",
  workspace_id AS "workspaceId", state, expires_at AS "expiresAt", document
  , actor_id AS "actorId", identity_id AS "identityId"
  FROM iam.sessions WHERE aggregate_id = $1`;

const operatorScopeQuery = `SELECT 1 FROM iam.sessions s
  JOIN iam.user_identities i ON i.aggregate_id = $4
    AND i.tenant_id = s.tenant_id AND i.state = 'active'
  JOIN iam.memberships m ON m.tenant_id = i.tenant_id
    AND m.workspace_id = $2 AND m.state = 'active'
    AND m.document->>'identityId' = i.aggregate_id
  WHERE s.tenant_id = $1 AND s.workspace_id = $2 AND s.aggregate_id = $3
    AND s.actor_id = $5
    AND s.state = 'active' AND s.expires_at > NOW() LIMIT 1`;

function configuredDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const value = DATABASE_KEYS.map((key) => environment[key]).find((item) =>
    item?.trim()
  );
  if (value === undefined) {
    throw new Error(
      "API database configuration is missing; expected MAI106_DATABASE_URL or DATABASE_URL.",
    );
  }
  const protocol = new URL(value).protocol;
  if (protocol === "postgres:" || protocol === "postgresql:") return value;
  throw new Error(
    `API database URL protocol "${protocol}" is invalid; expected postgres or postgresql.`,
  );
}

function parseCredential(credential: string): string {
  const value = credential.replace(/^Bearer\s+/i, "").trim();
  try {
    return sessionId(value);
  } catch {
    throw authenticationFailure();
  }
}

function authenticationFailure(): IdentityAccessError {
  return new IdentityAccessError(
    "AUTHENTICATION_FAILED",
    "Authentication failed; expected a valid active session credential.",
  );
}

function activePrincipal(row: SessionRow): AuthenticatedPrincipal {
  const document = parseSessionDocument(row.document);
  const expiry = Date.parse(String(row.expiresAt));
  if (
    row.state !== "active" || !Number.isFinite(expiry) || expiry <= Date.now()
  ) {
    throw authenticationFailure();
  }
  if (
    document.sessionId !== row.aggregateId ||
    document.actor.id !== row.actorId ||
    document.tenantId !== row.tenantId ||
    document.workspaceId !== row.workspaceId ||
    document.identityId !== row.identityId ||
    document.state !== row.state || Date.parse(document.expiresAt) !== expiry
  ) {
    throw authenticationFailure();
  }
  if (document.actor.state !== "active" || row.workspaceId === null) {
    throw authenticationFailure();
  }
  return {
    actor: document.actor,
    sessionId: sessionId(row.aggregateId),
    identityId: userIdentityId(document.identityId),
    tenantId: row.tenantId as never,
    workspaceId: row.workspaceId as never,
  };
}

function isRole(row: PolicyRow): boolean {
  return row.kind === "role";
}
function isGrant(row: PolicyRow): boolean {
  return row.kind === "grant";
}
function isRestriction(row: PolicyRow): boolean {
  return row.kind === "restriction";
}

function roleFact(row: PolicyRow, input: DealAuthorizationInput): RoleFact {
  const document = policyDocument(row.document, "role", input);
  return {
    id: document.id,
    scope: input.scope,
    resourceKinds: document.resourceKinds.map(resourceKind),
    actions: document.actions.map(action),
    fields: document.fields.map(field),
  };
}

function grantFact(row: PolicyRow, input: DealAuthorizationInput): GrantFact {
  const document = policyDocument(row.document, "grant", input);
  if (
    document.identityId !== input.context.request.identityId ||
    document.access === undefined ||
    !["standard", "temporary", "external"].includes(document.access) ||
    (document.resourceIds !== undefined &&
      !stringArray(document.resourceIds)) ||
    (document.access !== "standard" &&
      (document.expiresAt === undefined || document.purpose === undefined ||
        document.sponsor === undefined))
  ) {
    throw new Error(
      "permission grant identity does not match the session identity",
    );
  }
  return {
    id: document.id,
    scope: input.scope,
    access: document.access,
    resourceIds: document.resourceIds,
    resourceKinds: document.resourceKinds.map(resourceKind),
    actions: document.actions.map(action),
    fields: document.fields.map(field),
    state: "active",
    ...(document.expiresAt === undefined
      ? {}
      : { expiresAt: document.expiresAt }),
    ...(document.purpose === undefined
      ? {}
      : { purpose: purpose(document.purpose) }),
    ...(document.sponsor === undefined
      ? {}
      : { sponsor: sponsor(document.sponsor) }),
  } as GrantFact;
}

function restrictionFact(
  row: PolicyRow,
  input: DealAuthorizationInput,
): RestrictionFact {
  const document = policyDocument(row.document, "restriction", input);
  return {
    id: document.id,
    scope: input.scope,
    resourceKinds: document.resourceKinds.map(resourceKind),
    actions: document.actions.map(action),
    ...(document.resourceIds === undefined
      ? {}
      : { resourceIds: document.resourceIds }),
    ...(document.fields === undefined
      ? {}
      : { fields: document.fields.map(field) }),
  };
}

async function loadExactPolicyRows(
  pool: pg.Pool,
  input: DealAuthorizationInput,
): Promise<readonly PolicyRow[]> {
  const request = input.context.request;
  if (request.sessionId === undefined || request.identityId === undefined) {
    throw new Error(
      "authorization requires exact session and identity references",
    );
  }
  const session = await pool.query<SessionRow>(sessionQuery, [
    request.sessionId,
  ]);
  if (session.rowCount !== 1) {
    throw new Error("authenticated session is absent or duplicated");
  }
  const row = session.rows[0];
  const principal = activePrincipal(row);
  if (
    principal.sessionId !== request.sessionId ||
    principal.identityId !== request.identityId ||
    principal.actor.id !== input.context.actor.id ||
    principal.tenantId !== input.scope.tenantId ||
    principal.workspaceId !== input.scope.workspaceId
  ) throw new Error("authenticated session scope mismatch");
  const membership = await pool.query<{ document: unknown }>(membershipQuery, [
    input.scope.tenantId,
    input.scope.workspaceId,
    request.identityId,
  ]);
  if (membership.rowCount !== 1) {
    throw new Error("membership is absent or duplicated");
  }
  const membershipDocument = parseMembership(
    membership.rows[0].document,
    input,
  );
  const roles = await pool.query<PolicyRow>(roleQuery, [
    input.scope.tenantId,
    input.scope.workspaceId,
    membershipDocument.rolePolicyIds,
  ]);
  if (roles.rowCount !== membershipDocument.rolePolicyIds.length) {
    throw new Error("role policy is absent or duplicated");
  }
  const grants = await pool.query<PolicyRow>(grantQuery, [
    input.scope.tenantId,
    input.scope.workspaceId,
    request.identityId,
  ]);
  const restrictions = await pool.query<PolicyRow>(restrictionQuery, [
    input.scope.tenantId,
    input.scope.workspaceId,
  ]);
  return [...roles.rows, ...grants.rows, ...restrictions.rows];
}

const membershipQuery = `SELECT document FROM iam.memberships
  WHERE tenant_id = $1 AND workspace_id = $2 AND state = 'active'
    AND document->>'identityId' = $3`;
const roleQuery = `SELECT 'role' AS kind, document FROM access.role_policies
  WHERE tenant_id = $1 AND workspace_id = $2 AND state = 'active'
    AND aggregate_id = ANY($3::text[])`;
const grantQuery =
  `SELECT 'grant' AS kind, document FROM access.permission_grants
  WHERE tenant_id = $1 AND workspace_id = $2 AND state = 'active'
    AND identity_id = $3`;
const restrictionQuery =
  `SELECT 'restriction' AS kind, document FROM access.restrictions
  WHERE tenant_id = $1 AND workspace_id = $2 AND state = 'active'`;

function parseSessionDocument(value: unknown): SessionDocument {
  if (typeof value === "string") value = JSON.parse(value);
  if (
    !isRecord(value) || !isRecord(value.actor) ||
    typeof value.sessionId !== "string" ||
    typeof value.identityId !== "string" ||
    typeof value.tenantId !== "string" ||
    (typeof value.workspaceId !== "string" && value.workspaceId !== null) ||
    typeof value.expiresAt !== "string" || typeof value.state !== "string"
  ) throw authenticationFailure();
  const actor = value.actor;
  if (
    typeof actor.id !== "string" ||
    !["human", "ai", "service", "external"].includes(String(actor.kind)) ||
    !["active", "inactive", "revoked"].includes(String(actor.state))
  ) throw authenticationFailure();
  return {
    ...value,
    actor: actor as unknown as AuthenticatedPrincipal["actor"],
    workspaceId: value.workspaceId as string | null,
  } as SessionDocument;
}

interface SessionDocument {
  readonly sessionId: string;
  readonly actor: AuthenticatedPrincipal["actor"];
  readonly identityId: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly state: string;
  readonly expiresAt: string;
}

function parseMembership(
  value: unknown,
  input: DealAuthorizationInput,
): { readonly rolePolicyIds: readonly string[] } {
  if (typeof value === "string") value = JSON.parse(value);
  if (
    !isRecord(value) || value.identityId !== input.context.request.identityId ||
    value.tenantId !== input.scope.tenantId ||
    value.workspaceId !== input.scope.workspaceId ||
    !Array.isArray(value.rolePolicyIds) ||
    value.rolePolicyIds.some((id) => typeof id !== "string") ||
    new Set(value.rolePolicyIds).size !== value.rolePolicyIds.length
  ) throw new Error("membership document is malformed or cross-scope");
  return { rolePolicyIds: value.rolePolicyIds as string[] };
}

function policyDocument(
  value: unknown,
  kind: PolicyRow["kind"],
  input: DealAuthorizationInput,
): PolicyDocument {
  if (typeof value === "string") value = JSON.parse(value);
  if (
    !isRecord(value) || value.tenantId !== input.scope.tenantId ||
    value.workspaceId !== input.scope.workspaceId ||
    value.state !== "active" || typeof value.id !== "string" ||
    !stringArray(value.resourceKinds) ||
    !stringArray(value.actions) ||
    (kind !== "restriction" && !stringArray(value.fields))
  ) throw new Error("policy document is malformed or cross-scope");
  return value as unknown as PolicyDocument;
}

interface PolicyDocument {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly state: string;
  readonly resourceKinds: string[];
  readonly actions: string[];
  readonly fields: string[];
  readonly identityId?: string;
  readonly access?: "standard" | "temporary" | "external";
  readonly resourceIds?: string[];
  readonly purpose?: string;
  readonly sponsor?: string;
  readonly expiresAt?: string;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function denyAuthorization(
  input: DealAuthorizationInput,
): AuthorizationDecision {
  return evaluateAuthorization({
    ...authorizationRequestBase(input),
    roleFacts: [],
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
  });
}

function authorizationRequestBase(input: DealAuthorizationInput) {
  return {
    context: input.context.request,
    actor: input.context.actor,
    scope: input.scope,
    resource: input.resource,
    action: input.action,
    requestedFields: input.requestedFields.map((requested) => ({
      ...requested,
      name: field(requested.name),
    })),
    clock: { now: () => new Date().toISOString() },
  };
}
