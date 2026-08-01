import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  type ActorReference,
  createAdministrationContext,
  createIdentityAccessEvent,
  createInstitution,
  type IdentityAccessEvent,
  InMemoryIdentityAccessRepository,
  tenantId,
} from "../../src/identity_access/v1.ts";

const tenant = tenantId("tenant_repository");
const actor: ActorReference = {
  id: "actor_repository" as ActorReference["id"],
  kind: "human",
  state: "active",
};
const context = createAdministrationContext({
  actor,
  request: {
    actorId: actor.id,
    tenantId: tenant,
    correlationId: "cor_repository" as never,
    origin: "internal",
  },
  now: "2026-08-01T12:00:00.000Z",
});

function eventFor(
  aggregate: ReturnType<typeof createInstitution>,
): IdentityAccessEvent {
  return createIdentityAccessEvent({
    aggregate,
    eventId: "event_repository",
    eventType: "institution.created",
    context,
  });
}

Deno.test("repository loads only tenant-scoped aggregates and retains events", async () => {
  const repository = new InMemoryIdentityAccessRepository();
  const institution = createInstitution({
    id: "institution_repository" as never,
    tenantId: tenant,
    name: "Repository Capital",
  }, context);
  await repository.save(institution, undefined, eventFor(institution));

  assertEquals(
    (await repository.find({ tenantId: tenant }, "institution", institution.id))
      ?.id,
    institution.id,
  );
  assertEquals(
    await repository.find(
      { tenantId: tenantId("tenant_other") },
      "institution",
      institution.id,
    ),
    undefined,
  );
  assertEquals(repository.events().map(({ eventType }) => eventType), [
    "institution.created",
  ]);
});

Deno.test("repository rejects stale writes and does not expose unscoped workspace loads", async () => {
  const repository = new InMemoryIdentityAccessRepository();
  const institution = createInstitution({
    id: "institution_stale" as never,
    tenantId: tenant,
    name: "Stale Capital",
  }, context);
  await repository.save(institution, undefined, eventFor(institution));
  await assertRejects(
    () => repository.save(institution, 1, eventFor(institution)),
    Error,
    "already exists",
  );
  assertEquals(await repository.list({ tenantId: tenant }, "workspace"), []);
  assert(
    repository.list({
      tenantId: tenant,
      workspaceId: "workspace_missing" as never,
    }, "institution"),
  );
});
