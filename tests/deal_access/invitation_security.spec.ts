import { assertEquals, assertRejects } from "@std/assert";
import {
  type AuthorizationDecision,
  evaluateAuthorization,
} from "../../src/platform/authz/v1.ts";
import {
  buildDealAccessAuthorizationRequest,
} from "../../src/deal_access/policy.ts";
import {
  externalGrantId,
  invitationId,
  participationId,
  portalObjectId,
} from "../../src/deal_access/ids.ts";
import { DealAccessAuthorizationError } from "../../src/deal_access/errors.ts";
import {
  type DealAccessAuthorizationInput,
  type DealAccessAuthorizationPort,
  type DealAccessIdFactory,
  DealAccessService,
} from "../../src/deal_access/service.ts";
import { InMemoryDealAccessRepository } from "../../src/deal_access/repository.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";

const scope = {
  tenantId: "tenant_invitation" as TenantId,
  workspaceId: "workspace_invitation" as WorkspaceId,
  dealId: "deal_invitation" as DealId,
};
const human: ActorReference = {
  id: "actor_invitation_sponsor" as ActorId,
  kind: "human",
  state: "active",
};
const token = "invitation-capability-token-with-at-least-32-bytes";

class InvitationIds implements DealAccessIdFactory {
  private sequence = 0;

  nextParticipationId() {
    return participationId(`participation_invitation-${++this.sequence}`);
  }
  nextInvitationId() {
    return invitationId(`invitation_invitation-${++this.sequence}`);
  }
  nextExternalGrantId() {
    return externalGrantId(`grant_invitation-${++this.sequence}`);
  }
  nextSubmissionId() {
    return `submission_invitation-${++this.sequence}` as never;
  }
  nextPortalReceiptId() {
    return `receipt_invitation-${++this.sequence}` as never;
  }
  nextEventId(sequence: string) {
    return `event_${sequence}-${++this.sequence}`;
  }
}

class AllowingAuthorization implements DealAccessAuthorizationPort {
  authorize(input: DealAccessAuthorizationInput): AuthorizationDecision {
    return evaluateAuthorization(
      buildDealAccessAuthorizationRequest(input, {
        roleFacts: [{
          id: "role_invitation",
          scope: input.scope,
          resourceKinds: [input.resource.kind],
          actions: [input.action],
          fields: [],
        }],
        grantFacts: [],
        restrictionFacts: [],
        relationshipFacts: [],
      }),
    );
  }
}

function context(actorId: ActorId): RequestContext {
  return {
    actorId,
    ...scope,
    correlationId: "cor_invitation" as CorrelationId,
    origin: "http",
  };
}

function inviteCommand(key: string) {
  return {
    type: "invite_participant" as const,
    context: { ...context(human.id), origin: "internal" as const },
    actor: human,
    idempotencyKey: `idem_invitation-${key}` as IdempotencyKey,
    participantId: "participant_intended",
    invitationToken: token,
    purpose: "document_review",
    sponsor: { actorId: human.id, kind: "human" as const },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_invitation"),
      kind: "document" as const,
      actions: ["read" as const],
    }],
    actions: ["read"],
    fields: ["title"],
  };
}

function fixture() {
  let current = "2026-08-07T12:00:00.000Z";
  const repository = new InMemoryDealAccessRepository();
  const service = new DealAccessService({
    repository,
    authorization: new AllowingAuthorization(),
    ids: new InvitationIds(),
    clock: { now: () => current },
    sessions: {
      invalidateGrant: () => Promise.resolve(),
      invalidateParticipation: () => Promise.resolve(),
    },
  });
  return {
    repository,
    service,
    setNow(value: string) {
      current = value;
    },
  };
}

async function invited() {
  const state = fixture();
  const invitation = await state.service.inviteParticipant(
    inviteCommand("accept"),
  );
  return { ...state, invitation };
}

Deno.test("acceptance binds the authenticated external actor to the intended participant", async () => {
  const state = await invited();
  const external: ActorReference = {
    id: "participant_intended" as ActorId,
    kind: "external",
    state: "active",
  };
  const accepted = await state.service.acceptInvitation({
    type: "accept_invitation",
    context: context(external.id),
    actor: external,
    idempotencyKey: "idem_invitation-accept" as IdempotencyKey,
    participationId: state.invitation.participation.id,
    invitationToken: token,
    expectedVersion: 1,
  });

  assertEquals(accepted.state, "active");
  assertEquals(
    await state.service.acceptInvitation({
      type: "accept_invitation",
      context: context(external.id),
      actor: external,
      idempotencyKey: "idem_invitation-accept" as IdempotencyKey,
      participationId: state.invitation.participation.id,
      invitationToken: token,
      expectedVersion: 1,
    }),
    accepted,
  );
});

Deno.test("wrong actor or capability cannot accept another participant invitation", async () => {
  const state = await invited();
  const wrongActor: ActorReference = {
    id: "participant_other" as ActorId,
    kind: "external",
    state: "active",
  };

  await assertRejects(
    () =>
      state.service.acceptInvitation({
        type: "accept_invitation",
        context: context(wrongActor.id),
        actor: wrongActor,
        idempotencyKey: "idem_invitation-wrong-actor" as IdempotencyKey,
        participationId: state.invitation.participation.id,
        invitationToken: token,
        expectedVersion: 1,
      }),
    DealAccessAuthorizationError,
  );
  await assertRejects(
    () =>
      state.service.acceptInvitation({
        type: "accept_invitation",
        context: context("participant_intended" as ActorId),
        actor: {
          id: "participant_intended" as ActorId,
          kind: "external",
          state: "active",
        },
        idempotencyKey: "idem_invitation-wrong-token" as IdempotencyKey,
        participationId: state.invitation.participation.id,
        invitationToken: "wrong-capability-token-with-at-least-32-bytes",
        expectedVersion: 1,
      }),
    DealAccessAuthorizationError,
  );
});

Deno.test("expired and already-consumed invitations are not reusable", async () => {
  const expired = await invited();
  expired.setNow("2026-08-09T12:00:00.000Z");
  await assertRejects(
    () =>
      expired.service.acceptInvitation({
        type: "accept_invitation",
        context: context("participant_intended" as ActorId),
        actor: {
          id: "participant_intended" as ActorId,
          kind: "external",
          state: "active",
        },
        idempotencyKey: "idem_invitation-expired" as IdempotencyKey,
        participationId: expired.invitation.participation.id,
        invitationToken: token,
        expectedVersion: 1,
      }),
    DealAccessAuthorizationError,
  );

  const consumed = await invited();
  const actor: ActorReference = {
    id: "participant_intended" as ActorId,
    kind: "external",
    state: "active",
  };
  await consumed.service.acceptInvitation({
    type: "accept_invitation",
    context: context(actor.id),
    actor,
    idempotencyKey: "idem_invitation-consume" as IdempotencyKey,
    participationId: consumed.invitation.participation.id,
    invitationToken: token,
    expectedVersion: 1,
  });
  await assertRejects(
    () =>
      consumed.service.acceptInvitation({
        type: "accept_invitation",
        context: context(actor.id),
        actor,
        idempotencyKey: "idem_invitation-consume-again" as IdempotencyKey,
        participationId: consumed.invitation.participation.id,
        invitationToken: token,
        expectedVersion: 1,
      }),
    DealAccessAuthorizationError,
  );
});
