import { assertEquals, assertRejects } from "@std/assert";
import {
  actorId,
  createAdministrationContext,
  createSessionContext,
  IdentityAccessError,
  IdentityAccessService,
  InMemoryCommandIdempotencyStore,
  InMemoryIdentityAccessRepository,
  institutionId,
  revocationId,
  sessionId,
  SessionRegistry,
  tenantId,
  userIdentityId,
} from "../../src/identity_access/v1.ts";

const tenant = tenantId("tenant_service");
const actor = {
  id: actorId("actor_service"),
  kind: "human" as const,
  state: "active" as const,
};
const context = createAdministrationContext({
  actor,
  request: {
    actorId: actor.id,
    tenantId: tenant,
    correlationId: "cor_service" as never,
    origin: "internal",
  },
  now: "2026-08-01T12:00:00.000Z",
});

function service(): IdentityAccessService {
  return new IdentityAccessService({
    repository: new InMemoryIdentityAccessRepository(),
    idempotency: new InMemoryCommandIdempotencyStore(),
    eventIdGenerator: (() => {
      let count = 0;
      return () => `event_service-${++count}`;
    })(),
  });
}

Deno.test("commands use injected idempotency and publish versioned lifecycle events", async () => {
  const access = service();
  const input = {
    id: institutionId("institution_service"),
    tenantId: tenant,
    name: "Service Capital",
  };
  const first = await access.createInstitution(
    input,
    context,
    "idem_create-service",
  );
  const replay = await access.createInstitution(
    input,
    context,
    "idem_create-service",
  );
  assertEquals(replay, first);

  await assertRejects(
    () =>
      access.createInstitution(
        { ...input, name: "Changed Payload" },
        context,
        "idem_create-service",
      ),
    IdentityAccessError,
    "IDEMPOTENCY_CONFLICT",
  );
  const suspended = await access.suspendInstitution(
    first.id,
    { expectedVersion: 1, reason: "security review" },
    context,
    "idem_suspend-service",
  );
  assertEquals(suspended.state, "suspended");
  assertEquals(suspended.version, 2);
  assertEquals(access.events().map(({ eventType }) => eventType), [
    "institution.created",
    "institution.suspended",
  ]);
});

Deno.test("concurrent reuse of one idempotency key cannot double-write", async () => {
  const access = service();
  const input = {
    id: institutionId("institution_concurrent"),
    tenantId: tenant,
    name: "Concurrent Capital",
  };
  const results = await Promise.allSettled([
    access.createInstitution(input, context, "idem_concurrent-service"),
    access.createInstitution(input, context, "idem_concurrent-service"),
  ]);
  assertEquals(
    results.filter((result) => result.status === "fulfilled").length,
    2,
  );
  assertEquals(access.events().map(({ eventType }) => eventType), [
    "institution.created",
  ]);
});

Deno.test("revocation invalidates actor sessions and queued job effects", async () => {
  const repository = new InMemoryIdentityAccessRepository();
  const registry = new SessionRegistry();
  const invalidated: string[] = [];
  const access = new IdentityAccessService({
    repository,
    eventIdGenerator: (() => {
      let count = 0;
      return () => `event_revoke-${++count}`;
    })(),
    sessionRegistry: registry,
    jobInvalidation: {
      invalidate: (input) => {
        invalidated.push(`${input.targetType}:${input.targetId}`);
        return Promise.resolve();
      },
    },
  });
  const session = createSessionContext({
    sessionId: sessionId("session_service"),
    principal: { actor, tenantId: tenant },
    correlationId: "cor_session-service" as never,
    issuedAt: context.now,
    expiresAt: "2026-08-01T13:00:00.000Z",
  });
  registry.register(session);
  const identity = await access.createUserIdentity(
    {
      id: userIdentityId("identity_service"),
      tenantId: tenant,
      providerSubject: "provider-service",
      displayName: "Service User",
    },
    context,
    "idem_identity-service",
  );
  await access.revoke(
    "user_identity",
    identity.id,
    {
      revocationId: revocationId("revocation_service"),
      expectedVersion: 1,
      reason: "offboarding",
      invalidatedActorId: actor.id,
    },
    context,
    "idem_revoke-service",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        registry.assertActive(session.sessionId, context.now)
      ),
    Error,
    "SESSION_REVOKED",
  );
  assertEquals(invalidated, [`user_identity:${identity.id}`]);
});
