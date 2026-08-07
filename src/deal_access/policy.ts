import {
  action,
  type ActorReference,
  type AuthorizationDecision,
  type AuthorizationRequest,
  evaluateAuthorization,
  field,
  type PolicyClock,
  purpose,
  resourceKind,
  type RestrictionFact,
  sponsor,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { ActorId } from "../shared/contracts/identifiers.ts";
import type {
  DealParticipation,
  ExternalGrant,
  PortalAction,
  PortalObjectKind,
} from "./model.ts";
import {
  portalFieldClassification,
  type PortalFieldName,
} from "./portal_fields.ts";

export interface PortalResource {
  readonly objectId: string;
  readonly kind: PortalObjectKind;
}

export interface PortalAuthorizationInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly participation: DealParticipation;
  readonly grant: ExternalGrant;
  readonly resource: PortalResource;
  readonly action: PortalAction;
  readonly purpose: string;
  readonly sponsor: ActorId;
  readonly requestedExpiry: string;
  readonly requestedFields: readonly PortalFieldName[];
  readonly clock: PolicyClock;
  readonly restrictions?: readonly RestrictionFact[];
}

export function buildPortalAuthorizationRequest(
  input: PortalAuthorizationInput,
): AuthorizationRequest {
  const grantMatchesParticipant =
    input.grant.participationId === input.participation.id &&
    input.actor.id === input.participation.participantId;
  const grantMatchesObject = input.grant.objectScopes.some((scope) =>
    scope.objectId === input.resource.objectId &&
    scope.kind === input.resource.kind &&
    scope.actions.includes(input.action)
  );
  const resourceKinds = [
    ...new Set(
      input.grant.objectScopes.map((scope) => resourceKind(scope.kind)),
    ),
  ];
  const resourceIds = input.grant.objectScopes.map((scope) => scope.objectId);
  const grantState = input.participation.state === "active" &&
      input.grant.state === "active"
    ? "active" as const
    : "revoked" as const;
  return {
    context: input.context,
    actor: input.actor,
    scope: input.grant.scope,
    resource: {
      kind: resourceKind(input.resource.kind),
      id: input.resource.objectId,
    },
    action: action(input.action),
    requestedFields: input.requestedFields.map((name) => ({
      name: field(name),
      classification: portalFieldClassification(name),
    })),
    roleFacts: [],
    grantFacts: grantMatchesParticipant && grantMatchesObject
      ? [{
        id: input.grant.id,
        access: "external",
        scope: input.grant.scope,
        resourceIds,
        resourceKinds,
        actions: input.grant.actions,
        fields: input.grant.fields,
        purpose: input.grant.purpose,
        sponsor: sponsor(String(input.grant.sponsor.actorId)),
        expiresAt: input.grant.expiresAt,
        state: grantState,
      }]
      : [],
    restrictionFacts: input.restrictions ?? [],
    relationshipFacts: [],
    purpose: purpose(input.purpose),
    sponsor: sponsor(String(input.sponsor)),
    expiresAt: input.requestedExpiry,
    clock: input.clock,
  };
}

export function authorizePortalAccess(
  input: PortalAuthorizationInput,
): AuthorizationDecision {
  return evaluateAuthorization(buildPortalAuthorizationRequest(input));
}
