import type { ActorReference } from "../platform/authz/v1.ts";
import {
  type AggregateVersion,
  type IdempotencyKey,
  type JobId,
  parseJobId,
} from "../platform/api/v1.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import type { ConsumedNegotiationAuthority } from "./authority.ts";
import type { NegotiationEffects } from "./effects.ts";
import type { NegotiationDeliveryJobInput } from "./jobs.ts";
import {
  appendHistory,
  type DeliveryRequest,
  freezeProposal,
  freezeRound,
  type InternalNegotiationState,
  type NegotiationApproval,
  NegotiationError,
  type NegotiationProposal,
  type NegotiationRound,
  type ProposalVersion,
} from "./model.ts";
import type {
  NegotiationCommandIdentity,
  NegotiationTransaction,
} from "./repository.ts";
import { protectedRoundNotFound } from "./repository.ts";
import type { NegotiationAuthorityCommandInput } from "./service.ts";
import { deliveryRequestId, type NegotiationScope } from "./ids.ts";
import { assertProposalTransition } from "./transitions.ts";

export function recordCreation(
  round: NegotiationRound,
  actor: ActorReference,
  now: string,
): NegotiationRound {
  const event = appendHistory(round, {
    aggregateType: "round",
    aggregateId: round.roundId,
    eventType: "negotiation_round_created",
    actor,
    occurredAt: now,
    payload: {},
  });
  return freezeRound({ ...round, history: [event] });
}

export function recordMutation(
  round: NegotiationRound,
  changes: Partial<NegotiationRound>,
  actor: ActorReference,
  eventType: string,
  payload: Readonly<Record<string, unknown>>,
  now: string,
  authorityProofId?: string,
): NegotiationRound {
  const version = nextVersion(round.version);
  const event = appendHistory({ ...round, version }, {
    aggregateType: "round",
    aggregateId: round.roundId,
    eventType,
    actor,
    ...(authorityProofId === undefined ? {} : { authorityProofId }),
    occurredAt: now,
    payload,
  });
  return freezeRound({
    ...round,
    ...changes,
    version,
    updatedAt: now,
    history: [...round.history, event],
  });
}

export async function commandIdentity(
  scope: NegotiationScope,
  actor: ActorReference,
  commandType: string,
  targetId: string,
  idempotencyKey: IdempotencyKey,
  payload: unknown,
  recordedAt: string,
): Promise<NegotiationCommandIdentity> {
  return {
    ...scope,
    actorId: actor.id,
    commandType,
    targetId,
    idempotencyKey,
    payloadDigest: await payloadDigest({
      commandType,
      scope,
      targetId,
      payload,
    }),
    recordedAt,
  };
}

export async function appendEffects(
  effects: NegotiationEffects,
  transaction: NegotiationTransaction,
  round: NegotiationRound,
  actor: ActorReference,
  withJob = false,
): Promise<void> {
  const event = round.history.at(-1);
  if (event === undefined) return;
  const kinds = withJob
    ? ["audit", "outbox", "job"] as const
    : ["audit", "outbox"] as const;
  for (const kind of kinds) {
    await effects.append(transaction, {
      effectId: `${event.eventId}:${kind}`,
      kind,
      tenantId: round.scope.tenantId,
      workspaceId: round.scope.workspaceId,
      dealId: round.scope.dealId,
      aggregateId: round.roundId,
      aggregateVersion: round.version,
      eventType: event.eventType,
      actor,
      ...(event.authorityProofId === undefined
        ? {}
        : { authorityProofId: event.authorityProofId }),
      payload: event.payload,
      occurredAt: event.occurredAt,
    });
  }
}

export function updateProposalStatus(
  proposal: NegotiationProposal,
  status: ProposalVersion["status"],
  now: string,
): NegotiationProposal {
  assertProposalTransition(proposal.status, status);
  const versions = proposal.versions.map((version) =>
    version.versionNumber === proposal.currentVersionNumber
      ? { ...version, status }
      : version
  );
  return freezeProposal({
    ...proposal,
    status,
    versions,
    version: nextVersion(proposal.version),
    updatedAt: now,
  });
}

export function replaceProposal(
  round: NegotiationRound,
  proposalId: string,
  update: (proposal: NegotiationProposal) => NegotiationProposal,
): readonly NegotiationProposal[] {
  let found = false;
  const result = round.proposals.map((proposal) => {
    if (proposal.proposalId !== proposalId) return proposal;
    found = true;
    return update(proposal);
  });
  if (!found) throw protectedRoundNotFound(proposalId);
  return result;
}

export function findProposal(
  round: NegotiationRound,
  proposalId: string,
): NegotiationProposal {
  const proposal = round.proposals.find((item) =>
    item.proposalId === proposalId
  );
  if (proposal !== undefined) return proposal;
  throw protectedRoundNotFound(proposalId);
}

