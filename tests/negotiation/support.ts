import {
  evaluateNegotiationAuthorization,
  type NegotiationAuthorizationInput,
  type NegotiationAuthorizationPort,
} from "../../src/negotiation/authorization.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import type { NegotiationScope } from "../../src/negotiation/ids.ts";

export const scope: NegotiationScope = {
  tenantId: "tenant_alpha" as never,
  workspaceId: "workspace_main" as never,
  dealId: "deal_solar" as never,
};

export function actor(
  id = "actor_alice",
  kind: ActorReference["kind"] = "human",
): ActorReference {
  return { id: id as never, kind, state: "active" };
}

export function contextFor(value: ActorReference = actor()): RequestContext {
  return {
    actorId: value.id,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_negotiation-test" as never,
    origin: "internal",
  };
}

export class AllowingNegotiationAuthorization
  implements NegotiationAuthorizationPort {
  readonly requests: NegotiationAuthorizationInput[] = [];

  authorize(input: NegotiationAuthorizationInput) {
    this.requests.push(input);
    return evaluateNegotiationAuthorization(input, {
      roleFacts: [{
        id: "role_negotiation-test",
        scope: input.scope,
        resourceKinds: [input.resource.kind],
        actions: [input.action],
        fields: [],
      }],
      grantFacts: [],
      restrictionFacts: [],
      relationshipFacts: [],
    });
  }
}

export class DenyingNegotiationAuthorization
  implements NegotiationAuthorizationPort {
  authorize(input: NegotiationAuthorizationInput) {
    return evaluateNegotiationAuthorization(input);
  }
}

export const terms = {
  schemaVersion: 1 as const,
  currency: "USD",
  valuation: { minorUnits: 100_000, currency: "USD" },
  terms: [{
    key: "valuation" as const,
    value: 100_000,
    unit: "minor_units" as const,
    currency: "USD",
  }],
};
