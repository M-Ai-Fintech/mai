import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  actorId,
  correlationId,
  createSessionContext,
  digestInvitationToken,
  FakeAuthenticationPort,
  sessionId,
  SessionRegistry,
  tenantId,
  verifyInvitationToken,
  workspaceId,
} from "../../src/identity_access/v1.ts";

const principal = {
  actor: {
    id: actorId("actor_alice"),
    kind: "human" as const,
    state: "active" as const,
  },
  tenantId: tenantId("tenant_acme"),
  workspaceId: workspaceId("workspace_main"),
};

Deno.test("invitation tokens are represented only by digests", async () => {
  const digest = await digestInvitationToken("opaque-invitation-token");
  assertEquals(digest.length, 64);
  assert(await verifyInvitationToken("opaque-invitation-token", digest));
  assert(!(await verifyInvitationToken("wrong-token", digest)));
});

Deno.test("provider-neutral authentication produces a safe invalidatable session", async () => {
  const provider = new FakeAuthenticationPort(principal);
  const authenticated = await provider.authenticate({
    credential: "opaque-proof",
  });
  const session = createSessionContext({
    sessionId: sessionId("session_alice"),
    principal: authenticated,
    correlationId: correlationId("cor_authentication"),
    issuedAt: "2026-08-01T12:00:00.000Z",
    expiresAt: "2026-08-01T13:00:00.000Z",
  });
  const registry = new SessionRegistry();
  registry.register(session);

  assertEquals(session.toJSON(), {
    sessionId: "session_alice",
    actorId: "actor_alice",
    tenantId: "tenant_acme",
    workspaceId: "workspace_main",
    issuedAt: "2026-08-01T12:00:00.000Z",
    expiresAt: "2026-08-01T13:00:00.000Z",
    state: "active",
  });
  registry.revoke(
    session.sessionId,
    "identity revoked",
    "2026-08-01T12:10:00.000Z",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        registry.assertActive(session.sessionId, "2026-08-01T12:11:00.000Z")
      ),
    Error,
    "SESSION_REVOKED",
  );
});
