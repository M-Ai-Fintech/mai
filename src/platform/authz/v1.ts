/**
 * Versioned public authorization contracts for server-side policy consumers.
 *
 * Application policy is authoritative. Future PostgreSQL RLS is defense in
 * depth only; consumers must evaluate policy before protected loading.
 *
 * @example import { evaluateAuthorization } from "./platform/authz/v1.ts";
 */
export {
  action,
  authoritySnapshotReference,
  AUTHORIZATION_ROLLOUT_CONTRACT,
  createApprovedScopeToken,
  field,
  purpose,
  resourceKind,
  sponsor,
} from "./vocabulary.ts";
export type {
  AccessKind,
  Action,
  ActorKind,
  ActorReference,
  ActorState,
  AllowedAuthorizationDecision,
  ApprovedScopeToken,
  AuthorityRequirement,
  AuthoritySnapshotReference,
  AuthorizationDecision,
  AuthorizationRequest,
  AuthorizationScope,
  DecisionReasonCode,
  DeniedAuthorizationDecision,
  ExternalGrant,
  FieldClassification,
  FieldMask,
  FieldName,
  GrantFact,
  GrantState,
  PolicyClock,
  Purpose,
  RelationshipFact,
  RequestedField,
  ResourceKind,
  ResourceReference,
  RestrictionFact,
  RoleFact,
  Sponsor,
  StandardGrant,
  TemporaryGrant,
} from "./vocabulary.ts";
export { evaluateAuthorization } from "./evaluator.ts";
export {
  guardedLoad,
  type GuardedLoadResult,
  type ScopedLoader,
} from "./guard.ts";
export {
  projectAuthorizedDto,
  type ProjectionField,
  type ProjectionSchema,
} from "./projection.ts";
