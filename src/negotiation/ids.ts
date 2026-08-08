import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";

export type {
  ActorId,
  AggregateVersion,
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";

declare const negotiationIdBrand: unique symbol;
declare const roundIdBrand: unique symbol;
declare const proposalIdBrand: unique symbol;
declare const proposalVersionIdBrand: unique symbol;
declare const mandateIdBrand: unique symbol;
declare const positionIdBrand: unique symbol;
declare const approvalIdBrand: unique symbol;
declare const deliveryRequestIdBrand: unique symbol;
declare const deliveryReceiptIdBrand: unique symbol;
declare const negotiationEventIdBrand: unique symbol;

export type NegotiationId = string & {
  readonly [negotiationIdBrand]: "NegotiationId";
};
export type RoundId = string & { readonly [roundIdBrand]: "RoundId" };
export type ProposalId = string & {
  readonly [proposalIdBrand]: "ProposalId";
};
export type ProposalVersionId = string & {
  readonly [proposalVersionIdBrand]: "ProposalVersionId";
};
export type MandateId = string & {
  readonly [mandateIdBrand]: "MandateId";
};
export type PositionId = string & {
  readonly [positionIdBrand]: "PositionId";
};
export type ApprovalId = string & {
  readonly [approvalIdBrand]: "NegotiationApprovalId";
};
export type DeliveryRequestId = string & {
  readonly [deliveryRequestIdBrand]: "DeliveryRequestId";
};
export type DeliveryReceiptId = string & {
  readonly [deliveryReceiptIdBrand]: "DeliveryReceiptId";
};
export type NegotiationEventId = string & {
  readonly [negotiationEventIdBrand]: "NegotiationEventId";
};

export interface NegotiationScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export type IdentifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: "INVALID_FORMAT" };

export function negotiationId(value: string): NegotiationId {
  return required(value, "negotiation_", "negotiation ID");
}

export function roundId(value: string): RoundId {
  return required(value, "round_", "round ID");
}

export function proposalId(value: string): ProposalId {
  return required(value, "proposal_", "proposal ID");
}

export function proposalVersionId(value: string): ProposalVersionId {
  return required(value, "proposal_version_", "proposal version ID");
}

export function mandateId(value: string): MandateId {
  return required(value, "mandate_", "mandate ID");
}

export function positionId(value: string): PositionId {
  return required(value, "position_", "internal position ID");
}

export function approvalId(value: string): ApprovalId {
  return required(value, "negotiation_approval_", "negotiation approval ID");
}

export function deliveryRequestId(value: string): DeliveryRequestId {
  return required(value, "delivery_request_", "delivery request ID");
}

export function deliveryReceiptId(value: string): DeliveryReceiptId {
  return required(value, "delivery_receipt_", "delivery receipt ID");
}

export function negotiationEventId(value: string): NegotiationEventId {
  return required(value, "negotiation_event_", "negotiation event ID");
}

export function parseNegotiationId(
  value: unknown,
): IdentifierResult<NegotiationId> {
  return parse(value, "negotiation_");
}

export function parseRoundId(value: unknown): IdentifierResult<RoundId> {
  return parse(value, "round_");
}

export function parseProposalId(value: unknown): IdentifierResult<ProposalId> {
  return parse(value, "proposal_");
}

export function parseProposalVersionId(
  value: unknown,
): IdentifierResult<ProposalVersionId> {
  return parse(value, "proposal_version_");
}

export function parseMandateId(value: unknown): IdentifierResult<MandateId> {
  return parse(value, "mandate_");
}

export function parsePositionId(value: unknown): IdentifierResult<PositionId> {
  return parse(value, "position_");
}

export function parseApprovalId(value: unknown): IdentifierResult<ApprovalId> {
  return parse(value, "negotiation_approval_");
}

export function parseDeliveryRequestId(
  value: unknown,
): IdentifierResult<DeliveryRequestId> {
  return parse(value, "delivery_request_");
}

export function parseDeliveryReceiptId(
  value: unknown,
): IdentifierResult<DeliveryReceiptId> {
  return parse(value, "delivery_receipt_");
}

export function parseNegotiationEventId(
  value: unknown,
): IdentifierResult<NegotiationEventId> {
  return parse(value, "negotiation_event_");
}

export function assertNegotiationScope(
  scope: NegotiationScope,
): NegotiationScope {
  required(scope.tenantId, "tenant_", "tenant ID");
  required(scope.workspaceId, "workspace_", "workspace ID");
  required(scope.dealId, "deal_", "deal ID");
  return Object.freeze({ ...scope });
}

export function sameNegotiationScope(
  left: NegotiationScope,
  right: NegotiationScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

export function negotiationScopeKey(scope: NegotiationScope): string {
  return `${scope.tenantId}|${scope.workspaceId}|${scope.dealId}`;
}

export function actorId(value: string): ActorId {
  return required(value, "actor_", "actor ID");
}

function parse<T>(value: unknown, prefix: string): IdentifierResult<T> {
  if (
    typeof value === "string" && value.length <= 96 &&
    value.startsWith(prefix) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slice(prefix.length))
  ) {
    return { ok: true, value: value as T };
  }
  return { ok: false, issue: "INVALID_FORMAT" };
}

function required<T extends string>(
  value: string,
  prefix: string,
  label: string,
): T {
  const parsed = parse<T>(value, prefix);
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Invalid ${label} "${value}"; expected prefix "${prefix}" and slug characters.`,
  );
}
