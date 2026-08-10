import type {
  IdempotencyClaim,
  IdempotencyClaimResult,
} from "../platform/persistence/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import type {
  FinancialRiskIdempotencyClaim,
  FinancialRiskIdempotencyClaimResult,
} from "./repository.ts";

export const FINANCIAL_RISK_TARGET_TYPE = "financial-risk-assessment";

export function durableFinancialRiskClaim(
  claim: FinancialRiskIdempotencyClaim,
  clock: Clock,
): IdempotencyClaim {
  const now = clock.now();
  return {
    tenantId: claim.scope.tenantId,
    actorId: claim.actorId,
    commandType: claim.commandType,
    targetType: FINANCIAL_RISK_TARGET_TYPE,
    targetId: [
      claim.scope.workspaceId,
      claim.scope.dealId,
      claim.assessmentId,
    ].join(":"),
    idempotencyKey: claim.idempotencyKey,
    payloadDigest: claim.payloadDigest,
    expiresAt: new Date(now.getTime() + 900_000),
  };
}

export function mapFinancialRiskClaimResult(
  result: IdempotencyClaimResult,
  idempotencyKey: FinancialRiskIdempotencyClaim["idempotencyKey"],
): FinancialRiskIdempotencyClaimResult {
  if (result.status === "claimed") return { status: "claimed" };
  if (result.status === "in_progress" || result.status === "abandoned") {
    return { status: "in_progress" };
  }
  if (result.status !== "replay") {
    throw new Error(
      `Idempotency key "${idempotencyKey}" returned an unknown state; expected a durable replay or in-progress state.`,
    );
  }
  if (result.state === "failed") {
    if (
      result.errorReference !== "STALE_VERSION" &&
      result.errorReference !== "VERSION_CONFLICT"
    ) {
      throw new Error(
        `Idempotency key "${idempotencyKey}" failed with "${
          String(result.errorReference)
        }"; expected a supported financial-risk failure code.`,
      );
    }
    return { status: "failed", failureCode: result.errorReference };
  }
  if (result.resultReference === undefined) {
    throw new Error(
      `Idempotency key "${idempotencyKey}" completed without a result reference; expected a durable financial-risk job or result.`,
    );
  }
  return { status: "replayed", resultId: result.resultReference };
}
