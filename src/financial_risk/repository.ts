import type {
  ActorId,
  AggregateVersion,
  IdempotencyKey,
} from "../platform/api/v1.ts";
import type { ClaimedJob } from "../platform/jobs/v1.ts";
import type { ApprovedScopeToken } from "../platform/authz/v1.ts";
import {
  createFinancialRiskResult,
  type FinancialRiskResult,
  type FinancialRiskScope,
} from "./model.ts";
import type { FinancialRiskAssessmentId } from "./ids.ts";
import type { FinancialRiskIdempotencyFailureCode } from "./errors.ts";

export type FinancialRiskIdempotencyClaimResult =
  | { readonly status: "claimed" }
  | { readonly status: "in_progress" }
  | { readonly status: "replayed"; readonly resultId: string }
  | {
    readonly status: "failed";
    readonly failureCode: FinancialRiskIdempotencyFailureCode;
  };

export type FinancialRiskVersionConflictCode =
  | "STALE_VERSION"
  | "VERSION_CONFLICT";

export class FinancialRiskRepositoryConflictError extends Error {
  constructor(
    readonly code: FinancialRiskVersionConflictCode,
    message: string,
  ) {
    super(message);
    this.name = "FinancialRiskRepositoryConflictError";
  }
}

export type FinancialRiskQueuedCommitFailureCode = "CANCELLED" | "LEASE_LOST";

