import { assert, assertEquals } from "@std/assert";
import {
  type ApiServerRouter,
  createApiServer,
  createExecutableApiServer,
} from "../../src/api/server.ts";
import {
  actorId,
  FakeAuthenticationPort,
  IdentityAccessError,
  sessionId,
  tenantId,
  userIdentityId,
  workspaceId,
} from "../../src/identity_access/v1.ts";
import type { AuthenticationPort } from "../../src/identity_access/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  type AuthorizationDecision,
  field,
} from "../../src/platform/authz/v1.ts";
import type {
  DealAuthorizationInput,
  DealAuthorizationPort,
} from "../../src/deal_management/v1.ts";
import { dealId as canonicalDealId } from "../../src/deal_management/v1.ts";
import {
  type ContextMigration,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import { identityAccessMigrations } from "../../src/identity_access/v1.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name: "executable bootstrap authenticates persisted Identity Access policy",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    let router: ApiServerRouter | undefined;
    try {
      await new PostgresMigrationRunner(pool).apply(identityAccessMigrations);
      router = createExecutableApiServer({ MAI106_DATABASE_URL: databaseUrl });
      if (router.dealManagement.kind !== "configured") return;
      await new PostgresMigrationRunner(pool).apply(
        router.dealManagement.composition
          .migrations as readonly ContextMigration[],
      );
      await seedExecutableIdentity(pool);
      const response = await router.handle(
        dealRequest("/api/v1/deals", "POST", {
          name: "Executable bootstrap deal",
          dealType: "acquisition",
          confidentiality: "sensitive",
          currency: "USD",
        }, {
          Authorization: "Bearer session_server-bootstrap",
          "Idempotency-Key": "idem_executable-bootstrap",
        }),
      );
      assertEquals(response.status, 201);
    } finally {
      await cleanExecutableIdentity(pool).catch(() => {});
      if (router?.dealManagement.kind === "configured") {
        await router.dealManagement.composition.close();
      }
      await pool.end();
    }
  },
});

async function seedExecutableIdentity(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  const now = "2026-08-03T12:00:00.000Z";
  const expiry = "2099-08-03T12:00:00.000Z";
  await pool.query(
    `INSERT INTO iam.user_identities
    (aggregate_id, tenant_id, version, state, provider_subject, document, created_at, updated_at)
    VALUES ('identity_server-bootstrap', 'tenant_northstar', 1, 'active', 'external-subject-789',
      '{"id":"identity_server-bootstrap"}', $1, $1)`,
    [now],
  );
  await pool.query(
    `INSERT INTO iam.memberships
    (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
    VALUES ('membership_server-bootstrap', 'tenant_northstar', 'workspace_alpha', 1, 'active',
      '{"tenantId":"tenant_northstar","workspaceId":"workspace_alpha","identityId":"identity_server-bootstrap","rolePolicyIds":["role_server-bootstrap"]}', $1, $1)`,
    [now],
  );
  await pool.query(
    `INSERT INTO iam.sessions
    (aggregate_id, tenant_id, workspace_id, actor_id, identity_id, version, state, issued_at, expires_at, document, created_at, updated_at)
    VALUES ('session_server-bootstrap', 'tenant_northstar', 'workspace_alpha', 'actor_server-bootstrap', 'identity_server-bootstrap', 1,
    'active', $1, $2, '{"sessionId":"session_server-bootstrap","tenantId":"tenant_northstar","workspaceId":"workspace_alpha","state":"active","expiresAt":"2099-08-03T12:00:00.000Z","actor":{"id":"actor_server-bootstrap","kind":"human","state":"active"},"identityId":"identity_server-bootstrap"}', $1, $1)`,
    [now, expiry],
  );
  await pool.query(
    `INSERT INTO access.role_policies
    (aggregate_id, tenant_id, workspace_id, version, state, document, created_at, updated_at)
    VALUES ('role_server-bootstrap', 'tenant_northstar', 'workspace_alpha', 1, 'active',
      '{"id":"role_server-bootstrap","tenantId":"tenant_northstar","workspaceId":"workspace_alpha","state":"active","resourceKinds":["deal"],"actions":["create"],"fields":["deal","parties","roles","mandate_ceiling","authority_constraints"]}', $1, $1)`,
    [now],
  );
}

