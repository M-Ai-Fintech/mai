import type { RequestContext } from "../../shared/contracts/request_context.ts";
import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../../shared/contracts/identifiers.ts";

const authzBrand: unique symbol = Symbol("authz-value");

type AuthzValue<Kind extends string> = string & {
  readonly [authzBrand]: Kind;
};

export type Action = AuthzValue<"Action">;
export type ResourceKind = AuthzValue<"ResourceKind">;
export type FieldName = AuthzValue<"FieldName">;
export type Purpose = AuthzValue<"Purpose">;
export type Sponsor = AuthzValue<"Sponsor">;
export type AuthoritySnapshotReference = AuthzValue<
  "AuthoritySnapshotReference"
>;

export type ActorKind = "human" | "ai" | "service" | "external";
export type ActorState = "active" | "inactive" | "revoked";
export type FieldClassification =
  | "public"
  | "external_shareable"
  | "restricted"
  | "batna"
  | "mandate_ceiling"
  | "valuation_threshold"
  | "negotiation_strategy"
  | "unrestricted_evidence"
  | "conflict_rationale"
  | "relationship_ownership"
  | "internal_audit"
  | "agent_control"
  | "copilot_capability"
  | "unknown";

export interface ActorReference {
  readonly id: ActorId;
  readonly kind: ActorKind;
  readonly state: ActorState;
}

export interface AuthorizationScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId?: DealId;
}

export interface ResourceReference {
  readonly kind: ResourceKind;
  readonly id: string;
}

export interface RequestedField {
  readonly name: FieldName;
  readonly classification: FieldClassification;
}

export interface PolicyClock {
  now(): string;
}

export interface RoleFact {
  readonly id: string;
  readonly scope: AuthorizationScope;
  readonly resourceKinds: readonly ResourceKind[];
  readonly actions: readonly Action[];
  readonly fields: readonly FieldName[];
  readonly expiresAt?: string;
  readonly relationshipRequirements?: readonly string[];
  readonly authoritySnapshotReferences?: readonly AuthoritySnapshotReference[];
}

export type AccessKind = "standard" | "temporary" | "external";
export type GrantState = "active" | "revoked";

export interface GrantFact extends RoleFact {
  readonly resourceIds?: readonly string[];
  readonly access?: AccessKind;
  readonly state?: GrantState;
}

export interface RestrictionFact {
  readonly id: string;
  readonly scope: AuthorizationScope;
  readonly resourceKinds: readonly ResourceKind[];
  readonly actions: readonly Action[];
  readonly resourceIds?: readonly string[];
  readonly fields?: readonly FieldName[];
}

export interface RelationshipFact {
  readonly type: string;
  readonly scope: AuthorizationScope;
  readonly resource?: ResourceReference;
  readonly active?: boolean;
}

export interface AuthorityRequirement {
  readonly humanOnly: boolean;
  readonly action: Action;
  readonly snapshotReference?: AuthoritySnapshotReference;
}

/**
 * Contains only trusted facts evaluable before protected data is loaded.
 *
 * @example evaluateAuthorization({ context, actor, scope, resource, action, ... })
 */
export interface AuthorizationRequest {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: AuthorizationScope;
  readonly resource: ResourceReference;
  readonly action: Action;
  readonly requestedFields: readonly RequestedField[];
  readonly roleFacts: readonly RoleFact[];
  readonly grantFacts: readonly GrantFact[];
  readonly restrictionFacts: readonly RestrictionFact[];
  readonly relationshipFacts: readonly RelationshipFact[];
  readonly purpose?: Purpose;
  readonly sponsor?: Sponsor;
  readonly expiresAt?: string;
  readonly authorityRequirement?: AuthorityRequirement;
  readonly clock: PolicyClock;
}

export type DecisionReasonCode =
  | "ALLOWED"
  | "ACTOR_INACTIVE"
  | "ACTOR_REVOKED"
  | "INVALID_POLICY_TIME"
  | "SCOPE_MISMATCH"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "GRANT_REVOKED"
  | "GRANT_EXPIRED"
  | "TEMPORARY_CONSTRAINT_REQUIRED"
  | "NO_MATCHING_GRANT"
  | "EXPLICIT_RESTRICTION"
  | "FIELD_SCOPE_DENIED";

export interface FieldMask {
  readonly include: readonly FieldName[];
  readonly omit: readonly FieldName[];
  readonly redact: readonly FieldName[];
  readonly approvedClassifications: readonly ApprovedFieldClassification[];
}

export interface ApprovedFieldClassification {
  readonly name: FieldName;
  readonly classification: FieldClassification;
}

class InternalApprovedScopeToken {
  readonly policyVersion = "authz-v1";
  constructor(
    readonly tenantId: TenantId,
    readonly workspaceId: WorkspaceId,
    readonly dealId: DealId | undefined,
    readonly actorId: ActorId,
    readonly resource: ResourceReference,
    readonly decisionReference: string,
    readonly expiresAt: string | undefined,
  ) {}

  toJSON(): undefined {
    return undefined;
  }

  static fromAllowed(input: TokenInput): InternalApprovedScopeToken {
    return Object.freeze(
      new InternalApprovedScopeToken(
        input.scope.tenantId,
        input.scope.workspaceId,
        input.scope.dealId,
        input.actorId,
        input.resource,
        input.decisionReference,
        input.expiresAt,
      ),
    );
  }
}

