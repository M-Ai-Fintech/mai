import {
  type ClosingAuthorizationInput,
  type ClosingAuthorizationPort,
  evaluateClosingAuthorization,
} from "../../src/closing/authorization.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import type { ClosingScope } from "../../src/closing/model.ts";

export function closingContext(
  scope: ClosingScope,
  actor: ActorReference,
): RequestContext {
  return {
    actorId: actor.id,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_closing-test" as never,
    origin: "internal",
  };
}

export class AllowingClosingAuthorization implements ClosingAuthorizationPort {
  readonly requests: ClosingAuthorizationInput[] = [];

  authorize(input: ClosingAuthorizationInput) {
    this.requests.push(input);
    return evaluateClosingAuthorization(input, {
      roleFacts: [{
        id: "role_closing-test",
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

export class DenyingClosingAuthorization implements ClosingAuthorizationPort {
  readonly requests: ClosingAuthorizationInput[] = [];

  authorize(input: ClosingAuthorizationInput) {
    this.requests.push(input);
    return evaluateClosingAuthorization(input);
  }
}

export class ActionScopedClosingAuthorization
  implements ClosingAuthorizationPort {
  readonly requests: ClosingAuthorizationInput[] = [];

  constructor(private readonly allowedAction: string) {}

  authorize(input: ClosingAuthorizationInput) {
    this.requests.push(input);
    if (input.action !== this.allowedAction) {
      return evaluateClosingAuthorization(input);
    }
    return evaluateClosingAuthorization(input, {
      roleFacts: [{
        id: "role_closing-action-test",
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
