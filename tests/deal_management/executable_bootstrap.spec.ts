import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { PostgresIdentityAccessAuthentication } from "../../src/api/deal_management_bootstrap.ts";
import { PostgresDealAuthorization } from "../../src/api/deal_management_bootstrap.ts";
import { createExecutableApiServer } from "../../src/api/server.ts";
import { action, field, resourceKind } from "../../src/platform/authz/v1.ts";
import type { DealAuthorizationInput } from "../../src/deal_management/v1.ts";
import {
  actorId,
  IdentityAccessError,
  sessionId,
  tenantId,
  userIdentityId,
  workspaceId,
} from "../../src/identity_access/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import { PostgresMigrationRunner } from "../../src/platform/persistence/v1.ts";
import { identityAccessMigrations } from "../../src/identity_access/v1.ts";

Deno.test("executable API bootstrap fails startup without database configuration", () => {
  const error = assertThrows(
    () => createExecutableApiServer({}),
    Error,
    "expected POSTGRES_INTEGRATION_TEST_DATABASE_URL or DATABASE_URL",
  );
  assertEquals(error.message.includes("password"), false);
});

Deno.test("executable API bootstrap rejects non-PostgreSQL configuration", () => {
  assertThrows(
    () => createExecutableApiServer({ DATABASE_URL: "https://db.invalid" }),
    Error,
    "expected postgres or postgresql",
  );
});

Deno.test("authentication failure never reflects the supplied credential", async () => {
  const pool = {
    query: () => Promise.resolve({ rowCount: 0, rows: [] }),
  } as never;
  const credential = "session_unique-secret-value";
  const authentication = new PostgresIdentityAccessAuthentication(pool);
  const error = await assertRejects(
    () => authentication.authenticate({ credential }),
  );
  assertInstanceOf(error, Error);
  assertEquals(
    error.message.includes(
      "Authentication failed; expected a valid active session credential.",
    ),
    true,
  );
  assertEquals(error.message.includes(credential), false);
});

Deno.test("authentication rejects every relational or document session mismatch", async () => {
  const cases = [
    { name: "actor", row: sessionRow({ actorId: "actor_other" }) },
    { name: "tenant", row: sessionRow({ tenantId: "tenant_other" }) },
    { name: "workspace", row: sessionRow({ workspaceId: "workspace_other" }) },
    {
      name: "identity",
      row: sessionRow({ document: { identityId: "identity_other" } }),
    },
    { name: "state", row: sessionRow({ state: "revoked" }) },
    {
      name: "expiration",
      row: sessionRow({ expiresAt: "2020-01-01T00:00:00.000Z" }),
    },
    {
      name: "malformed",
      row: { ...sessionRow(), document: { malformed: true } },
    },
  ];
  for (const testCase of cases) {
    const authentication = new PostgresIdentityAccessAuthentication(
      new SessionRowPool(testCase.row) as never,
    );
    await assertRejects(
      () => authentication.authenticate({ credential: "session_valid" }),
      IdentityAccessError,
      "Authentication failed; expected a valid active session credential.",
      testCase.name,
    );
  }
});

class SessionRowPool {
  constructor(private readonly row: Record<string, unknown>) {}

  query(): Promise<
    { readonly rowCount: 1; readonly rows: readonly Record<string, unknown>[] }
  > {
    return Promise.resolve({ rowCount: 1, rows: [this.row] });
  }
}

function sessionRow(
  overrides: {
    readonly actorId?: string;
    readonly tenantId?: string;
    readonly workspaceId?: string | null;
    readonly state?: string;
    readonly expiresAt?: string;
    readonly document?: Record<string, unknown>;
  } = {},
): Record<string, unknown> {
  const expiresAt = overrides.expiresAt ?? "2099-08-03T12:00:00.000Z";
  return {
    aggregateId: "session_valid",
    actorId: overrides.actorId ?? "actor_shared",
    identityId: "identity_restricted",
    tenantId: overrides.tenantId ?? "tenant_isolation",
    workspaceId: overrides.workspaceId ?? "workspace_isolation",
    state: overrides.state ?? "active",
    expiresAt,
    document: {
      sessionId: "session_valid",
      tenantId: "tenant_isolation",
      workspaceId: "workspace_isolation",
      identityId: "identity_restricted",
      state: "active",
      expiresAt,
      actor: { id: "actor_shared", kind: "human", state: "active" },
      ...overrides.document,
    },
  };
}

