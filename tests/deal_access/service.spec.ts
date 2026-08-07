import { assertEquals, assertRejects } from "@std/assert";
import {
  externalGrantId,
  invitationId,
  participationId,
  portalObjectId,
  portalReceiptId,
  submissionId,
} from "../../src/deal_access/ids.ts";
import { InMemoryDealAccessRepository } from "../../src/deal_access/repository.ts";
import {
  DealAccessIdempotencyConflictError,
  DealAccessInvariantError,
} from "../../src/deal_access/errors.ts";
import {
  type DealAccessIdFactory,
  DealAccessService,
} from "../../src/deal_access/service.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import {
  AllowingDealAccessAuthorization,
  INVITATION_TOKEN,
} from "./support.ts";

const scope = {
  tenantId: "tenant_acme" as TenantId,
  workspaceId: "workspace_buy-side" as WorkspaceId,
  dealId: "deal_northstar" as DealId,
};
const now = "2026-08-07T12:00:00.000Z";
const actor: ActorReference = {
  id: "actor_sponsor" as ActorId,
  kind: "human",
  state: "active",
};
const context: RequestContext = {
  actorId: actor.id,
  ...scope,
  correlationId: "cor_invite" as CorrelationId,
  origin: "internal",
};

class SequentialDealAccessIds implements DealAccessIdFactory {
  nextParticipationId() {
    return participationId("participation_service-1");
  }
  nextInvitationId() {
    return invitationId("invitation_service-1");
  }
  nextExternalGrantId() {
    return externalGrantId("grant_service-1");
  }
  nextSubmissionId() {
    return submissionId("submission_service-1");
  }
  nextPortalReceiptId() {
    return portalReceiptId("receipt_service-1");
  }
  nextEventId(sequence: string) {
    return `event_${sequence}`;
  }
}

function service() {
  return new DealAccessService({
    repository: new InMemoryDealAccessRepository(),
    authorization: new AllowingDealAccessAuthorization(),
    ids: new SequentialDealAccessIds(),
    clock: { now: () => now },
    sessions: {
      invalidateGrant: () => Promise.resolve(),
      invalidateParticipation: () => Promise.resolve(),
    },
  });
}

function command(key: string) {
  return {
    type: "invite_participant" as const,
    context,
    actor,
    idempotencyKey: `idem_${key}` as IdempotencyKey,
    participantId: "participant_external-1",
    invitationToken: INVITATION_TOKEN,
    purpose: "document_review",
    sponsor: { actorId: actor.id, kind: "human" as const },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_document-1"),
      kind: "document" as const,
      actions: ["read" as const],
    }],
    actions: ["read"],
    fields: ["public_reference", "title"],
  };
}

Deno.test("invitation creates explicit participation and external grant", async () => {
  const result = await service().inviteParticipant(command("create"));

  assertEquals(result.participation.state, "invited");
  assertEquals(result.grant.scope.dealId, scope.dealId);
  assertEquals(result.grant.sponsor.actorId, actor.id);
});

Deno.test("invitation is idempotent and rejects changed payloads", async () => {
  const dealAccess = service();
  const first = await dealAccess.inviteParticipant(command("replay"));
  const replay = await dealAccess.inviteParticipant(command("replay"));

  assertEquals(replay, first);
  await assertRejects(
    () =>
      dealAccess.inviteParticipant({ ...command("replay"), purpose: "other" }),
    DealAccessIdempotencyConflictError,
  );
});

Deno.test("AI actors cannot create external grants as human sponsors", async () => {
  const aiActor: ActorReference = { ...actor, kind: "ai" };
  await assertRejects(
    () => service().inviteParticipant({ ...command("ai"), actor: aiActor }),
    DealAccessInvariantError,
  );
});
