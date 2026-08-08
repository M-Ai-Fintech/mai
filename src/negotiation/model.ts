import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import {
  approvalId,
  assertNegotiationScope,
  deliveryReceiptId,
  deliveryRequestId,
  negotiationEventId,
  type NegotiationId,
  negotiationId,
  type NegotiationScope,
  positionId,
  type ProposalId,
  proposalId,
  proposalVersionId,
  type RoundId,
  roundId,
} from "./ids.ts";
import {
  type Batna,
  type BatnaAlternative,
  type DeliveryReceipt,
  type DeliveryRequest,
  type InternalNegotiationState,
  type InternalPosition,
  type NegotiationApproval,
  NegotiationError,
  type NegotiationHistoryEvent,
  type NegotiationParty,
  type NegotiationProposal,
  type NegotiationRound,
  type ProposalOrigin,
  type ProposalVersion,
} from "./model_types.ts";
import { type NormalizedTerms, parseNormalizedTerms } from "./terms.ts";
import { assertRoundReferences } from "./model_reference_integrity.ts";

export * from "./model_types.ts";

export function createNegotiationRound(input: {
  readonly roundId: string;
  readonly negotiationId: string;
  readonly scope: NegotiationScope;
  readonly number: number;
  readonly openedBy: string;
  readonly now: string;
  readonly internal?: InternalNegotiationState;
}): NegotiationRound {
  assertNegotiationScope(input.scope);
  assertPositiveInteger(input.number, "round number");
  assertInstant(input.now, "round creation time");
  assertText(input.openedBy, "round opener");
  return freezeRound({
    aggregateType: "negotiation_round",
    roundId: roundId(input.roundId),
    negotiationId: negotiationId(input.negotiationId),
    scope: input.scope,
    number: input.number,
    version: 1 as AggregateVersion,
    status: "draft",
    openedBy: input.openedBy,
    proposals: [],
    approvals: [],
    deliveryRequests: [],
    deliveryReceipts: [],
    ...(input.internal === undefined ? {} : { internal: input.internal }),
    history: [],
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function createInternalPosition(input: {
  readonly positionId: string;
  readonly scope: NegotiationScope;
  readonly side: NegotiationParty;
  readonly terms: NormalizedTerms;
  readonly reservationUtility?: number;
  readonly walkAwayReason?: string;
  readonly concessionNotes?: readonly string[];
  readonly createdBy: string;
  readonly now: string;
}): InternalPosition {
  assertNegotiationScope(input.scope);
  assertUtility(input.reservationUtility, "reservation utility");
  assertText(input.createdBy, "position author");
  assertInstant(input.now, "position creation time");
  if (input.walkAwayReason !== undefined) {
    assertText(input.walkAwayReason, "walk-away reason");
  }
  return Object.freeze({
    positionId: positionId(input.positionId),
    scope: Object.freeze({ ...input.scope }),
    side: input.side,
    terms: input.terms,
    ...(input.reservationUtility === undefined
      ? {}
      : { reservationUtility: input.reservationUtility }),
    ...(input.walkAwayReason === undefined
      ? {}
      : { walkAwayReason: input.walkAwayReason }),
    concessionNotes: Object.freeze([...(input.concessionNotes ?? [])]),
    createdBy: input.createdBy,
    createdAt: input.now,
  });
}

export function createBatna(input: {
  readonly side: NegotiationParty;
  readonly alternatives: readonly BatnaAlternative[];
  readonly reservationUtility?: number;
  readonly walkAwayThreshold?: number;
  readonly recordedBy: string;
  readonly now: string;
}): Batna {
  if (input.alternatives.length === 0) {
    throw new NegotiationError(
      "INVALID_INPUT",
      `BATNA for "${input.side}" has no alternatives; expected at least one recorded alternative.`,
    );
  }
  assertUtility(input.reservationUtility, "BATNA reservation utility");
  assertUtility(input.walkAwayThreshold, "BATNA walk-away threshold");
  assertText(input.recordedBy, "BATNA author");
  assertInstant(input.now, "BATNA creation time");
  return Object.freeze({
    side: input.side,
    alternatives: Object.freeze(
      input.alternatives.map((alternative) =>
        Object.freeze({ ...alternative })
      ),
    ),
    ...(input.reservationUtility === undefined
      ? {}
      : { reservationUtility: input.reservationUtility }),
    ...(input.walkAwayThreshold === undefined
      ? {}
      : { walkAwayThreshold: input.walkAwayThreshold }),
    recordedBy: input.recordedBy,
    recordedAt: input.now,
  });
}

export function createProposal(input: {
  readonly proposalId: string;
  readonly negotiationId: NegotiationId;
  readonly roundId: RoundId;
  readonly scope: NegotiationScope;
  readonly fromParty: NegotiationParty;
  readonly terms: NormalizedTerms;
  readonly submittedBy: string;
  readonly submittedByKind: ActorReference["kind"];
  readonly origin: ProposalOrigin;
  readonly now: string;
  readonly status?: import("./transitions.ts").ProposalStatus;
  readonly inReplyToProposalId?: ProposalId;
}): NegotiationProposal {
  assertNegotiationScope(input.scope);
  assertText(input.submittedBy, "proposal author");
  assertInstant(input.now, "proposal creation time");
  const id = proposalId(input.proposalId);
  const versionId = proposalVersionId(
    `proposal_version_${id.slice("proposal_".length)}-1`,
  );
  const version: ProposalVersion = Object.freeze({
    proposalVersionId: versionId,
    proposalId: id,
    versionNumber: 1,
    terms: input.terms,
    submittedBy: input.submittedBy,
    submittedByKind: input.submittedByKind,
    origin: input.origin,
    status: input.status ?? "draft",
    ...(input.inReplyToProposalId === undefined
      ? {}
      : { inReplyToProposalId: input.inReplyToProposalId }),
    createdAt: input.now,
  });
  return freezeProposal({
    proposalId: id,
    negotiationId: input.negotiationId,
    roundId: input.roundId,
    scope: input.scope,
    fromParty: input.fromParty,
    version: 1 as AggregateVersion,
    currentVersionNumber: 1,
    status: version.status,
    versions: [version],
    createdBy: input.submittedBy,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function currentProposalVersion(
  proposal: NegotiationProposal,
): ProposalVersion {
  const current = proposal.versions.find((version) =>
    version.versionNumber === proposal.currentVersionNumber
  );
  if (current !== undefined) return current;
  throw new NegotiationError(
    "REFERENCE_MISMATCH",
    `Proposal "${proposal.proposalId}" is missing current version "${proposal.currentVersionNumber}".`,
  );
}

export function freezeRound(round: NegotiationRound): NegotiationRound {
  assertNegotiationScope(round.scope);
  const frozen = Object.freeze({
    ...round,
    scope: Object.freeze({ ...round.scope }),
    proposals: Object.freeze(round.proposals.map(freezeProposal)),
    approvals: Object.freeze(
      round.approvals.map((approval) =>
        Object.freeze({
          ...approval,
          scope: Object.freeze({ ...approval.scope }),
          basis: Object.freeze({ ...approval.basis }),
        })
      ),
    ),
    deliveryRequests: Object.freeze(
      round.deliveryRequests.map((request) =>
        Object.freeze({
          ...request,
          scope: Object.freeze({ ...request.scope }),
          authorityProof: Object.freeze({ ...request.authorityProof }),
        })
      ),
    ),
    deliveryReceipts: Object.freeze(
      round.deliveryReceipts.map((receipt) =>
        Object.freeze({
          ...receipt,
          scope: Object.freeze({ ...receipt.scope }),
        })
      ),
    ),
    ...(round.internal === undefined
      ? {}
      : { internal: freezeInternal(round.internal) }),
    history: Object.freeze(
      round.history.map((event) =>
        Object.freeze({
          ...event,
          actor: Object.freeze({ ...event.actor }),
          payload: Object.freeze({ ...event.payload }),
        })
      ),
    ),
  });
  assertRoundReferences(frozen);
  return frozen;
}

export function freezeProposal(
  proposal: NegotiationProposal,
): NegotiationProposal {
  return Object.freeze({
    ...proposal,
    scope: Object.freeze({ ...proposal.scope }),
    versions: Object.freeze(
      proposal.versions.map((version) =>
        Object.freeze({
          ...version,
          // Persisted JSON is untrusted at this boundary. Reconstruct terms
          // through the closed negotiation vocabulary before freezing them.
          terms: parseNormalizedTerms(version.terms),
        })
      ),
    ),
  });
}

export function appendHistory(
  round: NegotiationRound,
  input: Omit<NegotiationHistoryEvent, "eventId" | "aggregateVersion">,
): NegotiationHistoryEvent {
  return Object.freeze({
    ...input,
    eventId: negotiationEventId(
      `negotiation_event_${
        round.roundId.slice("round_".length)
      }-${round.version}-${round.history.length + 1}`,
    ),
    aggregateVersion: round.version,
    payload: Object.freeze({ ...input.payload }),
  });
}

export function createApproval(
  input: Omit<NegotiationApproval, "status">,
): NegotiationApproval {
  assertNegotiationScope(input.scope);
  assertText(input.requestedBy, "approval requester");
  assertText(input.namedApproverId, "named approver");
  assertInstant(input.requestedAt, "approval request time");
  return Object.freeze({
    ...input,
    approvalId: approvalId(input.approvalId),
    status: "pending" as const,
    scope: Object.freeze({ ...input.scope }),
    basis: Object.freeze({ ...input.basis }),
  });
}

export function createDeliveryRequest(
  input: Omit<DeliveryRequest, "status">,
): DeliveryRequest {
  assertNegotiationScope(input.scope);
  assertText(input.jobId, "delivery job ID");
  assertText(input.idempotencyKey, "delivery idempotency key");
  assertText(input.authorityProofId, "delivery authority proof");
  if (input.authorityProof.proofId !== input.authorityProofId) {
    throw new NegotiationError(
      "REFERENCE_MISMATCH",
      "Delivery authority proof reference does not match its durable proof ID.",
    );
  }
  assertInstant(input.requestedAt, "delivery request time");
  return Object.freeze({
    ...input,
    deliveryRequestId: deliveryRequestId(input.deliveryRequestId),
    status: "requested" as const,
    scope: Object.freeze({ ...input.scope }),
  });
}

export function createDeliveryReceipt(
  input: Omit<DeliveryReceipt, "state" | "attemptCount" | "updatedAt"> & {
    readonly updatedAt?: string;
  },
): DeliveryReceipt {
  assertNegotiationScope(input.scope);
  assertText(input.idempotencyKey, "delivery receipt idempotency key");
  assertInstant(input.createdAt, "delivery receipt creation time");
  const updatedAt = input.updatedAt ?? input.createdAt;
  assertInstant(updatedAt, "delivery receipt update time");
  return Object.freeze({
    ...input,
    deliveryReceiptId: deliveryReceiptId(input.deliveryReceiptId),
    state: "pending" as const,
    attemptCount: 0,
    updatedAt,
    scope: Object.freeze({ ...input.scope }),
  });
}

function freezeInternal(
  internal: InternalNegotiationState,
): InternalNegotiationState {
  return Object.freeze({
    ...internal,
    positions: Object.freeze(
      internal.positions.map((position) =>
        Object.freeze({
          ...position,
          scope: Object.freeze({ ...position.scope }),
          concessionNotes: Object.freeze([...position.concessionNotes]),
        })
      ),
    ),
    ...(internal.batna === undefined ? {} : {
      batna: Object.freeze({
        ...internal.batna,
        alternatives: Object.freeze(
          internal.batna.alternatives.map((alternative) =>
            Object.freeze({ ...alternative })
          ),
        ),
      }),
    }),
    ...(internal.mandateComparison === undefined ? {} : {
      mandateComparison: Object.freeze({
        ...internal.mandateComparison,
        violations: Object.freeze([...internal.mandateComparison.violations]),
      }),
    }),
    ...(internal.mandate === undefined ? {} : {
      mandate: Object.freeze({
        ...internal.mandate,
        scope: Object.freeze({ ...internal.mandate.scope }),
        constraints: Object.freeze([...internal.mandate.constraints]),
      }),
    }),
    strategyNotes: Object.freeze([...internal.strategyNotes]),
  });
}

function assertUtility(value: number | undefined, label: string): void {
  if (value === undefined) return;
  if (Number.isFinite(value) && value >= 0 && value <= 1) return;
  throw new NegotiationError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected a value from 0 through 1.`,
  );
}

function assertText(value: string, label: string): void {
  if (
    typeof value === "string" && value.trim().length > 0 && value.length <= 256
  ) return;
  throw new NegotiationError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected non-empty text up to 256 characters.`,
  );
}

function assertPositiveInteger(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new NegotiationError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected a positive safe integer.`,
  );
}

function assertInstant(value: string, label: string): void {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === value) {
    return;
  }
  throw new NegotiationError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected canonical UTC ISO-8601.`,
  );
}
