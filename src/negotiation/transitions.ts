export type RoundStatus =
  | "draft"
  | "open"
  | "awaiting_counterparty"
  | "closed"
  | "cancelled";

export type ProposalStatus =
  | "draft"
  | "submitted"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "superseded"
  | "expired";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "invalidated";

export type DeliveryRequestStatus =
  | "requested"
  | "queued"
  | "running"
  | "sent"
  | "retry_scheduled"
  | "failed"
  | "cancelled"
  | "dead_lettered";

export type DeliveryReceiptStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "retry_scheduled"
  | "failed"
  | "revoked"
  | "expired";

const ROUND_TRANSITIONS: Readonly<Record<RoundStatus, readonly RoundStatus[]>> =
  {
    draft: ["open", "cancelled"],
    open: ["awaiting_counterparty", "closed", "cancelled"],
    awaiting_counterparty: ["open", "closed", "cancelled"],
    closed: [],
    cancelled: [],
  };

const PROPOSAL_TRANSITIONS: Readonly<
  Record<ProposalStatus, readonly ProposalStatus[]>
> = {
  draft: ["submitted", "withdrawn", "superseded"],
  submitted: ["countered", "accepted", "rejected", "withdrawn", "expired"],
  countered: ["accepted", "rejected", "withdrawn", "superseded", "expired"],
  accepted: [],
  rejected: [],
  withdrawn: [],
  superseded: [],
  expired: [],
};

const APPROVAL_TRANSITIONS: Readonly<
  Record<ApprovalStatus, readonly ApprovalStatus[]>
> = {
  pending: ["approved", "rejected", "invalidated"],
  approved: ["invalidated"],
  rejected: ["invalidated"],
  invalidated: [],
};

const DELIVERY_REQUEST_TRANSITIONS: Readonly<
  Record<DeliveryRequestStatus, readonly DeliveryRequestStatus[]>
> = {
  requested: ["queued", "cancelled"],
  queued: ["running", "cancelled"],
  running: ["sent", "retry_scheduled", "failed", "cancelled", "dead_lettered"],
  sent: [],
  retry_scheduled: ["running", "cancelled", "dead_lettered"],
  failed: ["retry_scheduled", "cancelled", "dead_lettered"],
  cancelled: [],
  dead_lettered: [],
};

const DELIVERY_RECEIPT_TRANSITIONS: Readonly<
  Record<DeliveryReceiptStatus, readonly DeliveryReceiptStatus[]>
> = {
  pending: ["sent", "retry_scheduled", "failed", "revoked", "expired"],
  sent: ["delivered", "revoked", "expired"],
  delivered: ["revoked", "expired"],
  retry_scheduled: ["sent", "failed", "revoked", "expired"],
  failed: ["retry_scheduled", "revoked", "expired"],
  revoked: [],
  expired: [],
};

export class NegotiationTransitionError extends Error {
  readonly code = "INVALID_TRANSITION";

  constructor(
    readonly aggregate:
      | "round"
      | "proposal"
      | "approval"
      | "delivery_request"
      | "delivery_receipt",
    readonly from: string,
    readonly to: string,
  ) {
    super(
      `Negotiation ${aggregate} transition "${from}" -> "${to}" is invalid; expected an allowed state transition.`,
    );
    this.name = "NegotiationTransitionError";
  }
}

export function assertRoundTransition(
  from: RoundStatus,
  to: RoundStatus,
): void {
  if (ROUND_TRANSITIONS[from].includes(to)) return;
  throw new NegotiationTransitionError("round", from, to);
}

export function assertProposalTransition(
  from: ProposalStatus,
  to: ProposalStatus,
): void {
  if (PROPOSAL_TRANSITIONS[from].includes(to)) return;
  throw new NegotiationTransitionError("proposal", from, to);
}

export function assertApprovalTransition(
  from: ApprovalStatus,
  to: ApprovalStatus,
): void {
  if (APPROVAL_TRANSITIONS[from].includes(to)) return;
  throw new NegotiationTransitionError("approval", from, to);
}

export function assertDeliveryRequestTransition(
  from: DeliveryRequestStatus,
  to: DeliveryRequestStatus,
): void {
  if (DELIVERY_REQUEST_TRANSITIONS[from].includes(to)) return;
  throw new NegotiationTransitionError("delivery_request", from, to);
}

export function assertDeliveryReceiptTransition(
  from: DeliveryReceiptStatus,
  to: DeliveryReceiptStatus,
): void {
  if (DELIVERY_RECEIPT_TRANSITIONS[from].includes(to)) return;
  throw new NegotiationTransitionError("delivery_receipt", from, to);
}

export function isRoundMutable(status: RoundStatus): boolean {
  return ROUND_TRANSITIONS[status].length > 0;
}

export function isProposalFinal(status: ProposalStatus): boolean {
  return PROPOSAL_TRANSITIONS[status].length === 0;
}
