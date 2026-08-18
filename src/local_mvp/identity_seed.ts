import { demoScope } from "../demo_readiness/runner.ts";

export interface LocalMvpSqlPort {
  query(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ readonly rowCount?: number | null }>;
}

export const localMvpIdentity = Object.freeze({
  tenantId: demoScope.tenantId,
  workspaceId: demoScope.workspaceId,
  institutionId: "institution_serra-azul-advisory",
  identityId: "identity_local-banker",
  membershipId: "membership_local-banker",
  sessionId: "session_local-banker",
  actorId: "actor_demo-banker",
  roleId: "role_local-banker",
});

/** Rejects seed execution unless the target is the named loopback database. */
export function assertLocalMvpSeedTarget(
  environment: Readonly<Record<string, string | undefined>>,
): URL {
  if (environment.LOCAL_RUNTIME_PROFILE !== "local") {
    throw new Error(
      `Local MVP seed profile "${environment.LOCAL_RUNTIME_PROFILE}" is invalid; expected local.`,
    );
  }
  const target = parseDatabaseUrl(environment.DATABASE_URL);
  const loopback = target.hostname === "127.0.0.1" ||
    target.hostname === "localhost";
  if (
    !loopback || target.port !== "55438" || target.pathname !== "/mai_local"
  ) {
    throw new Error(
      `Local MVP seed target "${target.hostname}:${target.port}${target.pathname}" is unsafe; expected loopback:55438/mai_local.`,
    );
  }
  return target;
}

/** Upserts the deterministic local banker authentication and policy boundary. */
export async function seedLocalMvpIdentity(
  sql: LocalMvpSqlPort,
  now = new Date().toISOString(),
  expiresAt = "2099-12-31T23:59:59.000Z",
): Promise<void> {
  await upsertInstitution(sql, now);
  await upsertWorkspace(sql, now);
  await upsertIdentity(sql, now);
  await upsertMembership(sql, now);
  await upsertSession(sql, now, expiresAt);
  await upsertRole(sql, now);
}

function parseDatabaseUrl(value: string | undefined): URL {
  try {
    return new URL(value ?? "invalid:");
  } catch {
    throw new Error(
      "Local MVP seed target is invalid; expected loopback:55438/mai_local.",
    );
  }
}

function upsertInstitution(sql: LocalMvpSqlPort, now: string): Promise<void> {
  return scopedUpsert(
    sql,
    `INSERT INTO iam.institutions
      (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
     VALUES ($1, $2, $3, 1, 'active', $4, $5, $5)
     ON CONFLICT (aggregate_id) DO UPDATE SET state = 'active',
       workspace_id = EXCLUDED.workspace_id, document = EXCLUDED.document,
       updated_at = EXCLUDED.updated_at
     WHERE iam.institutions.tenant_id = EXCLUDED.tenant_id`,
    [
      localMvpIdentity.institutionId,
      localMvpIdentity.tenantId,
      localMvpIdentity.workspaceId,
      JSON.stringify({
        id: localMvpIdentity.institutionId,
        tenantId: localMvpIdentity.tenantId,
        name: "Atlas M&A Advisory",
      }),
      now,
    ],
    localMvpIdentity.institutionId,
  );
}

function upsertWorkspace(sql: LocalMvpSqlPort, now: string): Promise<void> {
  return scopedUpsert(
    sql,
    `INSERT INTO iam.workspaces
      (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
     VALUES ($1, $2, $1, 1, 'active', $3, $4, $4)
     ON CONFLICT (aggregate_id) DO UPDATE SET state = 'active',
       document = EXCLUDED.document, updated_at = EXCLUDED.updated_at
     WHERE iam.workspaces.tenant_id = EXCLUDED.tenant_id
       AND iam.workspaces.workspace_id = EXCLUDED.workspace_id`,
    [
      localMvpIdentity.workspaceId,
      localMvpIdentity.tenantId,
      JSON.stringify({
        id: localMvpIdentity.workspaceId,
        institutionId: localMvpIdentity.institutionId,
        name: "Atlas M&A Advisory",
      }),
      now,
    ],
    localMvpIdentity.workspaceId,
  );
}

function upsertIdentity(sql: LocalMvpSqlPort, now: string): Promise<void> {
  return scopedUpsert(
    sql,
    `INSERT INTO iam.user_identities
      (aggregate_id, tenant_id, workspace_id, version, state, provider_subject,
       document, created_at, updated_at)
     VALUES ($1, $2, $3, 1, 'active', 'local-banker', $4, $5, $5)
     ON CONFLICT (aggregate_id) DO UPDATE SET state = 'active',
       workspace_id = EXCLUDED.workspace_id, document = EXCLUDED.document,
       updated_at = EXCLUDED.updated_at
     WHERE iam.user_identities.tenant_id = EXCLUDED.tenant_id`,
    [
      localMvpIdentity.identityId,
      localMvpIdentity.tenantId,
      localMvpIdentity.workspaceId,
      JSON.stringify({
        id: localMvpIdentity.identityId,
        displayName: "Marina Costa",
        email: "marina.costa@local.invalid",
      }),
      now,
    ],
    localMvpIdentity.identityId,
  );
}

