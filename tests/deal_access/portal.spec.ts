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
import { activateParticipation } from "../../src/deal_access/lifecycle.ts";
import {
  type PortalObjectLoader,
  readPortalObject,
} from "../../src/deal_access/portal.ts";
import { InMemoryDealAccessRepository } from "../../src/deal_access/repository.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";

const scope = {
  tenantId: "tenant_acme" as TenantId,
  workspaceId: "workspace_buy-side" as WorkspaceId,
  dealId: "deal_northstar" as DealId,
};
const now = "2026-08-07T12:00:00.000Z";
const actor = {
  id: "participant_external-1" as ActorId,
  kind: "external",
  state: "active",
} as const satisfies ActorReference;
const context: RequestContext = {
  actorId: actor.id,
  tenantId: scope.tenantId,
  workspaceId: scope.workspaceId,
  dealId: scope.dealId,
  correlationId: "cor_portal-read" as CorrelationId,
  origin: "http",
};

class RecordingPortalObjectLoader implements PortalObjectLoader {
  calls = 0;
  constructor(private readonly snapshot: PortalObjectSnapshot) {}

  load(): Promise<PortalObjectSnapshot> {
    this.calls += 1;
    return Promise.resolve(this.snapshot);
  }
}

function participation() {
  return activateParticipation(
    createParticipation({
      id: participationId("participation_portal-1"),
      invitationId: invitationId("invitation_portal-1"),
      scope,
      participantId: "participant_external-1",
      invitationTokenDigest: "0".repeat(64),
      now,
    }),
    1,
    now,
  );
}

function grant() {
  return createExternalGrant({
    id: externalGrantId("grant_portal-1"),
    participation: participation(),
    purpose: "document_review",
    sponsor: { actorId: "actor_sponsor" as ActorId, kind: "human" },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_document-1"),
      kind: "document",
      actions: ["read"],
    }, {
      objectId: portalObjectId("object_summary-1"),
      kind: "deal_summary",
      actions: ["read"],
    }],
    actions: ["read"],
    fields: ["public_reference", "title", "status"],
    now,
  });
}

function snapshot(): PortalObjectSnapshot {
  return {
    internalId: portalObjectId("object_document-1"),
    publicReference: "portal-ref-document-1",
    kind: "document",
    title: "Reviewed document",
    status: "available",
    internalFindings: ["hidden finding"],
    restrictedEvidence: ["hidden evidence"],
    negotiationStrategy: "hidden strategy",
  };
}

async function repositoryWithGrant(): Promise<InMemoryDealAccessRepository> {
  const repository = new InMemoryDealAccessRepository();
  await repository.transaction(async (store) => {
    await store.saveParticipation(participation());
    await store.saveGrant(grant());
  });
  return repository;
}

Deno.test("portal reads authorize before loading and omit internal fields", async () => {
  const repository = await repositoryWithGrant();
  const loader = new RecordingPortalObjectLoader(snapshot());
  const result = await readPortalObject({
    context,
    actor,
    repository,
    grantId: externalGrantId("grant_portal-1"),
    object: {
      objectId: portalObjectId("object_document-1"),
      kind: "document",
    },
    action: "read",
    purpose: "document_review",
    sponsor: "actor_sponsor" as ActorId,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["public_reference", "title", "status"],
    clock: { now: () => now },
    loader,
  });

  assertEquals(result.kind, "loaded");
  if (result.kind !== "loaded") return;
  assertEquals(result.value, {
    reference: "portal-ref-document-1",
    title: "Reviewed document",
    status: "available",
    allowedActions: ["read"],
  });
  assertEquals(loader.calls, 1);
  assert(!("internalFindings" in result.value));
  assert(!("restrictedEvidence" in result.value));
  assert(!("negotiationStrategy" in result.value));
});

Deno.test("portal denial returns protected not-found without loading", async () => {
  const repository = await repositoryWithGrant();
  const loader = new RecordingPortalObjectLoader(snapshot());
  const result = await readPortalObject({
    context,
    actor,
    repository,
    grantId: externalGrantId("grant_portal-1"),
    object: {
      objectId: portalObjectId("object_document-1"),
      kind: "document",
    },
    action: "read",
    purpose: "different_purpose",
    sponsor: "actor_sponsor" as ActorId,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title"],
    clock: { now: () => now },
    loader,
  });

  assertEquals(result.kind, "protected_not_found");
  if (result.kind !== "protected_not_found") return;
  assertEquals(result.response.error.code, "PROTECTED_NOT_FOUND");
  assertEquals(loader.calls, 0);
});

Deno.test("portal scope binds the requested object ID to its object kind", async () => {
  const repository = await repositoryWithGrant();
  const loader = new RecordingPortalObjectLoader(snapshot());
  const result = await readPortalObject({
    context,
    actor,
    repository,
    grantId: externalGrantId("grant_portal-1"),
    object: {
      objectId: portalObjectId("object_document-1"),
      kind: "deal_summary",
    },
    action: "read",
    purpose: "document_review",
    sponsor: "actor_sponsor" as ActorId,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title"],
    clock: { now: () => now },
    loader,
  });

  assertEquals(result.kind, "protected_not_found");
  assertEquals(loader.calls, 0);
});