export function replaceApproval(
  round: NegotiationRound,
  approvalId: string,
  update: (approval: NegotiationApproval) => NegotiationApproval,
): readonly NegotiationApproval[] {
  let found = false;
  const result = round.approvals.map((approval) => {
    if (approval.approvalId !== approvalId) return approval;
    found = true;
    return update(approval);
  });
  if (!found) throw protectedRoundNotFound(approvalId);
  return result;
}

export function findApproval(
  round: NegotiationRound,
  approvalId: string,
): NegotiationApproval {
  const approval = round.approvals.find((item) =>
    item.approvalId === approvalId
  );
  if (approval !== undefined) return approval;
  throw protectedRoundNotFound(approvalId);
}

export function withInternal(
  current: InternalNegotiationState | undefined,
  changes: Partial<InternalNegotiationState>,
): InternalNegotiationState {
  return Object.freeze({
    positions: current?.positions ?? [],
    strategyNotes: current?.strategyNotes ?? [],
    ...current,
    ...changes,
  });
}

export function authorityProofFromChanges(
  changes: Partial<NegotiationRound>,
): string | undefined {
  const approvals = changes.approvals;
  const approval = approvals?.at(-1);
  return approval?.authorityProof?.proofId ??
    changes.deliveryRequests?.at(-1)?.authorityProofId;
}

export function deliveryJob(input: {
  readonly jobId: JobId;
  readonly input: NegotiationAuthorityCommandInput;
  readonly request: DeliveryRequest;
  readonly proposal: NegotiationProposal;
  readonly version: ProposalVersion;
  readonly approval: NegotiationApproval;
  readonly authority: ConsumedNegotiationAuthority;
  readonly now: string;
}): NegotiationDeliveryJobInput {
  return {
    jobId: input.jobId,
    jobType: "negotiation.delivery",
    schemaVersion: 1,
    tenantId: input.input.scope.tenantId,
    workspaceId: input.input.scope.workspaceId,
    dealId: input.input.scope.dealId,
    initiatingActorId: input.authority.actor.id,
    authoritySnapshotReference: input.authority.proof.proofId,
    correlationId: input.input.context.correlationId,
    idempotencyKey: input.input.idempotencyKey,
    inputVersionReferences: [{
      aggregateType: "negotiation_proposal",
      aggregateId: input.proposal.proposalId,
      version: input.proposal.version,
      documentId: input.version.proposalVersionId,
    }],
    payload: {
      deliveryRequestId: input.request.deliveryRequestId,
      proposalId: input.proposal.proposalId,
      proposalVersionId: input.version.proposalVersionId,
      approvalId: input.approval.approvalId,
      authorityProofId: input.authority.proof.proofId,
      featureGate: "enabled",
    },
    timeoutAt: new Date(Date.parse(input.now) + 86_400_000),
    createdAt: new Date(input.now),
    deliveryRequestId: input.request.deliveryRequestId,
    proposalId: input.proposal.proposalId,
    proposalVersionId: input.version.proposalVersionId,
    approvalId: input.approval.approvalId,
    authorityProofId: input.authority.proof.proofId,
    featureGate: "enabled",
  };
}

export function deriveJobId(idempotencyKey: IdempotencyKey): JobId {
  const candidate = `job_negotiation-${
    idempotencyKey.slice("idem_".length, "idem_".length + 40)
  }`;
  const parsed = parseJobId(candidate);
  if (parsed.ok) return parsed.value;
  throw new NegotiationError(
    "INVALID_INPUT",
    `Unable to derive a durable negotiation job ID from "${idempotencyKey}".`,
  );
}

export function parseDeliveryRequestId(
  value: string,
): import("./ids.ts").DeliveryRequestId {
  try {
    return deliveryRequestId(value);
  } catch {
    throw new NegotiationError(
      "INVALID_INPUT",
      `Delivery request ID "${value}" is invalid.`,
    );
  }
}

export function assertActiveActor(actor: ActorReference, action: string): void {
  if (actor.state === "active") return;
  throw new NegotiationError(
    "AUTHORIZATION_DENIED",
    `Actor "${actor.id}" cannot ${action}; expected an active actor.`,
  );
}

export function assertHumanActor(actor: ActorReference, action: string): void {
  if (actor.kind === "human" && actor.state === "active") return;
  throw new NegotiationError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Actor "${actor.id}" cannot ${action}; expected an active human actor.`,
  );
}

export function nextVersion(version: AggregateVersion): AggregateVersion {
  const next = Number(version) + 1;
  if (Number.isSafeInteger(next)) return next as AggregateVersion;
  throw new NegotiationError(
    "STALE_VERSION",
    `Negotiation aggregate version "${version}" cannot advance.`,
  );
}
