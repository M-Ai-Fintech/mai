import { assertEquals, assertRejects } from "@std/assert";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
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
  DealAccessAuthorizationError,
  DealAccessIdempotencyConflictError,
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
import type { PortalObjectLoader } from "../../src/deal_access/portal.ts";
import type { PortalObjectSnapshot } from "../../src/deal_access/model.ts";

const scope = {
  tenantId: "tenant_acme" as TenantId,
  workspaceId: "workspace_buy-side" as WorkspaceId,
  dealId: "deal_northstar" as DealId,
};
const human: ActorReference = {
  id: "actor_sponsor" as ActorId,
  kind: "human",
  state: "active",
};
const now = "2026-08-07T12:00:00.000Z";

class SequentialIds implements DealAccessIdFactory {
  private sequence = 0;

  nextParticipationId() {
    return participationId(`participation_flow-${++this.sequence}`);
  }
  nextInvitationId() {
    return invitationId(`invitation_flow-${++this.sequence}`);
  }
  nextExternalGrantId() {
    return externalGrantId(`grant_flow-${++this.sequence}`);
  }
  nextSubmissionId() {
    return submissionId(`submission_flow-${++this.sequence}`);
  }
  nextPortalReceiptId() {
    return portalReceiptId(`receipt_flow-${++this.sequence}`);
  }
  nextEventId(sequence: string) {
    return `event_${sequence}-${++this.sequence}`;
  }
}

class RecordingSessions {
  readonly grants: string[] = [];
  readonly participations: string[] = [];

  invalidateGrant(id: string): Promise<void> {
    this.grants.push(id);
    return Promise.resolve();
  }

  invalidateParticipation(id: string): Promise<void> {
    this.participations.push(id);
    return Promise.resolve();
  }
}

class RecordingObjectLoader implements PortalObjectLoader {
  calls = 0;

  load(): Promise<PortalObjectSnapshot> {
    this.calls += 1;
    return Promise.resolve({
      internalId: portalObjectId("object_submission-1"),
      publicReference: "portal-ref-submission-1",
      kind: "submission_form",
      title: "Submission form",
      status: "open",
    });
  }
}

class ReauthorizingDelivery {
  calls = 0;

  async deliver(input: {
    readonly beforeExternalEffect: () => Promise<unknown>;
  }): Promise<void> {
    await input.beforeExternalEffect();
    this.calls += 1;
  }
}

function context(
  actorId: ActorId,
  origin: RequestContext["origin"],
): RequestContext {
  return {
    actorId,
    ...scope,
    correlationId: `cor_flow-${origin}` as CorrelationId,
    origin,
  };
}

function inviteCommand(key: string) {
  return {
    type: "invite_participant" as const,
    context: context(human.id, "internal"),
    actor: human,
    idempotencyKey: `idem_invite-${key}` as IdempotencyKey,
    participantId: "participant_flow-1",
    purpose: "submission_review",
    sponsor: { actorId: human.id, kind: "human" as const },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_submission-1"),
      kind: "submission_form" as const,
      actions: ["submit" as const],
    }],
    actions: ["submit"],
    fields: ["title"],
  };
}

async function prepared() {
  let current = now;
  const repository = new InMemoryDealAccessRepository();
  const sessions = new RecordingSessions();
  const service = new DealAccessService({
    repository,
    ids: new SequentialIds(),
    clock: { now: () => current },
    sessions,
  });
  const invitation = await service.inviteParticipant(inviteCommand("prepared"));
  const external: ActorReference = {
    id: invitation.participation.participantId as ActorId,
    kind: "external",
    state: "active",
  };
  const accepted = await service.acceptInvitation({
    type: "accept_invitation",
    context: context(external.id, "http"),
    actor: external,
    idempotencyKey: "idem_accept-prepared" as IdempotencyKey,
    participationId: invitation.participation.id,
    participantId: invitation.participation.participantId,
    expectedVersion: 1,
  });
  return {
    repository,
    sessions,
    service,
    invitation,
    accepted,
    external,
    setNow(value: string) {
      current = value;
    },
  };
}

Deno.test("submission is authorized, stored, and replayed with a safe receipt", async () => {
  const state = await prepared();
  const loader = new RecordingObjectLoader();
  const command = {
    type: "submit_portal_data" as const,
    context: context(state.external.id, "http"),
    actor: state.external,
    idempotencyKey: "idem_submit-one" as IdempotencyKey,
    grantId: state.invitation.grant.id,
    object: {
      objectId: "object_submission-1",
      kind: "submission_form" as const,
    },
    purpose: "submission_review",
    sponsor: human.id,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title" as const],
    payload: { title: "Participant response" },
  };
  const first = await state.service.submitPortalData(command, loader);
  const replay = await state.service.submitPortalData(command, loader);

  assertEquals(replay, first);
  assertEquals(first.submission.state, "queued");
  assertEquals(first.receipt.id, "receipt_flow-7");
  assertEquals(first.receipt.submissionReference, first.receipt.id);
  assertEquals(
    await state.repository.transaction((store) =>
      store.findReceipt(state.invitation.grant.scope, first.receipt.id)
    ),
    first.receipt,
  );
  assertEquals(loader.calls, 1);
  await assertRejects(
    () =>
      state.service.submitPortalData({
        ...command,
        payload: { title: "changed" },
      }, loader),
    DealAccessIdempotencyConflictError,
  );
});

