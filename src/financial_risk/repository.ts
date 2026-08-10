import type { ActorId, IdempotencyKey } from "../platform/api/v1.ts";
import {
  createFinancialRiskResult,
  type FinancialRiskResult,
  type FinancialRiskScope,
} from "./model.ts";
import type { FinancialRiskAssessmentId } from "./ids.ts";

export type FinancialRiskIdempotencyClaimResult =
  | { readonly status: "claimed" }
  | { readonly status: "in_progress" }
  | { readonly status: "replayed"; readonly resultId: string }
  | {
    readonly status: "failed";
    readonly failureCode: "STALE_VERSION";
  };

export type FinancialRiskCommandType =
  | "financial-risk.compute"
  | "financial-risk.invalidate";

export interface FinancialRiskIdempotencyClaim {
  readonly commandType: FinancialRiskCommandType;
  readonly scope: FinancialRiskScope;
  readonly actorId: ActorId;
  readonly assessmentId: FinancialRiskAssessmentId;
  readonly idempotencyKey: IdempotencyKey;
  readonly payloadDigest: string;
}

export interface FinancialRiskRepository {
  claimIdempotency(
    claim: FinancialRiskIdempotencyClaim,
  ): Promise<FinancialRiskIdempotencyClaimResult>;
  completeIdempotency(
    claim: FinancialRiskIdempotencyClaim,
    resultId: string,
  ): Promise<void>;
  failIdempotency(
    claim: FinancialRiskIdempotencyClaim,
    failureCode: "STALE_VERSION",
  ): Promise<void>;
  append(result: FinancialRiskResult): Promise<void>;
  findById(
    scope: FinancialRiskScope,
    resultId: string,
  ): Promise<FinancialRiskResult | undefined>;
  findLatest(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<FinancialRiskResult | undefined>;
  listHistory(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<readonly FinancialRiskResult[]>;
}

export class InMemoryFinancialRiskRepository
  implements FinancialRiskRepository {
  private readonly results = new Map<string, FinancialRiskResult>();
  private readonly claims = new Map<
    string,
    FinancialRiskIdempotencyClaim & {
      readonly state: "in_progress" | "completed" | "failed";
      readonly resultId?: string;
      readonly failureCode?: "STALE_VERSION";
    }
  >();

  claimIdempotency(
    claim: FinancialRiskIdempotencyClaim,
  ): Promise<FinancialRiskIdempotencyClaimResult> {
    const key = claimKey(claim);
    const existing = this.claims.get(key);
    if (existing === undefined) {
      this.claims.set(key, { ...claim, state: "in_progress" });
      return Promise.resolve({ status: "claimed" });
    }
    if (existing.payloadDigest !== claim.payloadDigest) {
      return Promise.reject(
        new Error(
          `IDEMPOTENCY_CONFLICT: key "${claim.idempotencyKey}" payload changed; expected the original command payload.`,
        ),
      );
    }
    return existing.state === "completed" && existing.resultId !== undefined
      ? Promise.resolve({ status: "replayed", resultId: existing.resultId })
      : existing.state === "failed" && existing.failureCode !== undefined
      ? Promise.resolve({ status: "failed", failureCode: existing.failureCode })
      : Promise.resolve({ status: "in_progress" });
  }

  completeIdempotency(
    claim: FinancialRiskIdempotencyClaim,
    resultId: string,
  ): Promise<void> {
    const key = claimKey(claim);
    const existing = this.claims.get(key);
    if (
      existing === undefined || existing.payloadDigest !== claim.payloadDigest
    ) {
      return Promise.reject(
        new Error(
          `Idempotency key "${claim.idempotencyKey}" cannot complete; expected its active claim.`,
        ),
      );
    }
    if (existing.state !== "in_progress") {
      return Promise.reject(
        new Error(
          `Idempotency key "${claim.idempotencyKey}" cannot complete from state "${existing.state}"; expected an active claim.`,
        ),
      );
    }
    this.claims.set(key, { ...existing, state: "completed", resultId });
    return Promise.resolve();
  }

  failIdempotency(
    claim: FinancialRiskIdempotencyClaim,
    failureCode: "STALE_VERSION",
  ): Promise<void> {
    const key = claimKey(claim);
    const existing = this.claims.get(key);
    if (
      existing === undefined || existing.payloadDigest !== claim.payloadDigest
    ) {
      return Promise.reject(
        new Error(
          `Idempotency key "${claim.idempotencyKey}" cannot fail; expected its active claim.`,
        ),
      );
    }
    if (existing.state !== "in_progress") {
      return Promise.reject(
        new Error(
          `Idempotency key "${claim.idempotencyKey}" cannot fail from state "${existing.state}"; expected an active claim.`,
        ),
      );
    }
    this.claims.set(key, { ...existing, state: "failed", failureCode });
    return Promise.resolve();
  }

  append(result: FinancialRiskResult): Promise<void> {
    const key = resultKey(result.scope, result.resultId);
    if (this.results.has(key)) {
      return Promise.reject(
        new Error(
          `Financial-risk result "${result.resultId}" already exists; expected immutable unique history.`,
        ),
      );
    }
    this.results.set(key, snapshotResult(result));
    return Promise.resolve();
  }

  findById(
    scope: FinancialRiskScope,
    resultId: string,
  ): Promise<FinancialRiskResult | undefined> {
    const result = this.results.get(keyFromText(scope, resultId));
    return Promise.resolve(
      result === undefined ? undefined : snapshotResult(result),
    );
  }

  findLatest(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<FinancialRiskResult | undefined> {
    const values = [...this.results.values()].filter((result) =>
      result.assessmentId === assessmentId && sameScope(result.scope, scope)
    );
    values.sort((left, right) => right.version - left.version);
    return Promise.resolve(
      values[0] === undefined ? undefined : snapshotResult(values[0]),
    );
  }

  listHistory(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<readonly FinancialRiskResult[]> {
    const values = [...this.results.values()].filter((result) =>
      result.assessmentId === assessmentId && sameScope(result.scope, scope)
    );
    values.sort((left, right) => left.version - right.version);
    return Promise.resolve(Object.freeze(values.map(snapshotResult)));
  }
}

function snapshotResult(result: FinancialRiskResult): FinancialRiskResult {
  return createFinancialRiskResult(structuredClone(result));
}

function claimKey(claim: FinancialRiskIdempotencyClaim): string {
  return `${
    scopeKey(claim.scope)
  }:${claim.commandType}:${claim.actorId}:${claim.assessmentId}:${claim.idempotencyKey}`;
}

function resultKey(scope: FinancialRiskScope, resultId: string): string {
  return keyFromText(scope, resultId);
}

function keyFromText(scope: FinancialRiskScope, value: string): string {
  return `${scopeKey(scope)}:${value}`;
}

function scopeKey(scope: FinancialRiskScope): string {
  return `${scope.tenantId}/${scope.workspaceId}/${scope.dealId}`;
}

function sameScope(
  left: FinancialRiskScope,
  right: FinancialRiskScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}
