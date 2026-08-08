import type {
  DeliveryReceipt,
  DeliveryRequest,
  NegotiationApproval,
  NegotiationProposal,
  NegotiationRound,
  ProposalVersion,
} from "./model.ts";
import {
  type NormalizedTerms,
  parseNormalizedTerms,
  serializeNormalizedTerms,
} from "./terms.ts";

/**
 * Public negotiation read models are assembled field-by-field.  In
 * particular, they do not spread an aggregate, because mandate, BATNA,
 * internal positions, strategy notes, approval proofs, and delivery receipts
 * are internal or protected data.
 */
export interface ExternalProposalVersion {
  readonly proposalVersionId: string;
  readonly versionNumber: number;
  readonly terms: NormalizedTerms;
  readonly origin: "human" | "agent_recommendation" | "optimizer";
  readonly status: ProposalVersion["status"];
  readonly inReplyToProposalId?: string;
  readonly createdAt: string;
}

export interface ExternalProposal {
  readonly proposalId: string;
  readonly roundId: string;
  readonly fromParty: "buyer" | "seller";
  readonly version: number;
  readonly currentVersionNumber: number;
  readonly status: NegotiationProposal["status"];
  readonly versions: readonly ExternalProposalVersion[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExternalRound {
  readonly aggregateType: "negotiation_round";
  readonly roundId: string;
  readonly negotiationId: string;
  readonly number: number;
  readonly version: number;
  readonly status: NegotiationRound["status"];
  readonly proposals: readonly ExternalProposal[];
  readonly currentProposalId?: string;
  readonly acceptedProposalId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** An explicitly named internal projection for authorized back-office use. */
export interface InternalRoundProjection extends ExternalRound {
  readonly internal: NegotiationRound["internal"];
  readonly approvals: readonly NegotiationApproval[];
  readonly deliveryRequests: readonly DeliveryRequest[];
  readonly deliveryReceipts: readonly DeliveryReceipt[];
  readonly history: NegotiationRound["history"];
}

export function toExternalProposal(
  proposal: NegotiationProposal,
): ExternalProposal {
  return Object.freeze({
    proposalId: proposal.proposalId,
    roundId: proposal.roundId,
    fromParty: proposal.fromParty,
    version: proposal.version,
    currentVersionNumber: proposal.currentVersionNumber,
    status: proposal.status,
    versions: Object.freeze(proposal.versions.map(toExternalProposalVersion)),
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
  });
}

export function toExternalProposalVersion(
  version: ProposalVersion,
): ExternalProposalVersion {
  return Object.freeze({
    proposalVersionId: version.proposalVersionId,
    versionNumber: version.versionNumber,
    // Rebuild the public value from the canonical serialized vocabulary. This
    // prevents a cast/spread or malformed hydrated JSON object from widening
    // the external DTO with nested caller-supplied fields.
    terms: parseNormalizedTerms(serializeNormalizedTerms(version.terms)),
    origin: version.origin,
    status: version.status,
    ...(version.inReplyToProposalId === undefined
      ? {}
      : { inReplyToProposalId: version.inReplyToProposalId }),
    createdAt: version.createdAt,
  });
}

export function toExternalRound(round: NegotiationRound): ExternalRound {
  return Object.freeze({
    aggregateType: round.aggregateType,
    roundId: round.roundId,
    negotiationId: round.negotiationId,
    number: round.number,
    version: round.version,
    status: round.status,
    proposals: Object.freeze(round.proposals.map(toExternalProposal)),
    ...(round.currentProposalId === undefined
      ? {}
      : { currentProposalId: round.currentProposalId }),
    ...(round.acceptedProposalId === undefined
      ? {}
      : { acceptedProposalId: round.acceptedProposalId }),
    createdAt: round.createdAt,
    updatedAt: round.updatedAt,
  });
}

export function toInternalRound(
  round: NegotiationRound,
): InternalRoundProjection {
  const external = toExternalRound(round);
  return Object.freeze({
    ...external,
    internal: round.internal,
    approvals: round.approvals,
    deliveryRequests: round.deliveryRequests,
    deliveryReceipts: round.deliveryReceipts,
    history: round.history,
  });
}

/**
 * Runtime defense for adapters and tests: public projections must not carry
 * internal field names even if a future projection is added incorrectly.
 */
export function assertExternalRoundSafe(value: ExternalRound): void {
  const forbidden = new Set([
    "internal",
    "positions",
    "batna",
    "mandate",
    "mandateComparison",
    "strategyNotes",
    "authorityProof",
    "approvals",
    "deliveryRequests",
    "deliveryReceipts",
    "providerReference",
    "failureCode",
  ]);
  walk(value, forbidden, "external negotiation projection");
}

function walk(
  value: unknown,
  forbidden: ReadonlySet<string>,
  path: string,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, forbidden, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) {
      throw new Error(`${path} contains protected field "${key}".`);
    }
    walk(child, forbidden, `${path}.${key}`);
  }
}