Deno.test({
  name: "PostgreSQL authorization isolates same-actor sessions by identity",
  ignore: postgresIntegrationTestDatabaseUrl() === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(
      postgresIntegrationTestDatabaseUrl()!,
    );
    const now = "2026-08-03T12:00:00.000Z";
    const expiry = "2099-08-03T12:00:00.000Z";
    try {
      await new PostgresMigrationRunner(pool).apply(identityAccessMigrations);
      await seedIdentityIsolation(pool, now, expiry);
      const authorization = new PostgresDealAuthorization(pool);
      const restricted = await authorization.authorize(
        authorizationInput("session_restricted", "identity_restricted"),
      );
      const privileged = await authorization.authorize(
        authorizationInput("session_privileged", "identity_privileged"),
      );
      assertEquals(restricted.outcome, "deny");
      assertEquals(privileged.outcome, "allow");
    } finally {
      await cleanupIdentityIsolation(pool);
      await pool.end();
    }
  },
});

Deno.test({
  name:
    "PostgreSQL authentication rejects mismatches and unsafe persisted facts",
  ignore: postgresIntegrationTestDatabaseUrl() === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(
      postgresIntegrationTestDatabaseUrl()!,
    );
    try {
      await new PostgresMigrationRunner(pool).apply(identityAccessMigrations);
      await seedIdentityIsolation(
        pool,
        "2026-08-03T12:00:00.000Z",
        "2099-08-03T12:00:00.000Z",
      );
      const authentication = new PostgresIdentityAccessAuthentication(pool);
      await assertAuthenticationDenied(
        pool,
        authentication,
        "actor mismatch",
        async () => {
          await pool.query(
            "UPDATE iam.sessions SET actor_id = 'actor_other' WHERE aggregate_id = 'session_restricted'",
          );
        },
      );
      await pool.query(
        "UPDATE iam.sessions SET actor_id = 'actor_shared' WHERE aggregate_id = 'session_restricted'",
      );
      await assertAuthenticationDenied(
        pool,
        authentication,
        "identity mismatch",
        async () => {
          await pool.query(
            "UPDATE iam.sessions SET identity_id = 'identity_privileged' WHERE aggregate_id = 'session_restricted'",
          );
        },
      );
      await pool.query(
        "UPDATE iam.sessions SET identity_id = 'identity_restricted' WHERE aggregate_id = 'session_restricted'",
      );
      await pool.query(
        "UPDATE access.role_policies SET document = '{\"malformed\":true}' WHERE aggregate_id = 'role_restricted'",
      );
      const malformed = await new PostgresDealAuthorization(pool).authorize(
        authorizationInput("session_restricted", "identity_restricted"),
      );
      assertEquals(malformed.outcome, "deny");
      await pool.query(
        "UPDATE access.role_policies SET document = jsonb_build_object('id','role_restricted','tenantId','tenant_isolation','workspaceId','workspace_isolation','state','active','resourceKinds',jsonb_build_array('deal'),'actions',jsonb_build_array('create'),'fields',jsonb_build_array('deal')) WHERE aggregate_id = 'role_restricted'",
      );
      await assertAuthenticationDenied(
        pool,
        authentication,
        "expired session",
        async () => {
          await pool.query(
            "UPDATE iam.sessions SET expires_at = '2020-01-01T00:00:00Z', document = jsonb_set(document, '{expiresAt}', '\"2020-01-01T00:00:00Z\"') WHERE aggregate_id = 'session_restricted'",
          );
        },
      );
      await pool.query(
        "UPDATE iam.sessions SET expires_at = '2099-08-03T12:00:00Z', document = jsonb_set(document, '{expiresAt}', '\"2099-08-03T12:00:00Z\"') WHERE aggregate_id = 'session_restricted'",
      );
      await assertAuthenticationDenied(
        pool,
        authentication,
        "revoked session",
        async () => {
          await pool.query(
            "UPDATE iam.sessions SET state = 'revoked', document = jsonb_set(document, '{state}', '\"revoked\"') WHERE aggregate_id = 'session_restricted'",
          );
        },
      );
      await pool.query(
        "UPDATE iam.sessions SET state = 'active', document = jsonb_set(document, '{state}', '\"active\"') WHERE aggregate_id = 'session_restricted'",
      );
      const providerSubjectPrincipal = await authentication.authenticate({
        credential: "session_privileged",
      });
      assertEquals(providerSubjectPrincipal.actor.id, "actor_shared");
      assertEquals(providerSubjectPrincipal.identityId, "identity_privileged");
      const secret = "session_provider-secret-do-not-echo";
      const error = await assertRejects(
        () => authentication.authenticate({ credential: secret }),
      );
      assertInstanceOf(error, Error);
      assertEquals(error.message.includes(secret), false);
    } finally {
      await cleanupIdentityIsolation(pool);
      await pool.end();
    }
  },
});