Deno.test("revocation invalidates active external sessions", async () => {
  const state = await prepared();
  const revoked = await state.service.revokeGrant({
    type: "revoke_grant",
    context: context(human.id, "internal"),
    actor: human,
    idempotencyKey: "idem_revoke-one" as IdempotencyKey,
    grantId: state.invitation.grant.id,
    expectedVersion: 1,
  });

  assertEquals(revoked.state, "revoked");
  assertEquals(state.sessions.grants, [state.invitation.grant.id]);
});

Deno.test("offboarding and expiry invalidate grant sessions", async () => {
  const state = await prepared();
  const offboarded = await state.service.offboardParticipant({
    type: "offboard_participant",
    context: context(human.id, "internal"),
    actor: human,
    idempotencyKey: "idem_offboard-one" as IdempotencyKey,
    participationId: state.accepted.id,
    expectedParticipationVersion: 2,
  });
  assertEquals(offboarded.state, "offboarded");
  assertEquals(state.sessions.participations, [state.accepted.id]);

  const later = await prepared();
  later.setNow("2026-08-09T12:00:00.000Z");
  assertEquals(
    await later.service.expireGrants({ context: context(human.id, "job") }),
    1,
  );
  assertEquals(later.sessions.grants, [later.invitation.grant.id]);
});

Deno.test("submission after revocation is protected not-found", async () => {
  const state = await prepared();
  await state.service.revokeGrant({
    type: "revoke_grant",
    context: context(human.id, "internal"),
    actor: human,
    idempotencyKey: "idem_revoke-before-submit" as IdempotencyKey,
    grantId: state.invitation.grant.id,
    expectedVersion: 1,
  });
  await assertRejects(
    () =>
      state.service.submitPortalData({
        type: "submit_portal_data",
        context: context(state.external.id, "http"),
        actor: state.external,
        idempotencyKey: "idem_submit-revoked" as IdempotencyKey,
        grantId: state.invitation.grant.id,
        object: { objectId: "object_submission-1", kind: "submission_form" },
        purpose: "submission_review",
        sponsor: human.id,
        requestedExpiry: "2026-08-08T12:00:00.000Z",
        requestedFields: ["title"],
        payload: { title: "blocked" },
      }, new RecordingObjectLoader()),
    DealAccessAuthorizationError,
  );
});

Deno.test("queued submission reauthorizes immediately before delivery", async () => {
  const state = await prepared();
  const submitted = await state.service.submitPortalData({
    type: "submit_portal_data",
    context: context(state.external.id, "http"),
    actor: state.external,
    idempotencyKey: "idem_submit-queued" as IdempotencyKey,
    grantId: state.invitation.grant.id,
    object: { objectId: "object_submission-1", kind: "submission_form" },
    purpose: "submission_review",
    sponsor: human.id,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title"],
    payload: { title: "queued response" },
  }, new RecordingObjectLoader());
  const delivery = new ReauthorizingDelivery();

  const completed = await state.service.processQueuedSubmission({
    context: context(state.external.id, "job"),
    actor: state.external,
    submissionId: submitted.submission.id,
    purpose: "submission_review",
    sponsor: human.id,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title"],
  }, delivery);

  assertEquals(completed.state, "accepted");
  assertEquals(delivery.calls, 1);
});

Deno.test("queued submission is not delivered after grant revocation", async () => {
  const state = await prepared();
  const submitted = await state.service.submitPortalData({
    type: "submit_portal_data",
    context: context(state.external.id, "http"),
    actor: state.external,
    idempotencyKey: "idem_submit-queued-revoked" as IdempotencyKey,
    grantId: state.invitation.grant.id,
    object: { objectId: "object_submission-1", kind: "submission_form" },
    purpose: "submission_review",
    sponsor: human.id,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title"],
    payload: { title: "queued response" },
  }, new RecordingObjectLoader());
  await state.service.revokeGrant({
    type: "revoke_grant",
    context: context(human.id, "internal"),
    actor: human,
    idempotencyKey: "idem_revoke-queued" as IdempotencyKey,
    grantId: state.invitation.grant.id,
    expectedVersion: 1,
  });
  const delivery = new ReauthorizingDelivery();

  await assertRejects(
    () =>
      state.service.processQueuedSubmission({
        context: context(state.external.id, "job"),
        actor: state.external,
        submissionId: submitted.submission.id,
        purpose: "submission_review",
        sponsor: human.id,
        requestedExpiry: "2026-08-08T12:00:00.000Z",
        requestedFields: ["title"],
      }, delivery),
    DealAccessAuthorizationError,
  );
  assertEquals(delivery.calls, 0);
});
