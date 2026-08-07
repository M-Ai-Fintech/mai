import { assertEquals, assertThrows } from "@std/assert";
import {
  activateParticipation,
  expireGrant,
  offboardParticipation,
  revokeGrant,
} from "../../src/deal_access/lifecycle.ts";
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
import { DealAccessVersionConflictError } from "../../src/deal_access/errors.ts";
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
    id: participationId("participation_lifecycle-1"),
    invitationId: invitationId("invitation_lifecycle-1"),
    scope,
    participantId: "participant_external-1",
    now,
  });
}

function grant() {
  return createExternalGrant({
    id: externalGrantId("grant_lifecycle-1"),
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
    fields: ["title"],
    now,
  });
}

Deno.test("participation acceptance and grant revocation are versioned", () => {
  const active = activateParticipation(participation(), 1, now);
  const revoked = revokeGrant(grant(), 1, now);

  assertEquals(active.state, "active");
  assertEquals(active.version, 2);
  assertEquals(revoked.state, "revoked");
  assertEquals(revoked.version, 2);
});

Deno.test("offboarding expires participation and its grant", () => {
  const active = activateParticipation(participation(), 1, now);
  const result = offboardParticipation(active, grant(), active.version, 1, now);

  assertEquals(result.participation.state, "offboarded");
  assertEquals(result.grant.state, "offboarded");
});

Deno.test("expiry is durable and stale versions are rejected", () => {
  const expired = expireGrant(grant(), 1, "2026-08-08T12:00:00.000Z");
  assertEquals(expired.state, "expired");
  assertThrows(
    () => activateParticipation(participation(), 2, now),
    DealAccessVersionConflictError,
  );
});
