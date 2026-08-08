import {
  action,
  type ActorReference,
  type AllowedAuthorizationDecision,
  type AuthorizationDecision,
  evaluateAuthorization,
  type GrantFact,
  type RelationshipFact,
  type ResourceKind,
  resourceKind,
  type ResourceReference,
  type RestrictionFact,
  type RoleFact,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import { NegotiationError } from "./model.ts";
import type { NegotiationScope } from "./ids.ts";

export const NEGOTIATION_ACTION = Object.freeze({
  readRound: action("negotiation_read_round"),
  createRound: action("negotiation_create_round"),
  mutateRound: action("negotiation_mutate_round"),
  requestApproval: action("negotiation_request_approval"),
  approveProposal: action("negotiation_approve_proposal"),
  requestDelivery: action("negotiation_request_delivery"),
  deliverProposal: action("negotiation_deliver_proposal"),
});

export const NEGOTIATION_RESOURCE = Object.freeze({
  round: resourceKind("negotiation_round"),
  proposal: resourceKind("negotiation_proposal"),
  approval: resourceKind("negotiation_approval"),
  delivery: resourceKind("negotiation_delivery"),
});

export interface NegotiationAuthorizationInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: NegotiationScope;
  readonly resource: ResourceReference;
  readonly action: ReturnType<typeof action>;
  readonly humanOnly?: boolean;
  readonly now: string;
}

export interface NegotiationPolicyFacts {
  readonly roleFacts: readonly RoleFact[];
  readonly grantFacts: readonly GrantFact[];
  readonly restrictionFacts: readonly RestrictionFact[];
  readonly relationshipFacts: readonly RelationshipFact[];
}

export interface NegotiationAuthorizationPort {
  authorize(
    input: NegotiationAuthorizationInput,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}

export function negotiationResource(
  kind: ResourceKind,
  id: string,
): ResourceReference {
  return { kind, id };
}

export function evaluateNegotiationAuthorization(
  input: NegotiationAuthorizationInput,
  facts: NegotiationPolicyFacts = emptyPolicyFacts(),
): AuthorizationDecision {
  return evaluateAuthorization({
    context: input.context,
    actor: input.actor,
    scope: input.scope,
    resource: input.resource,
    action: input.action,
    requestedFields: [],
    ...facts,
    authorityRequirement: input.humanOnly === true
      ? { humanOnly: true, action: input.action }
      : undefined,
    clock: { now: () => input.now },
  });
}

export const denyNegotiationAuthorization: NegotiationAuthorizationPort = {
  authorize: (input) => evaluateNegotiationAuthorization(input),
};

export function assertNegotiationContext(
  context: RequestContext,
  actor: ActorReference,
  scope: NegotiationScope,
): void {
  if (
    context.actorId === actor.id &&
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId
  ) return;
  throw new NegotiationError(
    "SCOPE_MISMATCH",
    `Negotiation actor or scope does not match the trusted RequestContext; expected exact tenant, workspace, deal, and actor binding.`,
  );
}

export async function authorizeNegotiationAction(
  port: NegotiationAuthorizationPort,
  input: NegotiationAuthorizationInput,
): Promise<AllowedAuthorizationDecision> {
  assertNegotiationContext(input.context, input.actor, input.scope);
  if (input.actor.state !== "active") {
    throw new NegotiationError(
      "AUTHORIZATION_DENIED",
      `Negotiation actor "${input.actor.id}" is "${input.actor.state}"; expected an active actor.`,
    );
  }
  const decision = await port.authorize(input);
  if (decision.outcome === "deny") {
    if (input.action === NEGOTIATION_ACTION.readRound) {
      throw protectedNotFound(input.resource.id);
    }
    throw new NegotiationError(
      "AUTHORIZATION_DENIED",
      `Negotiation action "${input.action}" was denied with reason "${decision.reasonCode}".`,
    );
  }
  const token = decision.approvedScope;
  if (
    !decision.allowedActions.includes(input.action) ||
    token.actorId !== input.actor.id ||
    token.tenantId !== input.scope.tenantId ||
    token.workspaceId !== input.scope.workspaceId ||
    token.dealId !== input.scope.dealId ||
    token.resource.kind !== input.resource.kind ||
    token.resource.id !== input.resource.id
  ) {
    throw new NegotiationError(
      "AUTHORIZATION_DENIED",
      `Negotiation authorization returned an allowed decision that is not bound to the requested actor, scope, action, and resource.`,
    );
  }
  return decision;
}

export function protectedNotFound(id: string): NegotiationError {
  return new NegotiationError(
    "PROTECTED_NOT_FOUND",
    `Negotiation resource "${id}" was not found; expected an authorized resource in the requested scope.`,
  );
}

function emptyPolicyFacts(): NegotiationPolicyFacts {
  return {
    roleFacts: [],
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
  };
}
