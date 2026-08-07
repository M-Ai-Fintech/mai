import { assert, assertEquals } from "@std/assert";
import {
  externalGrantId,
  invitationId,
  participationId,
  portalObjectId,
} from "../../src/deal_access/ids.ts";
import {
  createExternalGrant,
  createParticipation,
  type PortalObjectSnapshot,
} from "../../src/deal_access/model.ts";
import {
  activateParticipation,
  revokeGrant,
} from "../../src/deal_access/lifecycle.ts";
import {
  type PortalObjectLoader,
  readPortalObject,
} from "../../src/deal_access/portal.ts";
import { InMemoryDealAccessRepository } from "../../src/deal_access/repository.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

const scope = {
  tenantId: "tenant_trusted_portal" as TenantId,
  workspaceId: "workspace_trusted_portal" as WorkspaceId,
  dealId: "deal_trusted_portal" as DealId,
};
const now = "2026-08-07T12:00:00.000Z";
const actor: ActorReference = {
  id: "participant_trusted" as ActorId,
  kind: "external",
  state: "active",
};
const context: RequestContext = {
  actorId: actor.id,
  ...scope,
  correlationId: "cor_trusted_portal" as CorrelationId,
  origin: "http",
};

class SnapshotLoader implements PortalObjectLoader {
  calls = 0;

  constructor(private readonly value: PortalObjectSnapshot) {}

  load(): Promise<PortalObjectSnapshot> {
    this.calls += 1;
    return Promise.resolve(this.value);
  }
}

function participation() {
  return activateParticipation(
    createParticipation({
      id: participationId("participation_trusted-1"),
      invitationId: invitationId("invitation_trusted-1"),
      scope,
      participantId: actor.id,
      invitationTokenDigest: "0".repeat(64),
      now,
    }),
    1,
    now,
  );
}

function grant() {
  return createExternalGrant({
    id: externalGrantId("grant_trusted-1"),
    participation: participation(),
    purpose: "document_review",
    sponsor: { actorId: "actor_trusted_sponsor" as ActorId, kind: "human" },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_trusted-1"),
      kind: "document",
      actions: ["read"],
    }],
    actions: ["read"],
    fields: ["public_reference", "title"],
    now,
  });
}

function snapshot(id = "object_trusted-1"): PortalObjectSnapshot {
  return {
    internalId: portalObjectId(id),
    publicReference: "portal-trusted-1",
    kind: "document",
    title: "Trusted document",
    status: "available",
    internalFindings: ["must stay hidden"],
    restrictedEvidence: ["must stay hidden"],
    negotiationStrategy: "must stay hidden",
  };
}

async function repositoryWithGrant() {
  const repository = new InMemoryDealAccessRepository();
  await repository.transaction(async (store) => {
    const currentParticipation = participation();
    await store.saveParticipation(currentParticipation);
    await store.saveGrant(grant());
  });
  return repository;
}

function readInput(
  repository: InMemoryDealAccessRepository,
  loader: PortalObjectLoader,
) {
  return {
    context,
    actor,
    repository,
    grantId: externalGrantId("grant_trusted-1"),
    object: { objectId: "object_trusted-1", kind: "document" as const },
    action: "read" as const,
    purpose: "document_review",
    sponsor: "actor_trusted_sponsor" as ActorId,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["public_reference" as const, "title" as const],
    clock: { now: () => now },
    loader,
  };
}

Deno.test("portal reads use trusted scoped state and validate the loaded object identity", async () => {
  const repository = await repositoryWithGrant();
  const loader = new SnapshotLoader(snapshot());
  const result = await readPortalObject(readInput(repository, loader));

  assertEquals(result.kind, "loaded");
  assertEquals(loader.calls, 1);
  if (result.kind === "loaded") {
    assertEquals(result.value.title, "Trusted document");
    assert(!("internalFindings" in result.value));
  }

  const mismatch = new SnapshotLoader(snapshot("object_other"));
  const mismatchResult = await readPortalObject(
    readInput(repository, mismatch),
  );
  assertEquals(mismatchResult.kind, "protected_not_found");
  assertEquals(mismatch.calls, 1);
});

Deno.test("revoked persisted grant denies portal access without loading the object", async () => {
  const repository = await repositoryWithGrant();
  await repository.transaction(async (store) => {
    const revoked = revokeGrant(grant(), 1, now);
    await store.saveGrant(revoked, 1);
  });
  const loader = new SnapshotLoader(snapshot());
  const result = await readPortalObject(readInput(repository, loader));

  assertEquals(result.kind, "protected_not_found");
  assertEquals(loader.calls, 0);
});