async function cleanExecutableIdentity(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(
    "DELETE FROM deal_management.deals WHERE tenant_id = 'tenant_northstar'",
  );
  await pool.query(
    "DELETE FROM access.role_policies WHERE aggregate_id = 'role_server-bootstrap'",
  );
  await pool.query(
    "DELETE FROM iam.sessions WHERE aggregate_id = 'session_server-bootstrap'",
  );
  await pool.query(
    "DELETE FROM iam.memberships WHERE aggregate_id = 'membership_server-bootstrap'",
  );
  await pool.query(
    "DELETE FROM iam.user_identities WHERE aggregate_id = 'identity_server-bootstrap'",
  );
}

class ProviderFailure implements AuthenticationPort {
  authenticate(): Promise<never> {
    return Promise.reject(new Error("provider connection failed"));
  }
}

class InvalidCredentialProvider implements AuthenticationPort {
  authenticate(): Promise<never> {
    return Promise.reject(
      new IdentityAccessError(
        "AUTHENTICATION_FAILED",
        "provider rejected credential proof",
      ),
    );
  }
}

class PublicOnlyAuthorization implements DealAuthorizationPort {
  readonly calls: DealAuthorizationInput[] = [];

  authorize(input: DealAuthorizationInput): AuthorizationDecision {
    this.calls.push(input);
    return {
      outcome: "allow",
      reasonCode: "ALLOWED",
      allowedActions: [input.action],
      approvedScope: undefined as never,
      fieldMask: {
        include: [field("deal")],
        omit: [
          field("parties"),
          field("roles"),
          field("mandate_ceiling"),
          field("authority_constraints"),
        ],
        redact: [],
        approvedClassifications: [{
          name: field("deal"),
          classification: "public",
        }],
      },
    };
  }
}

function configuredRouter(
  pool: ReturnType<typeof createMai106Pool>,
  authorization: DealAuthorizationPort = new PublicOnlyAuthorization(),
): ApiServerRouter {
  return createApiServer({
    dealManagement: {
      pool,
      authentication: new FakeAuthenticationPort({
        actor: { id: actorId("actor_server"), kind: "human", state: "active" },
        sessionId: sessionId("session_server"),
        identityId: userIdentityId("identity_server"),
        tenantId: tenantId("tenant_northstar"),
        workspaceId: workspaceId("workspace_alpha"),
      }),
      authorization,
    },
  });
}

