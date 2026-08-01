import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  actorId,
  assertSessionRecordActive,
  correlationId,
  createSessionContext,
  InMemorySessionRepository,
  sessionId,
  sessionRecord,
  tenantId,
  workspaceId,
} from "../../src/identity_access/v1.ts";

const actor = {
  id: actorId("actor_alice"),
  kind: "human" as const,
  state: "active" as const,
};

Deno.test("session repository keeps tenant and workspace scope while revoking immediately", async () => {
  const repository = new InMemorySessionRepository();
  const session = createSessionContext({
    sessionId: sessionId("session_repository"),
    principal: {
      actor,
      tenantId: tenantId("tenant_acme"),
      workspaceId: workspaceId("workspace_main"),
    },
    correlationId: correlationId("cor_session"),
    issuedAt: "2026-08-01T12:00:00.000Z",
    expiresAt: "2026-08-01T13:00:00.000Z",
  });
  await repository.save(sessionRecord(session));

  const loaded = await repository.find({
    tenantId: tenantId("tenant_acme"),
    workspaceId: workspaceId("workspace_main"),
  }, session.sessionId);
  assert(loaded !== undefined);
  assertEquals(loaded.state, "active");
  assertEquals(
    await repository.find(
      { tenantId: tenantId("tenant_other") },
      session.sessionId,
    ),
    undefined,
  );
  assertEquals(
    await repository.find(
      { tenantId: tenantId("tenant_acme") },
      session.sessionId,
    ),
    undefined,
  );

  await repository.revoke(
    {
      tenantId: tenantId("tenant_acme"),
      workspaceId: workspaceId("workspace_main"),
    },
    session.sessionId,
    "2026-08-01T12:10:00.000Z",
  );
  const revoked = await repository.find({
    tenantId: tenantId("tenant_acme"),
    workspaceId: workspaceId("workspace_main"),
  }, session.sessionId);
  assertEquals(revoked?.state, "revoked");
  await assertRejects(
    () =>
      Promise.resolve().then(() => {
        if (revoked === undefined) throw new Error("expected revoked session");
        assertSessionRecordActive(revoked, "2026-08-01T12:11:00.000Z");
      }),
    Error,
    "is revoked",
  );
});
