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
import type {
  DealAccessRepository,
  DealAccessStore,
} from "../../src/deal_access/repository.ts";
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
import type {
  PortalObjectSnapshot,
  PortalSubmission,
} from "../../src/deal_access/model.ts";
import {
  AllowingDealAccessAuthorization,
  INVITATION_TOKEN,
} from "./support.ts";

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
  readonly deliveryIds: string[] = [];

  deliver(input: {
    readonly deliveryId: string;
    readonly approvedScope: unknown;
  }): Promise<void> {
    this.calls += 1;
    this.deliveryIds.push(input.deliveryId);
    return Promise.resolve();
  }
}

class IdempotentDelivery {
  attempts = 0;
  logicalDeliveries = 0;
  private readonly delivered = new Set<string>();

  deliver(input: {
    readonly deliveryId: string;
    readonly approvedScope: unknown;
  }): Promise<void> {
    this.attempts += 1;
    if (this.delivered.has(input.deliveryId)) return Promise.resolve();
    this.delivered.add(input.deliveryId);
    this.logicalDeliveries += 1;
    return Promise.resolve();
  }
}

class FailOnceCompletionRepository implements DealAccessRepository {
  private failNextCompletion = true;

  constructor(private readonly inner: DealAccessRepository) {}

  transaction<T>(callback: (store: DealAccessStore) => Promise<T>): Promise<T> {
    return this.inner.transaction((store) =>
      callback(
        new Proxy(store, {
          get: (target, property, receiver) => {
            if (property !== "saveSubmission") {
              return Reflect.get(target, property, receiver);
            }
            return (
              aggregate: PortalSubmission,
              expectedVersion?: number,
            ) => {
              if (this.failNextCompletion && aggregate.state === "accepted") {
                this.failNextCompletion = false;
                throw new Error("simulated local completion failure");
              }
              return target.saveSubmission(aggregate, expectedVersion);
            };
          },
        }),
      )
    );
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
    invitationToken: INVITATION_TOKEN,
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

async function prepared(
  repository: DealAccessRepository = new InMemoryDealAccessRepository(),
) {
  let current = now;
  const sessions = new RecordingSessions();
  const service = new DealAccessService({
    repository,
    authorization: new AllowingDealAccessAuthorization(),
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
    invitationToken: INVITATION_TOKEN,
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
  assertEquals(delivery.deliveryIds, [submitted.submission.deliveryId]);
});

Deno.test("queued delivery retries one stable external identity after local completion failure", async () => {
  const repository = new FailOnceCompletionRepository(
    new InMemoryDealAccessRepository(),
  );
  const state = await prepared(repository);
  const submitted = await state.service.submitPortalData({
    type: "submit_portal_data",
    context: context(state.external.id, "http"),
    actor: state.external,
    idempotencyKey: "idem_submit-crash-retry" as IdempotencyKey,
    grantId: state.invitation.grant.id,
    object: { objectId: "object_submission-1", kind: "submission_form" },
    purpose: "submission_review",
    sponsor: human.id,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title"],
    payload: { title: "crash-safe response" },
  }, new RecordingObjectLoader());
  const delivery = new IdempotentDelivery();
  const request = {
    context: context(state.external.id, "job"),
    actor: state.external,
    submissionId: submitted.submission.id,
    purpose: "submission_review",
    sponsor: human.id,
    requestedExpiry: "2026-08-08T12:00:00.000Z",
    requestedFields: ["title" as const],
  };

  await assertRejects(
    () => state.service.processQueuedSubmission(request, delivery),
    Error,
    "simulated local completion failure",
  );
  const completed = await state.service.processQueuedSubmission(
    request,
    delivery,
  );

  assertEquals(completed.state, "accepted");
  assertEquals(delivery.attempts, 2);
  assertEquals(delivery.logicalDeliveries, 1);
  assertEquals(completed.deliveryId, submitted.submission.deliveryId);
  assertEquals(completed.deliveryAttemptCount, 2);
  assertEquals(completed.lastDeliveryError, undefined);
  assertEquals(completed.deliveryCompletedAt, now);
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