function dealRequest(
  path: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      Authorization: "Bearer verified-provider-proof",
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function cleanDatabase(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(
    `TRUNCATE audit_activity.redaction_overlays, audit_activity.audit_events,
      deal_management.reconciliation_routing_history, deal_management.reconciliation_records,
      deal_management.command_claims, deal_management.command_receipts,
      deal_management.aggregate_history, deal_management.deals,
      deal_management.reconciliation_manifest, platform.outbox`,
  );
}

Deno.test({
  name:
    "configured application server creates and reads a scoped Deal through PostgreSQL",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      const router = configuredRouter(pool);
      assertEquals(router.dealManagement.kind, "configured");
      if (router.dealManagement.kind !== "configured") return;
      await new PostgresMigrationRunner(pool).apply(
        router.dealManagement.composition
          .migrations as readonly ContextMigration[],
      );
      await cleanDatabase(pool);
      const created = await router.handle(dealRequest(
        "/api/v1/deals",
        "POST",
        {
          name: "Configured server deal",
          dealType: "acquisition",
          confidentiality: "sensitive",
          currency: "USD",
        },
        {
          "Idempotency-Key": "idem_server-create",
          "X-Correlation-Id": "cor_server",
        },
      ));
      assertEquals(created.status, 201);
      assertEquals(created.headers.get("ETag"), '"v1"');
      const createdBody = await created.json();
      const dealId = createdBody.data.id as string;
      const persisted = await router.dealManagement.composition.repository.find(
        {
          tenantId: tenantId("tenant_northstar"),
          workspaceId: workspaceId("workspace_alpha"),
        },
        canonicalDealId(dealId),
      );
      assertEquals(persisted?.name, "Configured server deal");
      const read = await router.handle(
        dealRequest(`/api/v1/deals/${dealId}`, "GET", undefined, {
          "X-Correlation-Id": "cor_server",
        }),
      );
      assertEquals(read.status, 200);
      assertEquals((await read.json()).data.name, "Configured server deal");
      assertEquals(
        (await router.handle(dealRequest("/health/live", "GET"))).status,
        200,
      );
      const missingAuth = await router.handle(dealRequest(
        `/api/v1/deals/${dealId}`,
        "GET",
        undefined,
        { Authorization: "", "X-Correlation-Id": "cor_server" },
      ));
      assertEquals(missingAuth.status, 401);
      const invalidCredentials = await createApiServer({
        dealManagement: {
          pool,
          authentication: new InvalidCredentialProvider(),
          authorization: new PublicOnlyAuthorization(),
        },
      }).handle(dealRequest(`/api/v1/deals/${dealId}`, "GET"));
      assertEquals(invalidCredentials.status, 401);
      const invalidBody = await invalidCredentials.json() as {
        error?: { message?: string };
      };
      assertEquals(invalidBody.error?.message, "Authentication failed.");
      assert(!JSON.stringify(invalidBody).includes("provider rejected"));
      const publicAuthorization = router.dealManagement.composition.http
        .authorization as PublicOnlyAuthorization;
      assert(
        publicAuthorization.calls.some((call) =>
          call.requestedFields.some((requested) =>
            requested.classification === "mandate_ceiling"
          )
        ),
      );
      const unavailableRouter = createApiServer({
        dealManagement: {
          pool,
          authentication: new ProviderFailure(),
          authorization: new PublicOnlyAuthorization(),
        },
      });
      const unavailable = await unavailableRouter.handle(
        dealRequest(`/api/v1/deals/${dealId}`, "GET"),
      );
      assertEquals(unavailable.status, 503);
      const unconfigured = await createApiServer().handle(
        dealRequest("/api/v1/deals", "POST", {}, {
          "X-Correlation-Id": "cor_server",
        }),
      );
      assertEquals(unconfigured.status, 503);
    } finally {
      await cleanDatabase(pool).catch(() => {});
      await pool.end();
    }
  },
});

Deno.test({
  name: "configured server retains tenant and workspace scope",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      const router = configuredRouter(pool, new PublicOnlyAuthorization());
      if (router.dealManagement.kind !== "configured") return;
      await new PostgresMigrationRunner(pool).apply(
        router.dealManagement.composition
          .migrations as readonly ContextMigration[],
      );
      await cleanDatabase(pool);
      const created = await router.handle(dealRequest("/api/v1/deals", "POST", {
        name: "Scoped deal",
        dealType: "acquisition",
        confidentiality: "standard",
        currency: "USD",
      }, { "Idempotency-Key": "idem_scope-create" }));
      const dealId = (await created.json()).data.id as string;
      const otherTenantRouter = createApiServer({
        dealManagement: {
          pool,
          authentication: new FakeAuthenticationPort({
            actor: {
              id: actorId("actor_other"),
              kind: "human",
              state: "active",
            },
            sessionId: sessionId("session_other"),
            identityId: userIdentityId("identity_other"),
            tenantId: tenantId("tenant_other"),
            workspaceId: workspaceId("workspace_other"),
          }),
          authorization: new PublicOnlyAuthorization(),
        },
      });
      const response = await otherTenantRouter.handle(
        dealRequest(`/api/v1/deals/${dealId}`, "GET"),
      );
      assertEquals(response.status, 404);
    } finally {
      await cleanDatabase(pool).catch(() => {});
      await pool.end();
    }
  },
});