/** An opaque, non-bearer scope value created only by an allowed policy decision. */
export type ApprovedScopeToken = InternalApprovedScopeToken;

interface TokenInput {
  readonly scope: AuthorizationScope;
  readonly actorId: ActorId;
  readonly resource: ResourceReference;
  readonly decisionReference: string;
  readonly expiresAt?: string;
}

export interface DeniedAuthorizationDecision {
  readonly outcome: "deny";
  readonly reasonCode: Exclude<DecisionReasonCode, "ALLOWED">;
  readonly allowedActions: readonly Action[];
  readonly approvedScope: undefined;
  readonly fieldMask: FieldMask;
  readonly purpose?: Purpose;
  readonly expiresAt?: string;
  readonly authoritySnapshotReference?: AuthoritySnapshotReference;
}

export interface AllowedAuthorizationDecision {
  readonly outcome: "allow";
  readonly reasonCode: "ALLOWED";
  readonly allowedActions: readonly Action[];
  readonly approvedScope: ApprovedScopeToken;
  readonly fieldMask: FieldMask;
  readonly purpose?: Purpose;
  readonly expiresAt?: string;
  readonly authoritySnapshotReference?: AuthoritySnapshotReference;
}

export type AuthorizationDecision =
  | DeniedAuthorizationDecision
  | AllowedAuthorizationDecision;

/**
 * Additive policy rollout without a production feature flag in this module.
 *
 * Future integrations compare safe shadow decisions first, enforce only after
 * validation, and can roll enforcement back while audit remains enabled.
 */
export const AUTHORIZATION_ROLLOUT_CONTRACT = Object.freeze([
  "shadow safe policy decisions before enforcement",
  "enforce deny-before-load after integration validation",
  "rollback enforcement without disabling audit",
]);

export function action(value: string): Action {
  return constrainedValue(value, "action");
}

export function resourceKind(value: string): ResourceKind {
  return constrainedValue(value, "resource kind");
}

export function field(value: string): FieldName {
  return constrainedValue(value, "field");
}

export function purpose(value: string): Purpose {
  return constrainedValue(value, "purpose");
}

export function sponsor(value: string): Sponsor {
  return constrainedValue(value, "sponsor");
}

export function authoritySnapshotReference(
  value: string,
): AuthoritySnapshotReference {
  return constrainedValue(value, "authority snapshot reference");
}

export function createApprovedScopeToken(
  decision: AuthorizationDecision,
): ApprovedScopeToken {
  if (decision.outcome === "allow") return decision.approvedScope;
  throw new Error(
    "Cannot create an approved scope token from a denied decision.",
  );
}

export function allowedDecision(input: {
  readonly request: AuthorizationRequest;
  readonly allowedActions: readonly Action[];
  readonly fieldMask: FieldMask;
  readonly expiresAt?: string;
}): AllowedAuthorizationDecision {
  const token = InternalApprovedScopeToken.fromAllowed({
    scope: input.request.scope,
    actorId: input.request.actor.id,
    resource: input.request.resource,
    decisionReference: "authz-v1",
    expiresAt: input.expiresAt,
  });
  return Object.freeze({
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: Object.freeze([...input.allowedActions]),
    approvedScope: token,
    fieldMask: freezeMask(input.fieldMask),
    ...(input.request.purpose === undefined
      ? {}
      : { purpose: input.request.purpose }),
    ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
    ...(input.request.authorityRequirement?.snapshotReference === undefined
      ? {}
      : {
        authoritySnapshotReference:
          input.request.authorityRequirement.snapshotReference,
      }),
  });
}

export function deniedDecision(
  request: AuthorizationRequest,
  reasonCode: Exclude<DecisionReasonCode, "ALLOWED">,
): DeniedAuthorizationDecision {
  return Object.freeze({
    outcome: "deny",
    reasonCode,
    allowedActions: Object.freeze([]),
    approvedScope: undefined,
    fieldMask: freezeMask({
      include: [],
      omit: request.requestedFields.map((item) => item.name),
      redact: [],
      approvedClassifications: [],
    }),
    ...(request.purpose === undefined ? {} : { purpose: request.purpose }),
    ...(request.expiresAt === undefined
      ? {}
      : { expiresAt: request.expiresAt }),
    ...(request.authorityRequirement?.snapshotReference === undefined ? {} : {
      authoritySnapshotReference:
        request.authorityRequirement.snapshotReference,
    }),
  });
}

function constrainedValue<T extends string>(
  value: string,
  label: string,
): AuthzValue<T> {
  if (/^[a-z][a-z0-9_-]{0,63}$/.test(value)) return value as AuthzValue<T>;
  throw new Error(
    `Invalid ${label} '${value}'; expected lowercase identifier syntax.`,
  );
}

function freezeMask(mask: FieldMask): FieldMask {
  return Object.freeze({
    include: Object.freeze([...mask.include]),
    omit: Object.freeze([...mask.omit]),
    redact: Object.freeze([...mask.redact]),
    approvedClassifications: Object.freeze(
      mask.approvedClassifications.map((item) => Object.freeze({ ...item })),
    ),
  });
}
