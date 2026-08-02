import {
  createProtectedNotFoundError,
  type ErrorEnvelope,
} from "../platform/api/v1.ts";
import type {
  Deal,
  DealAuthorizationPort,
  DealCommandContext,
  DealProjection,
} from "./contracts.ts";
import {
  allowedDealFields,
  dealScope,
  requestedDealFields,
} from "./contracts.ts";
import { projectDeal } from "./projection.ts";
import type { DealRepository } from "./repository.ts";
import { DEAL_ACTION, DEAL_RESOURCE } from "./service.ts";

export type DealReadResult =
  | {
    readonly kind: "loaded";
    readonly value: DealProjection;
  }
  | {
    readonly kind: "protected_not_found";
    readonly response: ErrorEnvelope;
  };

export async function readDealProjection(input: {
  readonly context: DealCommandContext;
  readonly dealId: Deal["id"];
  readonly repository: DealRepository;
  readonly authorization: DealAuthorizationPort;
}): Promise<DealReadResult> {
  const scope = dealScope(input.context);
  const decision = await input.authorization.authorize({
    context: input.context,
    scope,
    resource: { kind: DEAL_RESOURCE, id: input.dealId },
    action: DEAL_ACTION.read,
    requestedFields: requestedDealFields(),
  });
  if (decision.outcome === "deny") return protectedNotFound(input.context);
  const deal = await input.repository.find(scope, input.dealId);
  if (deal === undefined) return protectedNotFound(input.context);
  return {
    kind: "loaded",
    value: projectDeal(deal, allowedDealFields(decision)),
  };
}

function protectedNotFound(context: DealCommandContext): DealReadResult {
  return {
    kind: "protected_not_found",
    response: createProtectedNotFoundError(context.request.correlationId),
  };
}
