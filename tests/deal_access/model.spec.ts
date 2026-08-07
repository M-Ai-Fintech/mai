import { assertEquals, assertThrows } from "@std/assert";
import {
  createExternalGrant,
  createParticipation,
} from "../../src/deal_access/model.ts";
import {
  externalGrantId,
  invitationId,
  participationId,
  portalObjectId,
} from "../../src/deal_access/ids.ts";
import { DealAccessInvariantError } from "../../src/deal_access/errors.ts";
import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";

const scope = {
  tenantId: "tenant_acme" as TenantId,
  workspaceId: "workspace_buy-side" as WorkspaceId,
  dealId: "deal_northstar" as DealId,
};
const now = "2026-08-07T12:00:00.000Z";

function participation() {
  return createParticipation({
    id: participationId("participation_external-1"),
    invitationId: invitationId("invitation_external-1"),
    scope,
    participantId: "participant_external-1",
    invitationTokenDigest: "0".repeat(64),
    now,
  });
}

Deno.test("external grants bind a human sponsor, purpose, expiry, and object scope", () => {
  const grant = createExternalGrant({
    id: externalGrantId("grant_external-1"),
    participation: participation(),
    purpose: "document_review",
    sponsor: { actorId: "actor_sponsor" as ActorId, kind: "human" },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_document-1"),
      kind: "document",
      actions: ["read"],
    }],
    actions: ["read"],
    fields: ["title", "document_version"],
    now,
  });

  assertEquals(grant.purpose, "document_review");
  assertEquals(grant.sponsor.kind, "human");
  assertEquals(grant.objectScopes[0].objectId, "object_document-1");
  assertEquals(grant.state, "active");
});

Deno.test("external grant rejects missing scope and non-future expiry", () => {
  assertThrows(
    () =>
      createExternalGrant({
        id: externalGrantId("grant_invalid-1"),
        participation: participation(),
        purpose: "document_review",
        sponsor: { actorId: "actor_sponsor" as ActorId, kind: "human" },
        expiresAt: now,
        objectScopes: [],
        actions: [],
        fields: [],
        now,
      }),
    DealAccessInvariantError,
  );
});
