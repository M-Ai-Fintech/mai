import { assertEquals, assertRejects } from "@std/assert";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import {
  DealAccessAuthorizationError,
  DealAccessSessionInvalidationError,
} from "../../src/deal_access/errors.ts";
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
import {
  AllowingDealAccessAuthorization,
  INVITATION_TOKEN,
} from "./support.ts";

const scope = {
  tenantId: "tenant_invalidation" as TenantId,
  workspaceId: "workspace_invalidation" as WorkspaceId,
  dealId: "deal_invalidation" as DealId,
};
const human: ActorReference = {
  id: "actor_invalidation" as ActorId,
  kind: "human",
  state: "active",
};
const now = "2026-08-07T12:00:00.000Z";

class InvalidationIds implements DealAccessIdFactory {
  private sequence = 0;

  nextParticipationId() {
    return participationId(`participation_invalidation-${++this.sequence}`);
  }
  nextInvitationId() {
    return invitationId(`invitation_invalidation-${++this.sequence}`);
  }
  nextExternalGrantId() {
    return externalGrantId(`grant_invalidation-${++this.sequence}`);
  }
  nextSubmissionId() {
    return submissionId(`submission_invalidation-${++this.sequence}`);
  }
  nextPortalReceiptId() {
    return portalReceiptId(`receipt_invalidation-${++this.sequence}`);
  }
  nextEventId(sequence: string) {
    return `event_${sequence}-${++this.sequence}`;
  }
}

class FailOnceSessions {
  grantCalls = 0;

  invalidateGrant(): Promise<void> {
    this.grantCalls += 1;
    if (this.grantCalls === 1) {
      return Promise.reject(new Error("session backend unavailable"));
    }
    return Promise.resolve();
  }

  invalidateParticipation(): Promise<void> {
    return Promise.resolve();
  }
}

function context(origin: RequestContext["origin"]): RequestContext {
  return {
    actorId: human.id,
    ...scope,
    correlationId: `cor_invalidation-${origin}` as CorrelationId,
    origin,
  };
}

function inviteCommand() {
  return {
    type: "invite_participant" as const,
    context: context("internal"),
    actor: human,
    idempotencyKey: "idem_invalidation-invite" as IdempotencyKey,
    participantId: "participant_invalidation",
    invitationToken: INVITATION_TOKEN,
    purpose: "document_review",
    sponsor: { actorId: human.id, kind: "human" as const },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_invalidation"),
      kind: "document" as const,
      actions: ["read" as const],
    }],
    actions: ["read"],
    fields: ["title"],
  };
}

Deno.test("failed session invalidation remains durable and is retryable", async () => {
  const repository = new InMemoryDealAccessRepository();
  const sessions = new FailOnceSessions();
  const service = new DealAccessService({
    repository,
    authorization: new AllowingDealAccessAuthorization(),
    ids: new InvalidationIds(),
    clock: { now: () => now },
    sessions,
  });
  const invitation = await service.inviteParticipant(inviteCommand());

  await assertRejects(
    () =>
      service.revokeGrant({
        type: "revoke_grant",
        context: context("internal"),
        actor: human,
        idempotencyKey: "idem_invalidation-revoke" as IdempotencyKey,
        grantId: invitation.grant.id,
        expectedVersion: 1,
      }),
    DealAccessSessionInvalidationError,
  );

  const pending = await repository.transaction((store) =>
    store.listPendingSessionInvalidations(scope, {
      grantId: invitation.grant.id,
      reason: "revoked",
    })
  );
  assertEquals(pending.length, 1);
  assertEquals(pending[0].attemptCount, 1);
  assertEquals(pending[0].lastError, "session backend unavailable");

  assertEquals(
    await service.retrySessionInvalidations({ context: context("job") }),
    { attempted: 1, completed: 1, failed: 0 },
  );
  assertEquals(sessions.grantCalls, 2);
  assertEquals(
    await repository.transaction((store) =>
      store.listPendingSessionInvalidations(scope)
    ),
    [],
  );
  assertEquals(repository.invalidations[0]?.state, "completed");
});

Deno.test("HTTP callers cannot invoke the invalidation worker", async () => {
  const service = new DealAccessService({
    repository: new InMemoryDealAccessRepository(),
    authorization: new AllowingDealAccessAuthorization(),
    ids: new InvalidationIds(),
    clock: { now: () => now },
    sessions: new FailOnceSessions(),
  });

  await assertRejects(
    () => service.retrySessionInvalidations({ context: context("http") }),
    DealAccessAuthorizationError,
  );
});
