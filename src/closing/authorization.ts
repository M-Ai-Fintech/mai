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
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { ClosingScope } from "./model.ts";
import { ClosingError } from "./model.ts";
import { protectedNotFound } from "./service_support.ts";

export const CLOSING_ACTION = Object.freeze({
  readWorkspace: action("closing_read_workspace"),
  createWorkspace: action("closing_create_workspace"),
});

export const CLOSING_RESOURCE = Object.freeze({
  workspace: resourceKind("closing_workspace"),
  requirement: resourceKind("closing_requirement"),
  condition: resourceKind("closing_condition"),
  conditionEvidence: resourceKind("closing_condition_evidence"),
  waiver: resourceKind("closing_waiver"),
  blocker: resourceKind("closing_blocker"),
  signatureEvidence: resourceKind("closing_signature_evidence"),
  signaturePackage: resourceKind("closing_signature_package"),
});

export interface ClosingAuthorizationInput {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: ClosingScope;
  readonly resource: ResourceReference;
  readonly action: ReturnType<typeof action>;
  readonly humanOnly?: boolean;
  readonly now: string;
}

export interface ClosingPolicyFacts {
  readonly roleFacts: readonly RoleFact[];
  readonly grantFacts: readonly GrantFact[];
  readonly restrictionFacts: readonly RestrictionFact[];
  readonly relationshipFacts: readonly RelationshipFact[];
}

export interface ClosingAuthorizationPort {
  authorize(
    input: ClosingAuthorizationInput,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}

export function closingResource(
  kind: ResourceKind,
  id: string,
): ResourceReference {
  return { kind, id };
}

export function closingWorkspaceResource(id: string): ResourceReference {
  return closingResource(CLOSING_RESOURCE.workspace, id);
}

export function evaluateClosingAuthorization(
  input: ClosingAuthorizationInput,
  facts: ClosingPolicyFacts = emptyPolicyFacts(),
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

export const denyClosingAuthorization: ClosingAuthorizationPort = {
  authorize: (input) => evaluateClosingAuthorization(input),
};

export function assertClosingContext(
  context: RequestContext,
  actor: ActorReference,
  scope: ClosingScope,
): void {
  if (
    context.actorId === actor.id &&
    context.tenantId === scope.tenantId &&
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId
  ) return;
  throw new ClosingError(
    "SCOPE_MISMATCH",
    `Closing actor "${actor.id}" or scope "${scope.tenantId}/${scope.workspaceId}/${scope.dealId}" does not match trusted RequestContext actor "${context.actorId}" and scope "${context.tenantId}/${
      context.workspaceId ?? "missing"
    }/${
      context.dealId ?? "missing"
    }"; expected exact authenticated context binding.`,
  );
}

export async function authorizeClosingAction(
  port: ClosingAuthorizationPort,
  input: ClosingAuthorizationInput,
): Promise<AllowedAuthorizationDecision> {
  assertClosingContext(input.context, input.actor, input.scope);
  if (input.actor.state !== "active") {
    throw new ClosingError(
      "AUTHORIZATION_DENIED",
      `Closing actor "${input.actor.id}" is "${input.actor.state}"; expected an active authenticated actor for action "${input.action}".`,
    );
  }
  const decision = await port.authorize(input);
  if (decision.outcome === "deny") {
    throw authorizationDenied(input, decision.reasonCode);
  }
  if (!allowedDecisionMatchesInput(decision, input)) {
    throw authorizationDenied(input, "invalid allowed scope");
  }
  return decision;
}

function allowedDecisionMatchesInput(
  decision: AllowedAuthorizationDecision,
  input: ClosingAuthorizationInput,
): boolean {
  const token = decision.approvedScope;
  return decision.allowedActions.includes(input.action) &&
    token.actorId === input.actor.id &&
    token.tenantId === input.scope.tenantId &&
    token.workspaceId === input.scope.workspaceId &&
    token.dealId === input.scope.dealId &&
    token.resource.kind === input.resource.kind &&
    token.resource.id === input.resource.id;
}

function authorizationDenied(
  input: ClosingAuthorizationInput,
  reason: string,
): ClosingError {
  if (input.action === CLOSING_ACTION.readWorkspace) {
    return protectedNotFound(input.resource.id);
  }
  return new ClosingError(
    "AUTHORIZATION_DENIED",
    `Closing action "${input.action}" on resource "${input.resource.id}" was denied with reason "${reason}"; expected an allowed exact-scope authorization decision.`,
  );
}

function emptyPolicyFacts(): ClosingPolicyFacts {
  return {
    roleFacts: [],
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
  };
}