async function assertAuthenticationDenied(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  authentication: PostgresIdentityAccessAuthentication,
  label: string,
  mutate: () => Promise<void>,
): Promise<void> {
  await mutate();
  const error = await assertRejects(
    () => authentication.authenticate({ credential: "session_restricted" }),
  );
  assertEquals(error instanceof IdentityAccessError, true, label);
  await pool.query(
    "UPDATE iam.sessions SET actor_id = 'actor_shared', identity_id = 'identity_restricted', state = 'active', expires_at = '2099-08-03T12:00:00Z', document = jsonb_build_object('sessionId','session_restricted','tenantId','tenant_isolation','workspaceId','workspace_isolation','actor',jsonb_build_object('id','actor_shared','kind','human','state','active'),'identityId','identity_restricted','state','active','expiresAt','2099-08-03T12:00:00Z') WHERE aggregate_id = 'session_restricted'",
  );
}

async function cleanupIdentityIsolation(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await pool.query(
    "DELETE FROM access.role_policies WHERE aggregate_id IN ('role_restricted','role_privileged')",
  );
  await pool.query(
    "DELETE FROM iam.sessions WHERE aggregate_id IN ('session_restricted','session_privileged')",
  );
  await pool.query(
    "DELETE FROM iam.memberships WHERE aggregate_id IN ('membership_restricted','membership_privileged')",
  );
  await pool.query(
    "DELETE FROM iam.user_identities WHERE aggregate_id IN ('identity_restricted','identity_privileged')",
  );
}

function authorizationInput(
  session: string,
  identity: string,
): DealAuthorizationInput {
  const actor = actorId("actor_shared");
  const tenant = tenantId("tenant_isolation");
  const workspace = workspaceId("workspace_isolation");
  return {
    context: {
      actor: { id: actor, kind: "human", state: "active" },
      request: {
        actorId: actor,
        sessionId: sessionId(session),
        identityId: userIdentityId(identity),
        tenantId: tenant,
        workspaceId: workspace,
        correlationId: "cor_isolation" as never,
        origin: "http",
      },
      now: "2026-08-03T12:00:00.000Z",
    },
    scope: { tenantId: tenant, workspaceId: workspace },
    resource: { kind: resourceKind("deal"), id: "deal_isolation" },
    action: action("create"),
    requestedFields: [{ name: field("parties"), classification: "restricted" }],
  };
}

async function seedIdentityIsolation(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
  issuedAt: string,
  expiresAt: string,
): Promise<void> {
  for (const identity of ["restricted", "privileged"]) {
    await pool.query(
      `INSERT INTO iam.user_identities
       (aggregate_id, tenant_id, version, state, provider_subject, document, created_at, updated_at)
       VALUES ($1, 'tenant_isolation', 1, 'active', $2, $3, $4, $4)`,
      [
        `identity_${identity}`,
        `provider_${identity}`,
        JSON.stringify({ id: `identity_${identity}` }),
        issuedAt,
      ],
    );
    await pool.query(
      `INSERT INTO iam.memberships
       (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
       VALUES ($1, 'tenant_isolation', 'workspace_isolation', 1, 'active', $2, $3, $3)`,
      [
        `membership_${identity}`,
        JSON.stringify({
          tenantId: "tenant_isolation",
          workspaceId: "workspace_isolation",
          identityId: `identity_${identity}`,
          rolePolicyIds: [`role_${identity}`],
        }),
        issuedAt,
      ],
    );
    await pool.query(
      `INSERT INTO iam.sessions
       (aggregate_id, tenant_id, workspace_id, actor_id, identity_id, version, state, issued_at, expires_at, document, created_at, updated_at)
       VALUES ($1, 'tenant_isolation', 'workspace_isolation', 'actor_shared', $5, 1, 'active', $2, $3, $4, $2, $2)`,
      [
        `session_${identity}`,
        issuedAt,
        expiresAt,
        JSON.stringify({
          sessionId: `session_${identity}`,
          tenantId: "tenant_isolation",
          workspaceId: "workspace_isolation",
          actor: { id: "actor_shared", kind: "human", state: "active" },
          identityId: `identity_${identity}`,
          state: "active",
          expiresAt,
        }),
        `identity_${identity}`,
      ],
    );
    const fields = identity === "privileged" ? ["deal", "parties"] : ["deal"];
    await pool.query(
      `INSERT INTO access.role_policies
       (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
       VALUES ($1, 'tenant_isolation', 'workspace_isolation', 1, 'active', $2, $3, $3)`,
      [
        `role_${identity}`,
        JSON.stringify({
          id: `role_${identity}`,
          tenantId: "tenant_isolation",
          workspaceId: "workspace_isolation",
          state: "active",
          resourceKinds: ["deal"],
          actions: ["create"],
          fields,
        }),
        issuedAt,
      ],
    );
  }
}
