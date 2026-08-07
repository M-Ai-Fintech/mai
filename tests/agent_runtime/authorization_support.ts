import {
  type AuthorizationDecision,
  type AuthorizationRequest,
  evaluateAuthorization,
  type GrantFact,
  type RoleFact,
} from "../../src/platform/authz/v1.ts";
import type {
  RuntimeAuthorizationInput,
  RuntimeAuthorizationPort,
} from "../../src/agent_runtime/authorization.ts";
import {
  RUNTIME_ACTION,
  RUNTIME_RESOURCE,
} from "../../src/agent_runtime/authorization.ts";
import type { RuntimeActor } from "../../src/agent_runtime/model.ts";

export class AllowingAuthorization implements RuntimeAuthorizationPort {
  authorize(input: RuntimeAuthorizationInput): AuthorizationDecision {
    return evaluateAuthorization(policyRequest(input, [standardGrant(input)]));
  }
}

export class DenyingAuthorization implements RuntimeAuthorizationPort {
  authorize(input: RuntimeAuthorizationInput): AuthorizationDecision {
    return evaluateAuthorization(
      policyRequest(input, [{ ...standardGrant(input), state: "revoked" }]),
    );
  }
}

export class SequencedAuthorization implements RuntimeAuthorizationPort {
  requests = 0;

  constructor(private readonly decisions: readonly ("allow" | "deny")[]) {}

  authorize(input: RuntimeAuthorizationInput): AuthorizationDecision {
    const decision = this.decisions[this.requests++] ?? "deny";
    return decision === "allow"
      ? evaluateAuthorization(policyRequest(input, [standardGrant(input)]))
      : evaluateAuthorization(
        policyRequest(input, [{ ...standardGrant(input), state: "revoked" }]),
      );
  }
}

export class LeaseExpiringAuthorization implements RuntimeAuthorizationPort {
  constructor(private readonly advance: () => void) {}

  authorize(input: RuntimeAuthorizationInput): AuthorizationDecision {
    this.advance();
    return evaluateAuthorization(policyRequest(input, [standardGrant(input)]));
  }
}

export class PlanCreationWithoutMissionUseAuthorization
  implements RuntimeAuthorizationPort {
  readonly requests: RuntimeAuthorizationInput[] = [];

  authorize(input: RuntimeAuthorizationInput): AuthorizationDecision {
    this.requests.push(input);
    const canProposePlan = input.resource.kind === RUNTIME_RESOURCE.plan &&
      input.action === RUNTIME_ACTION.proposePlan;
    return evaluateAuthorization(
      policyRequest(
        input,
        canProposePlan
          ? [standardGrant(input)]
          : [{ ...standardGrant(input), state: "revoked" }],
      ),
    );
  }
}

export function actorForAuthorization(actor: RuntimeActor) {
  return { id: actor.actorId, kind: actor.kind, state: actor.state } as const;
}

function policyRequest(
  input: RuntimeAuthorizationInput,
  facts: readonly (RoleFact | GrantFact)[],
): AuthorizationRequest {
  if (input.scope.workspaceId === undefined) {
    throw new Error(
      `Authorization test scope for tenant "${input.scope.tenantId}" is missing a workspace; expected the platform authorization scope.`,
    );
  }
  return {
    context: input.context,
    actor: input.actor,
    scope: {
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      ...(input.scope.dealId === undefined
        ? {}
        : { dealId: input.scope.dealId }),
    },
    resource: input.resource,
    action: input.action,
    requestedFields: input.requestedFields,
    roleFacts: facts,
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
    ...(input.humanOnly === true
      ? { authorityRequirement: { humanOnly: true, action: input.action } }
      : {}),
    clock: { now: () => "2026-08-07T12:00:00.000Z" },
  };
}

function standardGrant(input: RuntimeAuthorizationInput): RoleFact {
  return {
    id: "test-runtime-grant",
    scope: {
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId!,
      ...(input.scope.dealId === undefined
        ? {}
        : { dealId: input.scope.dealId }),
    },
    resourceKinds: [input.resource.kind],
    actions: [input.action],
    fields: [],
  };
}
