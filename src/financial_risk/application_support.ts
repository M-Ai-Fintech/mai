import type { AggregateVersion, RequestContext } from "../platform/api/v1.ts";
import { type Clock, payloadDigest } from "../platform/persistence/v1.ts";
import type { DurableJob } from "../platform/jobs/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import { FinancialRiskError } from "./errors.ts";
import type {
  FinancialRiskCommandResult,
  FinancialRiskComputeRequest,
  FinancialRiskInvalidationRequest,
} from "./application_contracts.ts";
import type { FinancialRiskRepository } from "./repository.ts";
import type {
  FinancialRiskProvenance,
  FinancialRiskReferences,
  FinancialRiskResult,
  FinancialRiskScope,
} from "./model.ts";

export function requiredScope(context: RequestContext): FinancialRiskScope {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    throw new FinancialRiskError(
      "SCOPE_MISMATCH",
      "Financial-risk requests require exact workspace and deal scope.",
    );
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

export function assertReferenceScope(
  scope: FinancialRiskScope,
  references: FinancialRiskReferences,
): void {
  const basisScope = references.evidenceBasis.scope;
  if (
    basisScope.tenantId === scope.tenantId &&
    basisScope.workspaceId === scope.workspaceId &&
    basisScope.dealId === scope.dealId
  ) return;
  throw new FinancialRiskError(
    "SCOPE_MISMATCH",
    `Evidence basis scope "${
      JSON.stringify(basisScope)
    }" does not match requested financial-risk scope "${
      JSON.stringify(scope)
    }".`,
  );
}

export function assertActor(
  context: RequestContext,
  actor: ActorReference,
): void {
  if (context.actorId === actor.id && actor.state === "active") return;
  throw new FinancialRiskError(
    "ACTOR_DENIED",
    `Actor "${actor.id}" is not the active request actor.`,
  );
}

export function commandDigest(
  request: FinancialRiskComputeRequest,
): Promise<string> {
  return payloadDigest({
    assessmentId: request.assessmentId,
    resultId: request.resultId,
    operationId: request.operationId,
    jobId: request.jobId,
    expectedVersion: request.expectedVersion,
    references: canonicalReferences(request.references),
  });
}

export function canonicalReferences(references: FinancialRiskReferences) {
  return {
    financialData: references.financialData,
    evidenceBasis: {
      scope: references.evidenceBasis.scope,
      references: references.evidenceBasis.references,
      basisDigest: references.evidenceBasis.basisDigest,
      capturedAt: references.evidenceBasis.capturedAt.toISOString(),
    },
    calculations: references.calculations,
  };
}

export async function replayed(
  repository: FinancialRiskRepository,
  scope: FinancialRiskScope,
  resultId: string,
  request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
): Promise<FinancialRiskCommandResult> {
  const result = await repository.findById(scope, resultId);
  if (result === undefined) {
    throw new FinancialRiskError(
      "PROTECTED_NOT_FOUND",
      `Idempotent result "${resultId}" is unavailable.`,
    );
  }
  return {
    status: "replayed",
    result,
    job: durableJob(request, scope, result),
  };
}

export function durableJob(
  request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
  scope: FinancialRiskScope,
  result: FinancialRiskResult,
): DurableJob {
  const createdAt = result.createdAt;
  const references = result.references;
  const inputVersionReferences = inputReferences(references);
  return {
    jobId: request.jobId,
    operationId: request.operationId,
    jobType: "loadInput" in request
      ? "financial-risk.compute"
      : "financial-risk.invalidate",
    schemaVersion: 1,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    initiatingActorId: request.actor.id,
    correlationId: request.context.correlationId,
    idempotencyKey: request.idempotencyKey,
    inputVersionReferences,
    payload: {
      assessmentId: request.assessmentId,
      resultId: result.resultId,
      state: result.state,
      evidenceBasisDigest: references.evidenceBasis.basisDigest,
    },
    timeoutAt: new Date(createdAt.getTime() + 300_000),
    createdAt,
  };
}

export function queuedJob(
  request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
  scope: FinancialRiskScope,
  references: FinancialRiskReferences | undefined,
  createdAt: Date,
): DurableJob {
  const isCompute = "loadInput" in request;
  const payload = isCompute
    ? {
      assessmentId: request.assessmentId,
      resultId: request.resultId,
      expectedVersion: request.expectedVersion,
      state: "queued" as const,
      references: canonicalReferences(request.references),
      evidenceBasisDigest: request.references.evidenceBasis.basisDigest,
    }
    : {
      assessmentId: request.assessmentId,
      resultId: request.resultId,
      expectedVersion: request.expectedVersion,
      state: "queued" as const,
      reason: request.reason,
    };
  return {
    jobId: request.jobId,
    operationId: request.operationId,
    jobType: isCompute ? "financial-risk.compute" : "financial-risk.invalidate",
    schemaVersion: 1,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    initiatingActorId: request.actor.id,
    correlationId: request.context.correlationId,
    idempotencyKey: request.idempotencyKey,
    inputVersionReferences: references === undefined
      ? []
      : inputReferences(references),
    payload,
    timeoutAt: new Date(createdAt.getTime() + 300_000),
    createdAt,
  };
}

function inputReferences(references: FinancialRiskReferences) {
  return [
    ...references.financialData.map((reference) => ({
      aggregateType: "financial_data",
      aggregateId: reference.sourceId,
      version: reference.version as AggregateVersion,
    })),
    ...references.calculations.map((reference) => ({
      aggregateType: "financial_risk_calculation",
      aggregateId: reference.calculationId,
      version: reference.version as AggregateVersion,
    })),
  ];
}

export function staleVersion(
  expected: number,
  current: number,
): FinancialRiskError {
  return new FinancialRiskError(
    "STALE_VERSION",
    `Expected financial-risk version "${expected}" but current version is "${current}".`,
  );
}

export function protectedNotFound(id: string): FinancialRiskError {
  return new FinancialRiskError(
    "PROTECTED_NOT_FOUND",
    `Financial-risk assessment "${id}" was not found.`,
  );
}

export function staleProvenance(
  reason: string,
  previous?: FinancialRiskProvenance,
): FinancialRiskProvenance {
  return {
    kind: "stale",
    reason,
    readiness: "not-claimed",
    runtimeIdentity: "financial-risk-domain",
    adapterIdentity: "financial-risk-domain",
    ...(previous === undefined ? {} : inheritedLineage(previous)),
  };
}

export function cancelledProvenance(reason: string): FinancialRiskProvenance {
  return {
    kind: "cancelled",
    reason,
    readiness: "not-claimed",
    runtimeIdentity: "financial-risk-domain",
    adapterIdentity: "financial-risk-domain",
  };
}

export const systemClock: Clock = { now: () => new Date() };

function inheritedLineage(
  provenance: FinancialRiskProvenance,
): Pick<
  FinancialRiskProvenance,
  "providerIdentity" | "prompt" | "inputDigest"
> {
  return {
    ...(provenance.providerIdentity === undefined
      ? {}
      : { providerIdentity: provenance.providerIdentity }),
    ...(provenance.prompt === undefined ? {} : { prompt: provenance.prompt }),
    ...(provenance.inputDigest === undefined
      ? {}
      : { inputDigest: provenance.inputDigest }),
  };
}
