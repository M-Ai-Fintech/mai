import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  action,
  actorId,
  createAdministrationContext,
  FakeAuthenticationPort,
  field,
  handleIdentityAccessRoute,
  IdentityAccessService,
  InMemoryIdentityAccessRepository,
  resourceKind,
  rolePolicyId,
  sessionId,
  tenantId,
  userIdentityId,
  workspaceId,
} from "../../src/identity_access/v1.ts";
import { parseApiEnvelope } from "../../src/platform/api/v1.ts";

const principal = {
  actor: {
    id: actorId("actor_alice"),
    kind: "human" as const,
    state: "active" as const,
  },
  tenantId: tenantId("tenant_acme"),
  sessionId: sessionId("session_alice"),
  identityId: userIdentityId("identity_alice"),
  workspaceId: workspaceId("workspace_main"),
};

function createDependencies() {
  const repository = new InMemoryIdentityAccessRepository();
  const service = new IdentityAccessService({
    repository,
    eventIdGenerator: (() => {
      let count = 0;
      return () => `event_http-${++count}`;
    })(),
  });
  let correlationCount = 0;
  let sessionCount = 0;
  return {
    authentication: new FakeAuthenticationPort(principal),
    repository,
    service,
    now: () => "2026-08-01T12:00:00.000Z",
    nextCorrelationId: () => `cor_http-${++correlationCount}` as never,
    nextSessionId: () => `session_http-${++sessionCount}` as never,
  };
}

Deno.test("identity access HTTP commands use envelopes, ETags, and safe DTOs", async () => {
  const dependencies = createDependencies();
  const response = await handleIdentityAccessRoute(
    new Request("http://localhost/api/v1/identities", {
      method: "POST",
      headers: {
        Authorization: "Bearer opaque-proof",
        "Idempotency-Key": "idem_identity-1",
      },
      body: JSON.stringify({
        id: "identity_alice",
        providerSubject: "provider-secret",
        displayName: "Alice",
      }),
    }),
    dependencies,
  );
  assert(response !== undefined);
  assertEquals(response.status, 201);
  assertEquals(response.headers.get("ETag"), '"v1"');
  const body = await response.json();
  assertEquals(parseApiEnvelope(body).ok, true);
  assertEquals(body.data.displayName, "Alice");
  assertFalse("providerSubject" in body.data);
});

Deno.test("identity access HTTP GET denies before protected identity loading", async () => {
  const dependencies = createDependencies();
  const createContext = createAdministrationContext({
    actor: principal.actor,
    request: {
      actorId: principal.actor.id,
      tenantId: principal.tenantId,
      workspaceId: principal.workspaceId,
      correlationId: "cor_http-seed" as never,
      origin: "http",
    },
    now: "2026-08-01T12:00:00.000Z",
  });
  await dependencies.service.createUserIdentity(
    {
      id: userIdentityId("identity_protected"),
      tenantId: principal.tenantId,
      providerSubject: "provider-secret",
      displayName: "Protected",
    },
    createContext,
    "idem_seed-identity",
  );

  const denied = await handleIdentityAccessRoute(
    new Request("http://localhost/api/v1/identities/identity_protected", {
      headers: { Authorization: "Bearer opaque-proof" },
    }),
    dependencies,
  );
  assert(denied !== undefined);
  assertEquals(denied.status, 404);
  assertEquals((await denied.json()).error.code, "PROTECTED_NOT_FOUND");

  await dependencies.service.createRolePolicy(
    {
      id: rolePolicyId("role_reader"),
      tenantId: principal.tenantId,
      workspaceId: principal.workspaceId,
      name: "Identity reader",
      resourceKinds: [resourceKind("identity")],
      actions: [action("read")],
      fields: [field("id"), field("display_name")],
    },
    createContext,
    "idem_seed-role",
  );
  const allowed = await handleIdentityAccessRoute(
    new Request("http://localhost/api/v1/identities/identity_protected", {
      headers: { Authorization: "Bearer opaque-proof" },
    }),
    dependencies,
  );
  assert(allowed !== undefined);
  assertEquals(allowed.status, 200);
  const allowedBody = await allowed.json();
  assertEquals(allowedBody.data.displayName, "Protected");
  assertFalse("providerSubject" in allowedBody.data);
});

Deno.test("identity access HTTP requires authentication and idempotency", async () => {
  const dependencies = createDependencies();
  const unauthenticated = await handleIdentityAccessRoute(
    new Request("http://localhost/api/v1/identities", { method: "POST" }),
    dependencies,
  );
  assert(unauthenticated !== undefined);
  assertEquals(unauthenticated.status, 401);
  const missingKey = await handleIdentityAccessRoute(
    new Request("http://localhost/api/v1/identities", {
      method: "POST",
      headers: { Authorization: "Bearer opaque-proof" },
      body: "{}",
    }),
    dependencies,
  );
  assert(missingKey !== undefined);
  assertEquals(missingKey.status, 422);
});
