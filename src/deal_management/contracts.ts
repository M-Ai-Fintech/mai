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
import type { OutboxEvent } from "../platform/events/v1.ts";
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

export interface StoredDealEventRow {
  readonly eventId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly actorId: string;
  readonly actorKind: DealEvent["actorKind"];
  readonly correlationId: string;
  readonly aggregateVersion: string | number;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly payload: unknown;
  readonly occurredAt: Date | string;
  readonly availableAt: Date | string;
}

export interface StoredDealRow {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly version: string | number;
  readonly state: string;
  readonly document: unknown;
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
  readonly id?: DealId;
  readonly version?: AggregateVersion;
  readonly state?: DealState;
  readonly name?: string;
  readonly dealType?: string;
  readonly confidentiality?: DealConfidentiality;
  readonly currency?: string;
  readonly parties?: readonly Readonly<Record<string, unknown>>[];
  readonly roles?: readonly Readonly<Record<string, unknown>>[];
  readonly mandate?: Readonly<Record<string, unknown>>;
  readonly authorityConstraints?: readonly Readonly<Record<string, unknown>>[];
}

export type DealFieldMaskDecision = FieldMask;

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
  return decision.fieldMask;
}

export function freezeStoredDeal(deal: Deal): Deal {
  return Object.freeze({
    ...deal,
    parties: Object.freeze(deal.parties.map((party) =>
      Object.freeze({
        ...party,
        reference: Object.freeze({ ...party.reference }),
      })
    )),
    roles: Object.freeze(deal.roles.map((role) => Object.freeze({ ...role }))),
    ...(deal.mandate === undefined ? {} : {
      mandate: Object.freeze({
        ...deal.mandate,
        transactionValueCeiling: Object.freeze({
          ...deal.mandate.transactionValueCeiling,
        }),
      }),
    }),
    authorityConstraints: Object.freeze(
      deal.authorityConstraints.map((constraint) =>
        Object.freeze({
          ...constraint,
          ...(constraint.amountCeiling === undefined ? {} : {
            amountCeiling: Object.freeze({ ...constraint.amountCeiling }),
          }),
        })
      ),
    ),
  });
}

export function cloneStoredDeal(deal: Deal): Deal {
  return freezeStoredDeal({
    ...deal,
    parties: deal.parties.map((party) => ({
      ...party,
      reference: { ...party.reference },
    })),
    roles: deal.roles.map((role) => ({ ...role })),
    ...(deal.mandate === undefined ? {} : {
      mandate: {
        ...deal.mandate,
        transactionValueCeiling: { ...deal.mandate.transactionValueCeiling },
      },
    }),
    authorityConstraints: deal.authorityConstraints.map((constraint) => ({
      ...constraint,
      ...(constraint.amountCeiling === undefined ? {} : {
        amountCeiling: { ...constraint.amountCeiling },
      }),
    })),
  });
}

export function cloneStoredResult(
  result: DealCommandResult,
): DealCommandResult {
  return { ...result, deal: cloneStoredDeal(result.deal) };
}

export function cloneStoredEvent(event: DealEvent): DealEvent {
  return Object.freeze({
    ...event,
    payload: Object.freeze({ ...event.payload }),
  });
}

export function toStoredEvent(row: StoredDealEventRow): DealEvent {
  return {
    eventId: row.eventId as DealEvent["eventId"],
    tenantId: row.tenantId as DealEvent["tenantId"],
    workspaceId: row.workspaceId as DealEvent["workspaceId"],
    dealId: row.dealId as DealEvent["dealId"],
    actorId: row.actorId as DealEvent["actorId"],
    actorKind: row.actorKind,
    correlationId: row.correlationId as DealEvent["correlationId"],
    aggregateVersion: Number(
      row.aggregateVersion,
    ) as DealEvent["aggregateVersion"],
    eventType: row.eventType,
    schemaVersion: 1,
    payload: eventRecord(row.payload),
    occurredAt: eventDate(row.occurredAt, row.eventId),
    availableAt: eventDate(row.availableAt, row.eventId),
  };
}

export function toDealOutboxEvent(
  event: DealEvent,
  auditEventId: string | undefined,
): OutboxEvent {
  return {
    eventId: event.eventId,
    tenantId: event.tenantId,
    workspaceId: event.workspaceId,
    dealId: event.dealId,
    aggregateType: "deal",
    aggregateId: event.dealId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: event.schemaVersion,
    payload: {
      ...event.payload,
      ...(auditEventId === undefined ? {} : { auditEventId }),
    },
    correlationId: event.correlationId,
    occurredAt: event.occurredAt,
    availableAt: event.availableAt,
  };
}

function eventRecord(value: unknown): Readonly<Record<string, unknown>> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error(
    `Stored Deal event payload "${
      String(value)
    }" is invalid; expected an object.`,
  );
}

function eventDate(value: Date | string, eventId: string): Date {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  throw new Error(
    `Deal event timestamp "${
      String(value)
    }" for "${eventId}" is invalid; expected an ISO date.`,
  );
}
