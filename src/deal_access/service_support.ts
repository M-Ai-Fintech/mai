import type {
  ActorReference,
  ApprovedScopeToken,
} from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import {
  createExternalGrant,
  createParticipation,
  type DealAccessScope,
  type DealParticipation,
  type ExternalGrant,
  type PortalReceipt,
  type PortalSubmission,
} from "./model.ts";
import {
  DealAccessAuthorizationError,
  DealAccessInvariantError,
} from "./errors.ts";
import type { DealAccessEvent } from "./events.ts";
import { toOutboxEvent } from "./events.ts";
import type { CommandIdentity, DealAccessStore } from "./repository.ts";
import type {
  DealAccessIdFactory,
  InvitationResult,
  InviteParticipantCommand,
  QueuedSubmissionInput,
  SubmitPortalDataCommand,
} from "./service_contracts.ts";
import { authorizePortalAccess } from "./policy.ts";

export function assertHumanSponsorCommand(
  command: InviteParticipantCommand,
): void {
  if (command.actor.kind !== "human" || command.sponsor.kind !== "human") {
    throw new DealAccessInvariantError(
      `Invitation actor "${command.actor.id}" and sponsor "${command.sponsor.actorId}" must be human; expected a human sponsor.`,
    );
  }
  if (command.actor.id === command.sponsor.actorId) return;
  throw new DealAccessInvariantError(
    `Invitation sponsor "${command.sponsor.actorId}" does not match actor "${command.actor.id}"; expected the accountable human sponsor.`,
  );
}

export function assertActorMatchesContext(
  actor: ActorReference,
  context: RequestContext,
): void {
  if (actor.id === context.actorId) return;
  throw new DealAccessAuthorizationError("SCOPE_MISMATCH");
}

export function commandScope(context: RequestContext): DealAccessScope {
  if (context.workspaceId !== undefined && context.dealId !== undefined) {
    return {
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      dealId: context.dealId,
    };
  }
  throw new DealAccessInvariantError(
    `Invitation context for tenant "${context.tenantId}" is incomplete; expected workspace and deal scope.`,
  );
}

export function commandIdentity(
  command: InviteParticipantCommand,
  scope: DealAccessScope,
): CommandIdentity {
  return {
    scope,
    actorId: command.actor.id,
    commandType: command.type,
    targetId: command.participantId,
    idempotencyKey: command.idempotencyKey,
  };
}

export function commandIdentityFor(
  command: {
    readonly type: string;
    readonly actor: ActorReference;
    readonly idempotencyKey: string;
  },
  scope: DealAccessScope,
  targetId: string,
): CommandIdentity {
  return {
    scope,
    actorId: command.actor.id,
    commandType: command.type,
    targetId,
    idempotencyKey: command.idempotencyKey as CommandIdentity["idempotencyKey"],
  };
}

export function commandPayload(command: SubmitPortalDataCommand): unknown;
export function commandPayload(command: InviteParticipantCommand): unknown;
export function commandPayload(
  command: InviteParticipantCommand | SubmitPortalDataCommand,
): unknown {
  if (command.type === "invite_participant") {
    return {
      type: command.type,
      participantId: command.participantId,
      invitationToken: command.invitationToken,
      purpose: command.purpose,
      sponsor: command.sponsor.actorId,
      expiresAt: command.expiresAt,
      objectScopes: command.objectScopes,
      actions: command.actions,
      fields: command.fields,
    };
  }
  return {
    type: command.type,
    grantId: command.grantId,
    object: command.object,
    purpose: command.purpose,
    sponsor: command.sponsor,
    requestedExpiry: command.requestedExpiry,
    requestedFields: command.requestedFields,
    payload: command.payload,
  };
}

export function createInvitation(
  command: InviteParticipantCommand,
  scope: DealAccessScope,
  ids: DealAccessIdFactory,
  invitationTokenDigest: string,
  now: string,
): InvitationResult {
  const participation = createParticipation({
    id: ids.nextParticipationId(),
    invitationId: ids.nextInvitationId(),
    scope,
    participantId: command.participantId,
    invitationTokenDigest,
    now,
  });
  const grant = createExternalGrant({
    id: ids.nextExternalGrantId(),
    participation,
    purpose: command.purpose,
    sponsor: command.sponsor,
    expiresAt: command.expiresAt,
    objectScopes: command.objectScopes,
    actions: command.actions,
    fields: command.fields,
    now,
  });
  return { participation, grant };
}

export async function persistInvitation(
  store: DealAccessStore,
  result: InvitationResult,
  command: InviteParticipantCommand,
  ids: DealAccessIdFactory,
  now: string,
): Promise<void> {
  await store.saveParticipation(result.participation);
  await store.saveGrant(result.grant);
  const event = invitationEvent(
    result,
    command,
    ids.nextEventId("invitation"),
    now,
  );
  await appendEventAndOutbox(store, event);
}