function upsertMembership(sql: LocalMvpSqlPort, now: string): Promise<void> {
  return scopedUpsert(
    sql,
    `INSERT INTO iam.memberships
      (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
     VALUES ($1, $2, $3, 1, 'active', $4, $5, $5)
     ON CONFLICT (aggregate_id) DO UPDATE SET state = 'active',
       document = EXCLUDED.document, updated_at = EXCLUDED.updated_at
     WHERE iam.memberships.tenant_id = EXCLUDED.tenant_id
       AND iam.memberships.workspace_id = EXCLUDED.workspace_id`,
    [
      localMvpIdentity.membershipId,
      localMvpIdentity.tenantId,
      localMvpIdentity.workspaceId,
      JSON.stringify({
        tenantId: localMvpIdentity.tenantId,
        workspaceId: localMvpIdentity.workspaceId,
        identityId: localMvpIdentity.identityId,
        rolePolicyIds: [localMvpIdentity.roleId],
      }),
      now,
    ],
    localMvpIdentity.membershipId,
  );
}

function upsertSession(
  sql: LocalMvpSqlPort,
  now: string,
  expiresAt: string,
): Promise<void> {
  return scopedUpsert(
    sql,
    `INSERT INTO iam.sessions
      (aggregate_id, tenant_id, workspace_id, actor_id, identity_id, version,
       state, issued_at, expires_at, document, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, 'active', $6, $7, $8, $6, $6)
     ON CONFLICT (aggregate_id) DO UPDATE SET state = 'active',
       expires_at = EXCLUDED.expires_at, document = EXCLUDED.document,
       revoked_at = NULL, updated_at = EXCLUDED.updated_at
     WHERE iam.sessions.tenant_id = EXCLUDED.tenant_id
       AND iam.sessions.workspace_id = EXCLUDED.workspace_id
       AND iam.sessions.actor_id = EXCLUDED.actor_id
       AND iam.sessions.identity_id = EXCLUDED.identity_id`,
    [
      localMvpIdentity.sessionId,
      localMvpIdentity.tenantId,
      localMvpIdentity.workspaceId,
      localMvpIdentity.actorId,
      localMvpIdentity.identityId,
      now,
      expiresAt,
      JSON.stringify(sessionDocument(expiresAt)),
    ],
    localMvpIdentity.sessionId,
  );
}

function sessionDocument(expiresAt: string): Readonly<Record<string, unknown>> {
  return {
    sessionId: localMvpIdentity.sessionId,
    tenantId: localMvpIdentity.tenantId,
    workspaceId: localMvpIdentity.workspaceId,
    identityId: localMvpIdentity.identityId,
    state: "active",
    expiresAt,
    actor: { id: localMvpIdentity.actorId, kind: "human", state: "active" },
  };
}

function upsertRole(sql: LocalMvpSqlPort, now: string): Promise<void> {
  return scopedUpsert(
    sql,
    `INSERT INTO access.role_policies
      (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
     VALUES ($1, $2, $3, 1, 'active', $4, $5, $5)
     ON CONFLICT (aggregate_id) DO UPDATE SET state = 'active',
       document = EXCLUDED.document, updated_at = EXCLUDED.updated_at
     WHERE access.role_policies.tenant_id = EXCLUDED.tenant_id
       AND access.role_policies.workspace_id = EXCLUDED.workspace_id`,
    [
      localMvpIdentity.roleId,
      localMvpIdentity.tenantId,
      localMvpIdentity.workspaceId,
      JSON.stringify(roleDocument()),
      now,
    ],
    localMvpIdentity.roleId,
  );
}

async function scopedUpsert(
  sql: LocalMvpSqlPort,
  statement: string,
  values: readonly unknown[],
  aggregateId: string,
): Promise<void> {
  const result = await sql.query(statement, values);
  if (result.rowCount === 1) return;
  throw new Error(
    `Local MVP aggregate "${aggregateId}" conflicts with another scope; expected ${localMvpIdentity.tenantId}/${localMvpIdentity.workspaceId}.`,
  );
}

function roleDocument(): Readonly<Record<string, unknown>> {
  return {
    id: localMvpIdentity.roleId,
    tenantId: localMvpIdentity.tenantId,
    workspaceId: localMvpIdentity.workspaceId,
    state: "active",
    resourceKinds: [
      "deal",
      "document",
      "evidence",
      "agent_mission",
      "agent_run",
    ],
    actions: [
      "create",
      "read",
      "configure",
      "configure_parties",
      "configure_roles",
      "configure_mandate",
      "configure_constraints",
      "transition_lifecycle",
      "manage_milestones",
      "upload",
      "sync",
      "process",
      "submit_proposal",
    ],
    fields: [
      "deal",
      "parties",
      "roles",
      "mandate_ceiling",
      "authority_constraints",
    ],
  };
}