export class FinancialRiskQueuedCommitError extends Error {
  constructor(
    readonly code: FinancialRiskQueuedCommitFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "FinancialRiskQueuedCommitError";
  }
}

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
    failureCode: FinancialRiskIdempotencyFailureCode,
  ): Promise<void>;
  commitResult(
    claim: FinancialRiskIdempotencyClaim,
    result: FinancialRiskResult,
    expectedVersion: AggregateVersion,
  ): Promise<void>;
  commitQueuedResult(
    result: FinancialRiskResult,
    expectedVersion: AggregateVersion,
    claimedJob: ClaimedJob,
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
  findLatestAuthorized(
    approvedScope: ApprovedScopeToken,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<FinancialRiskResult | undefined>;
  listHistory(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<readonly FinancialRiskResult[]>;
}

type InMemoryIdempotencyClaim = FinancialRiskIdempotencyClaim & {
  readonly state: "in_progress" | "completed" | "failed";
  readonly resultId?: string;
  readonly failureCode?: FinancialRiskIdempotencyFailureCode;
};

export class InMemoryFinancialRiskRepository
  implements FinancialRiskRepository {
  private readonly results = new Map<string, FinancialRiskResult>();
  private readonly claims = new Map<string, InMemoryIdempotencyClaim>();

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
    failureCode: FinancialRiskVersionConflictCode,
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

  commitResult(
    claim: FinancialRiskIdempotencyClaim,
    result: FinancialRiskResult,
    expectedVersion: AggregateVersion,
  ): Promise<void> {
    const latest = this.latestResult(result.scope, result.assessmentId);
    const resultKeyValue = resultKey(result.scope, result.resultId);
    if (this.results.has(resultKeyValue)) {
      return Promise.reject(
        new FinancialRiskRepositoryConflictError(
          "VERSION_CONFLICT",
          `Financial-risk result "${result.resultId}" already exists; expected an immutable unique result ID.`,
        ),
      );
    }
    assertCommitVersion(latest, result, expectedVersion);
    const key = claimKey(claim);
    const existing = this.claims.get(key);
    assertCommitClaim(existing, claim, result);
    this.results.set(resultKeyValue, snapshotResult(result));
    this.claims.set(key, {
      ...existing!,
      state: "completed",
      resultId: result.resultId,
    });
    return Promise.resolve();
  }

  commitQueuedResult(
    result: FinancialRiskResult,
    expectedVersion: AggregateVersion,
    claimedJob: ClaimedJob,
  ): Promise<void> {
    assertQueuedCommitFence(claimedJob, result);
    const resultKeyValue = resultKey(result.scope, result.resultId);
    const existing = this.results.get(resultKeyValue);
    if (existing !== undefined) {
      if (existing.idempotencyKey === result.idempotencyKey) {
        return Promise.resolve();
      }
      return Promise.reject(
        new FinancialRiskRepositoryConflictError(
          "VERSION_CONFLICT",
          `Financial-risk result "${result.resultId}" already exists; expected immutable worker replay identity.`,
        ),
      );
    }
    assertCommitVersion(
      this.latestResult(result.scope, result.assessmentId),
      result,
      expectedVersion,
    );
    this.results.set(resultKeyValue, snapshotResult(result));
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
    const existingVersion = [...this.results.values()].find((existing) =>
      existing.assessmentId === result.assessmentId &&
      sameScope(existing.scope, result.scope) &&
      existing.version === result.version
    );
    if (existingVersion !== undefined) {
      return Promise.reject(
        new FinancialRiskRepositoryConflictError(
          "VERSION_CONFLICT",
          `Financial-risk assessment "${result.assessmentId}" already has version "${result.version}"; expected immutable unique history.`,
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

  findLatestAuthorized(
    approvedScope: ApprovedScopeToken,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<FinancialRiskResult | undefined> {
    return this.findLatest(
      financialRiskScopeFromApprovedScope(approvedScope, assessmentId),
      assessmentId,
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

  private latestResult(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
  ): FinancialRiskResult | undefined {
    const values = [...this.results.values()].filter((result) =>
      result.assessmentId === assessmentId && sameScope(result.scope, scope)
    );
    values.sort((left, right) => right.version - left.version);
    return values[0];
  }
}

function assertCommitVersion(
  latest: FinancialRiskResult | undefined,
  result: FinancialRiskResult,
  expectedVersion: AggregateVersion,
): void {
  if (latest === undefined && expectedVersion !== 1) {
    throw new FinancialRiskRepositoryConflictError(
      "STALE_VERSION",
      `Expected financial-risk initial version "${expectedVersion}" but no result exists; expected initial version "1".`,
    );
  }
  if (latest !== undefined && latest.version !== expectedVersion) {
    throw new FinancialRiskRepositoryConflictError(
      "STALE_VERSION",
      `Expected financial-risk version "${expectedVersion}" but current version is "${latest.version}".`,
    );
  }
  const nextVersion = latest === undefined ? 1 : latest.version + 1;
  if (result.version === nextVersion) return;
  throw new FinancialRiskRepositoryConflictError(
    "VERSION_CONFLICT",
    `Financial-risk result version "${result.version}" does not follow current version "${
      latest?.version ?? 0
    }"; expected "${nextVersion}".`,
  );
}

function assertCommitClaim(
  existing: InMemoryIdempotencyClaim | undefined,
  claim: FinancialRiskIdempotencyClaim,
  result: FinancialRiskResult,
): void {
  if (
    existing === undefined || existing.payloadDigest !== claim.payloadDigest ||
    existing.state !== "in_progress"
  ) {
    throw new Error(
      `Idempotency key "${claim.idempotencyKey}" cannot commit; expected its active claim.`,
    );
  }
  if (
    result.scope.tenantId !== claim.scope.tenantId ||
    result.scope.workspaceId !== claim.scope.workspaceId ||
    result.scope.dealId !== claim.scope.dealId ||
    result.assessmentId !== claim.assessmentId ||
    result.idempotencyKey !== claim.idempotencyKey
  ) {
    throw new Error(
      `Idempotency key "${claim.idempotencyKey}" cannot commit result "${result.resultId}"; expected the claimed financial-risk scope and identity.`,
    );
  }
}

function assertQueuedCommitFence(
  claimedJob: ClaimedJob,
  result: FinancialRiskResult,
): void {
  if (
    claimedJob.state === "running" &&
    claimedJob.tenantId === result.scope.tenantId &&
    claimedJob.workspaceId === result.scope.workspaceId &&
    claimedJob.dealId === result.scope.dealId &&
    claimedJob.jobId === result.execution.jobId &&
    claimedJob.initiatingActorId === result.actor.id &&
    claimedJob.leaseExpiresAt > result.createdAt
  ) return;
  throw new FinancialRiskQueuedCommitError(
    "LEASE_LOST",
    `Financial-risk result "${result.resultId}" cannot commit for job "${claimedJob.jobId}"; expected the active tenant, workspace, deal, actor, job, and lease fence.`,
  );
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

export function financialRiskScopeFromApprovedScope(
  approvedScope: ApprovedScopeToken,
  assessmentId: FinancialRiskAssessmentId,
): FinancialRiskScope {
  if (
    approvedScope.dealId === undefined ||
    approvedScope.resource.kind !== "financial-risk-assessment" ||
    approvedScope.resource.id !== assessmentId
  ) {
    throw new Error(
      `Approved financial-risk scope is bound to resource "${approvedScope.resource.id}"; expected assessment "${assessmentId}".`,
    );
  }
  return {
    tenantId: approvedScope.tenantId,
    workspaceId: approvedScope.workspaceId,
    dealId: approvedScope.dealId!,
  };
}
