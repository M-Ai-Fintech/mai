import { assertEquals, assertRejects } from "@std/assert";
import { evaluateAuthorization } from "../../src/platform/authz/v1.ts";
import type {
  DealAccessAuthorizationInput,
  DealAccessAuthorizationPort,
} from "../../src/deal_access/service.ts";
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
import { issueInvitationToken } from "../../src/deal_access/capabilities.ts";
import {
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
  tenantId: "tenant_security" as TenantId,
  workspaceId: "workspace_security" as WorkspaceId,
  dealId: "deal_security" as DealId,
};
const now = "2026-08-07T12:00:00.000Z";
const human: ActorReference = {
  id: "actor_security" as ActorId,
  kind: "human",
  state: "active",
};

class SecurityIds implements DealAccessIdFactory {
  private sequence = 0;

  nextParticipationId() {
    return participationId(`participation_security-${++this.sequence}`);
  }
  nextInvitationId() {
    return invitationId(`invitation_security-${++this.sequence}`);
  }
  nextExternalGrantId() {
    return externalGrantId(`grant_security-${++this.sequence}`);
  }
  nextSubmissionId() {
    return `submission_security-${++this.sequence}` as never;
  }
  nextPortalReceiptId() {
    return `receipt_security-${++this.sequence}` as never;
  }
  nextEventId(sequence: string) {
    return `event_${sequence}-${++this.sequence}`;
  }
}

class PlatformAuthorization implements DealAccessAuthorizationPort {
  readonly calls: DealAccessAuthorizationInput[] = [];

  constructor(private readonly permitted: boolean) {}

  authorize(input: DealAccessAuthorizationInput) {
    this.calls.push(input);
    const facts = this.permitted
      ? {
        roleFacts: [{
          id: "role_security",
          scope: input.scope,
          resourceKinds: [input.resource.kind],
          actions: [input.action],
          fields: [],
        }],
        grantFacts: [],
        restrictionFacts: [],
        relationshipFacts: [],
      }
      : {
        roleFacts: [],
        grantFacts: [],
        restrictionFacts: [],
        relationshipFacts: [],
      };
    return evaluateAuthorization(
      buildDealAccessAuthorizationRequest(input, facts),
    );
  }
}

function requestContext(actorId: ActorId): RequestContext {
  return {
    actorId,
    ...scope,
    correlationId: "cor_security" as CorrelationId,
    origin: "internal",
  };
}

function inviteCommand(key: string) {
  return {
    type: "invite_participant" as const,
    context: requestContext(human.id),
    actor: human,
    idempotencyKey: `idem_security-${key}` as IdempotencyKey,
    participantId: "participant_security",
    invitationToken: issueInvitationToken(),
    purpose: "document_review",
    sponsor: { actorId: human.id, kind: "human" as const },
    expiresAt: "2026-08-08T12:00:00.000Z",
    objectScopes: [{
      objectId: portalObjectId("object_security"),
      kind: "document" as const,
      actions: ["read" as const],
    }],
    actions: ["read"],
    fields: ["title"],
  };
}

function service(
  repository: InMemoryDealAccessRepository,
  authorization: PlatformAuthorization,
): DealAccessService {
  return new DealAccessService({
    repository,
    authorization,
    ids: new SecurityIds(),
    clock: { now: () => now },
    sessions: {
      invalidateGrant: () => Promise.resolve(),
      invalidateParticipation: () => Promise.resolve(),
    },
  });
}

Deno.test("an unauthorized human cannot invite a participant", async () => {
  const repository = new InMemoryDealAccessRepository();
  const authorization = new PlatformAuthorization(false);

  await assertRejects(
    () =>
      service(repository, authorization).inviteParticipant(
        inviteCommand("denied"),
      ),
    DealAccessAuthorizationError,
  );
  assertEquals(authorization.calls[0]?.humanOnly, true);
  assertEquals(authorization.calls[0]?.resource.id, scope.dealId);
  assertEquals(
    await repository.transaction((store) =>
      store.findParticipation(scope, "participation_security-1")
    ),
    undefined,
  );
});

Deno.test("administrative command actor must match the authenticated context", async () => {
  const repository = new InMemoryDealAccessRepository();
  const authorization = new PlatformAuthorization(true);
  const command = inviteCommand("mismatch");

  await assertRejects(
    () =>
      service(repository, authorization).inviteParticipant({
        ...command,
        context: requestContext("actor_other" as ActorId),
      }),
    DealAccessAuthorizationError,
  );
  assertEquals(authorization.calls.length, 0);
});

Deno.test("revoke and offboard require platform authority before protected lookup", async () => {
  const repository = new InMemoryDealAccessRepository();
  const allowed = service(repository, new PlatformAuthorization(true));
  const invitation = await allowed.inviteParticipant(
    inviteCommand("lifecycle"),
  );
  const denied = service(repository, new PlatformAuthorization(false));

  await assertRejects(
    () =>
      denied.revokeGrant({
        type: "revoke_grant",
        context: requestContext(human.id),
        actor: human,
        idempotencyKey: "idem_security-revoke" as IdempotencyKey,
        grantId: invitation.grant.id,
        expectedVersion: 1,
      }),
    DealAccessAuthorizationError,
  );
  await assertRejects(
    () =>
      denied.offboardParticipant({
        type: "offboard_participant",
        context: requestContext(human.id),
        actor: human,
        idempotencyKey: "idem_security-offboard" as IdempotencyKey,
        participationId: invitation.participation.id,
        expectedParticipationVersion: 1,
      }),
    DealAccessAuthorizationError,
  );
});
