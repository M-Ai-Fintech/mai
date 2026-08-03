import pg from "pg";
import {
  type AuthenticatedPrincipal,
  type AuthenticationPort,
  IdentityAccessError,
  sessionId,
} from "../identity_access/v1.ts";
import {
  type AuthorizationDecision,
  evaluateAuthorization,
  field,
  type GrantFact,
  type RestrictionFact,
  type RoleFact,
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
  environment: Readonly<Record<string, string | undefined>> = Deno.env
    .toObject(),
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
    const id = parseCredential(input.credential);
    const result = await this.pool.query<SessionRow>(sessionQuery, [id]);
    if (result.rowCount !== 1) throw authenticationFailure(id);
    return activePrincipal(result.rows[0]);
  }
}

/** Evaluates Deal requests from persisted Identity Access policy facts. */
export class PostgresDealAuthorization implements DealAuthorizationPort {
  constructor(private readonly pool: pg.Pool) {}

  async authorize(
    input: DealAuthorizationInput,
  ): Promise<AuthorizationDecision> {
    const facts = await this.pool.query<PolicyRow>(policyQuery, [
      input.scope.tenantId,
      input.scope.workspaceId,
      input.context.actor.id,
    ]);
    return evaluateAuthorization(authorizationRequest(input, facts.rows));
  }

  async assertOperatorScope(
    input: {
      readonly actorId: string;
      readonly tenantId: string;
      readonly workspaceId: string;
    },
  ): Promise<void> {
    const result = await this.pool.query(operatorScopeQuery, [
      input.tenantId,
      input.workspaceId,
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
}

interface PolicyRow {
  readonly kind: "role" | "grant" | "restriction";
  readonly document: Record<string, unknown>;
}

const sessionQuery =
  `SELECT aggregate_id AS "aggregateId", tenant_id AS "tenantId",
  workspace_id AS "workspaceId", state, expires_at AS "expiresAt", document
  FROM iam.sessions WHERE aggregate_id = $1`;

const policyQuery = `WITH identity AS (
  SELECT aggregate_id FROM iam.user_identities
  WHERE tenant_id = $1 AND provider_subject = $3 AND state = 'active'
), membership AS (
  SELECT document FROM iam.memberships
  WHERE tenant_id = $1 AND workspace_id = $2 AND state = 'active'
    AND document->>'identityId' = (SELECT aggregate_id FROM identity)
)
SELECT 'role' AS kind, rp.document FROM access.role_policies rp, membership m
WHERE rp.tenant_id = $1 AND rp.workspace_id = $2 AND rp.state = 'active'
  AND m.document->'rolePolicyIds' ? rp.aggregate_id
UNION ALL SELECT 'grant', g.document FROM access.permission_grants g
WHERE g.tenant_id = $1 AND g.workspace_id = $2 AND g.identity_id = (SELECT aggregate_id FROM identity)
UNION ALL SELECT 'restriction', r.document FROM access.restrictions r
WHERE r.tenant_id = $1 AND r.workspace_id = $2 AND r.state = 'active'`;

const operatorScopeQuery = `SELECT 1 FROM iam.user_identities i
  JOIN iam.memberships m ON m.tenant_id = i.tenant_id
    AND m.workspace_id = $2 AND m.state = 'active'
    AND m.document->>'identityId' = i.aggregate_id
  WHERE i.tenant_id = $1 AND i.provider_subject = $3 AND i.state = 'active' LIMIT 1`;

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
    throw authenticationFailure(value || "empty");
  }
}

function authenticationFailure(received: string): IdentityAccessError {
  return new IdentityAccessError(
    "AUTHENTICATION_FAILED",
    `credential "${received}" is invalid; expected an active opaque Identity Access session ID.`,
  );
}

function activePrincipal(row: SessionRow): AuthenticatedPrincipal {
  if (
    row.state !== "active" || Date.parse(String(row.expiresAt)) <= Date.now()
  ) {
    throw authenticationFailure(row.aggregateId);
  }
  const document = row.document as {
    readonly actor?: AuthenticatedPrincipal["actor"];
  };
  if (document.actor === undefined || row.workspaceId === null) {
    throw authenticationFailure(row.aggregateId);
  }
  return {
    actor: document.actor,
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
  return { ...(row.document as unknown as RoleFact), scope: input.scope };
}

function grantFact(row: PolicyRow, input: DealAuthorizationInput): GrantFact {
  return { ...(row.document as unknown as GrantFact), scope: input.scope };
}

function restrictionFact(
  row: PolicyRow,
  input: DealAuthorizationInput,
): RestrictionFact {
  return {
    ...(row.document as unknown as RestrictionFact),
    scope: input.scope,
  };
}
