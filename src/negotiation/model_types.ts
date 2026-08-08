import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { AuthorityProofReference } from "../work_management/authority_proof.ts";
import type {
  ApprovalId,
  DeliveryReceiptId,
  DeliveryRequestId,
  NegotiationEventId,
  NegotiationId,
  NegotiationScope,
  PositionId,
  ProposalId,
  ProposalVersionId,
  RoundId,
} from "./ids.ts";
import type { MandateComparison, NegotiationMandate } from "./mandate.ts";
import type { NormalizedTerms } from "./terms.ts";
import type {
  ApprovalStatus,
  DeliveryReceiptStatus,
  DeliveryRequestStatus,
  ProposalStatus,
  RoundStatus,
} from "./transitions.ts";

export type NegotiationParty = "buyer" | "seller";
export type ProposalOrigin = "human" | "agent_recommendation" | "optimizer";

export interface InternalPosition {
  readonly positionId: PositionId;
  readonly scope: NegotiationScope;
  readonly side: NegotiationParty;
  readonly terms: NormalizedTerms;
  readonly reservationUtility?: number;
  readonly walkAwayReason?: string;
  readonly concessionNotes: readonly string[];
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface BatnaAlternative {
  readonly id: string;
  readonly label: string;
  readonly expectedValue?: number;
  readonly currency?: string;
  readonly confidence?: number;
  readonly notes?: string;
}

export interface Batna {
  readonly side: NegotiationParty;
  readonly alternatives: readonly BatnaAlternative[];
  readonly reservationUtility?: number;
  readonly walkAwayThreshold?: number;
  readonly recordedBy: string;
  readonly recordedAt: string;
}

export interface InternalNegotiationState {
  readonly positions: readonly InternalPosition[];
  readonly batna?: Batna;
  readonly mandateComparison?: MandateComparison;
  readonly mandate?: NegotiationMandate;
  readonly strategyNotes: readonly string[];
}

export interface ProposalVersion {
  readonly proposalVersionId: ProposalVersionId;
  readonly proposalId: ProposalId;
  readonly versionNumber: number;
  readonly terms: NormalizedTerms;
  readonly submittedBy: string;
  readonly submittedByKind: ActorReference["kind"];
  readonly origin: ProposalOrigin;
  readonly status: ProposalStatus;
  readonly inReplyToProposalId?: ProposalId;
  readonly createdAt: string;
  readonly supersedesVersionId?: ProposalVersionId;
}

export interface NegotiationProposal {
  readonly proposalId: ProposalId;
  readonly negotiationId: NegotiationId;
  readonly roundId: RoundId;
  readonly scope: NegotiationScope;
  readonly fromParty: NegotiationParty;
  readonly version: AggregateVersion;
  readonly currentVersionNumber: number;
  readonly status: ProposalStatus;
  readonly versions: readonly ProposalVersion[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApprovalBasis {
  readonly proposalVersionId: ProposalVersionId;
  readonly proposalAggregateVersion: AggregateVersion;
  readonly mandateComparisonId: string;
  readonly mandateVersion: AggregateVersion;
  readonly termsDigest: string;
}

export interface NegotiationApproval {
  readonly approvalId: ApprovalId;
  readonly proposalId: ProposalId;
  readonly proposalVersionId: ProposalVersionId;
  readonly scope: NegotiationScope;
  readonly status: ApprovalStatus;
  readonly requestedBy: string;
  readonly namedApproverId: string;
  readonly basis: ApprovalBasis;
  readonly authorityProof?: AuthorityProofReference;
  readonly decisionReason?: string;
  readonly decidedBy?: string;
  readonly requestedAt: string;
  readonly decidedAt?: string;
}

export interface DeliveryRequest {
  readonly deliveryRequestId: DeliveryRequestId;
  readonly proposalId: ProposalId;
  readonly proposalVersionId: ProposalVersionId;
  readonly approvalId: ApprovalId;
  readonly scope: NegotiationScope;
  readonly status: DeliveryRequestStatus;
  readonly jobId: string;
  readonly idempotencyKey: string;
  readonly authorityProofId: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly featureGate: "disabled" | "enabled";
}

export interface DeliveryReceipt {
  readonly deliveryReceiptId: DeliveryReceiptId;
  readonly deliveryRequestId: DeliveryRequestId;
  readonly scope: NegotiationScope;
  readonly idempotencyKey: string;
  readonly state: DeliveryReceiptStatus;
  readonly attemptCount: number;
  readonly providerReference?: string;
  readonly failureCode?: string;
  readonly nextAttemptAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NegotiationHistoryEvent {
  readonly eventId: NegotiationEventId;
  readonly aggregateType: "round" | "proposal" | "approval" | "delivery";
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly actor: ActorReference;
  readonly authorityProofId?: string;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface NegotiationRound {
  readonly aggregateType: "negotiation_round";
  readonly roundId: RoundId;
  readonly negotiationId: NegotiationId;
  readonly scope: NegotiationScope;
  readonly number: number;
  readonly version: AggregateVersion;
  readonly status: RoundStatus;
  readonly openedBy: string;
  readonly proposals: readonly NegotiationProposal[];
  readonly approvals: readonly NegotiationApproval[];
  readonly deliveryRequests: readonly DeliveryRequest[];
  readonly deliveryReceipts: readonly DeliveryReceipt[];
  readonly internal?: InternalNegotiationState;
  readonly currentProposalId?: ProposalId;
  readonly acceptedProposalId?: ProposalId;
  readonly history: readonly NegotiationHistoryEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type NegotiationErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "SCOPE_MISMATCH"
  | "AUTHORIZATION_DENIED"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "SEPARATION_OF_DUTIES"
  | "STALE_VERSION"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_IN_PROGRESS"
  | "MANDATE_VIOLATION"
  | "MANDATE_INDETERMINATE"
  | "FEATURE_DISABLED"
  | "DELIVERY_FAILED"
  | "PROTECTED_NOT_FOUND"
  | "REFERENCE_MISMATCH";

export class NegotiationError extends Error {
  constructor(readonly code: NegotiationErrorCode, message: string) {
    super(message);
    this.name = "NegotiationError";
  }
}
