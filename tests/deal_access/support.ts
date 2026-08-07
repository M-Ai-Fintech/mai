import {
  type AuthorizationDecision,
  evaluateAuthorization,
} from "../../src/platform/authz/v1.ts";
import type {
  DealAccessAuthorizationInput,
  DealAccessAuthorizationPort,
} from "../../src/deal_access/service.ts";
import { buildDealAccessAuthorizationRequest } from "../../src/deal_access/policy.ts";
import { issueInvitationToken } from "../../src/deal_access/capabilities.ts";

export const INVITATION_TOKEN = issueInvitationToken();

export class AllowingDealAccessAuthorization
  implements DealAccessAuthorizationPort {
  authorize(input: DealAccessAuthorizationInput): AuthorizationDecision {
    return evaluateAuthorization(
      buildDealAccessAuthorizationRequest(input, {
        roleFacts: [{
          id: "role_deal_access_test",
          scope: input.scope,
          resourceKinds: [input.resource.kind],
          actions: [input.action],
          fields: [],
        }],
        grantFacts: [],
        restrictionFacts: [],
        relationshipFacts: [],
      }),
    );
  }
}
