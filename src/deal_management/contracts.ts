import type {
  Action,
  ActorReference,
  AllowedAuthorizationDecision,
  AuthorizationDecision,
  FieldClassification,
  FieldMask,
  GrantFact,
  RelationshipFact,
  ResourceKind,
  RestrictionFact,
  RoleFact,
} from "../platform/authz/v1.ts";
import type { AuditEventDraft } from "../audit_activity/v1.ts";
import type {
  ActorId,
  AggregateVersion,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type {
  AuthorityConstraintId,
  DealEventId,
  DealPartyId,
  DealReceiptId,
  DealRoleId,
  MandateId,
} from "./ids.ts";

export type DealConfidentiality = "standard" | "sensitive" | "highly_sensitive";
export type DealState = "draft";
export type DealPartySide =
  | "acquirer"
  | "target"
  | "seller"
  | "buyer"
  | "advisor"
  | "other";
export type DealRoleName =
  | "acquirer"
  | "target"
  | "seller"
  | "buyer"
  | "advisor"
  | "counsel"
  | "lender"
  | "other";
export type DealPartyReferenceKind =
  | "organization"
  | "legal_entity"
  | "person"
  | "user_identity";

export interface DealScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
}

export interface Money {
  readonly amount: number;
  readonly currency: string;
}

export interface DealPartyReference {
  readonly kind: DealPartyReferenceKind;
  readonly id: string;
}

export interface DealParty {
  readonly id: DealPartyId;
  readonly reference: DealPartyReference;
  readonly side: DealPartySide;
  readonly label: string;
}

export interface DealRole {
  readonly id: DealRoleId;
  readonly partyId: DealPartyId;
  readonly name: DealRoleName;
  readonly authorityLevel: number;
}

export interface Mandate {
  readonly id: MandateId;
  readonly transactionValueCeiling: Money;
  readonly authorityCeiling: number;
}

export interface AuthorityConstraint {
  readonly id: AuthorityConstraintId;
  readonly partyId?: DealPartyId;
  readonly roleId?: DealRoleId;
  readonly action: string;
  readonly amountCeiling?: Money;
  readonly authorityLevel: number;
  readonly humanOnly: boolean;
}

export interface Deal {
  readonly aggregateType: "deal";
  readonly id: DealId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly version: AggregateVersion;
  readonly state: DealState;
  readonly name: string;
  readonly dealType: string;
  readonly confidentiality: DealConfidentiality;
  readonly currency: string;
  readonly parties: readonly DealParty[];
  readonly roles: readonly DealRole[];
  readonly mandate?: Mandate;
  readonly authorityConstraints: readonly AuthorityConstraint[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DealCommandContext {
  readonly actor: ActorReference;
  readonly request: RequestContext;
  readonly now: string;
}

export interface DealClock {
  now(): string;
}

export interface DealPolicyFacts {
  readonly roleFacts: readonly RoleFact[];
  readonly grantFacts: readonly GrantFact[];
  readonly restrictionFacts: readonly RestrictionFact[];
  readonly relationshipFacts: readonly RelationshipFact[];
}

export interface DealAuthorizationInput {
  readonly context: DealCommandContext;
  readonly scope: DealScope;
  readonly resource: { readonly kind: ResourceKind; readonly id: string };
  readonly action: Action;
  readonly requestedFields: readonly {
    readonly name: string;
    readonly classification: FieldClassification;
  }[];
  readonly humanOnly?: boolean;
  readonly policyFacts?: DealPolicyFacts;
}

export interface DealAuthorizationPort {
  authorize(
    input: DealAuthorizationInput,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}

export interface DealAuditEventFactory {
  create(input: {
    readonly context: DealCommandContext;
    readonly event: DealEvent;
    readonly authorization: AllowedAuthorizationDecision;
  }): Promise<AuditEventDraft> | AuditEventDraft;
}

export interface DealAuthorizedRead {
  readonly deal: Deal;
  readonly decision: AuthorizationDecision & { readonly outcome: "allow" };
}

export interface DealEvent {
  readonly eventId: DealEventId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
  readonly actorId: ActorId;
  readonly actorKind: ActorReference["kind"];
  readonly correlationId: CorrelationId;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly schemaVersion: 1;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
  readonly availableAt: Date;
}

export type DealOperation =
  | "created"
  | "configured"
  | "party_added"
  | "role_assigned"
  | "mandate_set"
  | "authority_constraint_set";

export interface DealCommandResult {
  readonly operation: DealOperation;
  readonly deal: Deal;
}

export interface DealReceipt {
  readonly id: DealReceiptId;
  readonly actorId: ActorId;
  readonly commandType: string;
  readonly targetId: string;
  readonly key: string;
  readonly fingerprint: string;
  readonly result: DealCommandResult;
}

export interface DealReceiptStore {
  get(key: string): Promise<DealReceipt | undefined> | DealReceipt | undefined;
  put(receipt: DealReceipt): Promise<void> | void;
}

export interface DealProjection {
  readonly id: DealId;
  readonly version: AggregateVersion;
  readonly state: DealState;
  readonly name: string;
  readonly dealType: string;
  readonly confidentiality: DealConfidentiality;
  readonly currency: string;
  readonly parties: readonly Readonly<Record<string, unknown>>[];
  readonly roles: readonly Readonly<Record<string, unknown>>[];
  readonly mandate?: Readonly<Record<string, unknown>>;
  readonly authorityConstraints: readonly Readonly<Record<string, unknown>>[];
}

export interface DealFieldMaskDecision {
  readonly include: readonly string[];
  readonly omit: readonly string[];
}

export function dealScope(context: DealCommandContext): DealScope {
  const workspaceId = context.request.workspaceId;
  if (workspaceId === undefined) {
    throw new Error(
      `Deal actor "${context.actor.id}" has no workspace scope; expected a workspace identifier.`,
    );
  }
  return { tenantId: context.request.tenantId, workspaceId };
}

export function sameDealScope(left: DealScope, right: DealScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId;
}

export function requestedDealFields(): readonly {
  readonly name: string;
  readonly classification: FieldClassification;
}[] {
  return [
    { name: "deal", classification: "public" },
    { name: "parties", classification: "external_shareable" },
    { name: "roles", classification: "relationship_ownership" },
    { name: "mandate_ceiling", classification: "mandate_ceiling" },
    { name: "authority_constraints", classification: "mandate_ceiling" },
  ];
}

export function allowedDealFields(
  decision: AuthorizationDecision,
): DealFieldMaskDecision {
  const mask: FieldMask = decision.fieldMask;
  return { include: mask.include, omit: mask.omit };
}