export async function persistSubmission(
  store: DealAccessStore,
  submission: PortalSubmission,
  receipt: PortalReceipt,
  command: SubmitPortalDataCommand,
  ids: DealAccessIdFactory,
  now: string,
): Promise<void> {
  await store.saveSubmission(submission);
  await store.saveReceipt(submission.scope, submission.id, receipt);
  const event = lifecycleEvent(
    submission.scope,
    command.context,
    command.actor.id,
    submission.id,
    submission.version,
    "portal_submission_accepted",
    ids.nextEventId("submission"),
    { submissionId: submission.id, grantId: submission.grantId },
    now,
  );
  await appendEventAndOutbox(store, event);
}

export async function persistLifecycle(
  store: DealAccessStore,
  aggregate: {
    readonly scope: DealAccessScope;
    readonly id: string;
    readonly version: AggregateVersion;
  },
  context: RequestContext,
  actorId: ActorId,
  ids: DealAccessIdFactory,
  eventType: string,
  now: string,
): Promise<void> {
  const event = lifecycleEvent(
    aggregate.scope,
    context,
    actorId,
    aggregate.id,
    aggregate.version,
    eventType,
    ids.nextEventId(eventType),
    { aggregateId: aggregate.id, eventType },
    now,
  );
  await appendEventAndOutbox(store, event);
}

export function assertHumanActor(actor: ActorReference): void {
  if (actor.kind === "human" && actor.state === "active") return;
  throw new DealAccessInvariantError(
    `Actor "${actor.id}" kind "${actor.kind}" state "${actor.state}" cannot perform human-only Deal Access command; expected active human actor.`,
  );
}

export function assertExternalActor(actor: ActorReference): void {
  if (actor.kind === "external" && actor.state === "active") return;
  throw new DealAccessInvariantError(
    `Portal actor "${actor.id}" kind "${actor.kind}" state "${actor.state}" is invalid; expected an active external actor.`,
  );
}

export function authorizeQueuedSubmission(
  input: QueuedSubmissionInput,
  submission: PortalSubmission,
  grant: ExternalGrant,
  participation: DealParticipation,
  now: string,
): ApprovedScopeToken {
  const objectScope = grant.objectScopes.find((candidate) =>
    candidate.objectId === submission.objectId
  );
  if (objectScope === undefined) {
    throw new DealAccessAuthorizationError("PROTECTED_NOT_FOUND");
  }
  const decision = authorizePortalAccess({
    context: input.context,
    actor: input.actor,
    participation,
    grant,
    resource: { objectId: submission.objectId, kind: objectScope.kind },
    action: "submit",
    purpose: input.purpose,
    sponsor: input.sponsor,
    requestedExpiry: input.requestedExpiry,
    requestedFields: input.requestedFields,
    clock: { now: () => now },
  });
  if (decision.outcome === "allow") return decision.approvedScope;
  throw new DealAccessAuthorizationError(decision.reasonCode);
}

async function appendEventAndOutbox(
  store: DealAccessStore,
  event: DealAccessEvent,
): Promise<void> {
  await store.appendEvent(event);
  await store.appendOutbox(toOutboxEvent(event));
}

function lifecycleEvent(
  scope: DealAccessScope,
  context: RequestContext,
  actorId: ActorId,
  aggregateId: string,
  aggregateVersion: AggregateVersion,
  eventType: string,
  eventId: string,
  payload: Readonly<Record<string, unknown>>,
  now: string,
): DealAccessEvent {
  const occurredAt = new Date(now);
  return {
    eventId,
    scope,
    actorId,
    correlationId: context.correlationId,
    aggregateType: "deal_access",
    aggregateId,
    aggregateVersion,
    eventType,
    payload,
    occurredAt,
    availableAt: occurredAt,
  };
}

function invitationEvent(
  result: InvitationResult,
  command: InviteParticipantCommand,
  eventId: string,
  now: string,
): DealAccessEvent {
  const occurredAt = new Date(now);
  return {
    eventId,
    scope: result.participation.scope,
    actorId: command.actor.id,
    correlationId: command.context.correlationId,
    aggregateType: "deal_access_invitation",
    aggregateId: result.grant.id,
    aggregateVersion: result.grant.version,
    eventType: "external_participant_invited",
    payload: {
      participationId: result.participation.id,
      grantId: result.grant.id,
      purpose: result.grant.purpose,
      expiresAt: result.grant.expiresAt,
    },
    occurredAt,
    availableAt: occurredAt,
  };
}
