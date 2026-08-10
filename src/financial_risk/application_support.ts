import type { AggregateVersion, RequestContext } from "../platform/api/v1.ts";
import { type Clock, payloadDigest } from "../platform/persistence/v1.ts";
import type { DurableJob } from "../platform/jobs/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { AllowedAuthorizationDecision } from "../platform/authz/v1.ts";
import { createExactEvidenceBasis } from "../diligence_decisions/basis.ts";
import { FinancialRiskError } from "./errors.ts";
import { assertFinancialRiskReferences } from "./model.ts";
import type {
  FinancialRiskCommandResult,
  FinancialRiskComputeRequest,
  FinancialRiskInvalidationRequest,
  FinancialRiskQueuedCommand,
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
      actor: request.actor,
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
  authorization?: AllowedAuthorizationDecision,
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
      actor: request.actor,
    }
    : {
      assessmentId: request.assessmentId,
      resultId: request.resultId,
      invalidationId: request.invalidationId,
      expectedVersion: request.expectedVersion,
      state: "queued" as const,
      reason: request.reason,
      actor: request.actor,
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
    ...(authorization?.authoritySnapshotReference === undefined ? {} : {
      authoritySnapshotReference: authorization.authoritySnapshotReference,
    }),
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

export function parseFinancialRiskQueuedJob(
  job: DurableJob,
): FinancialRiskQueuedCommand | undefined {
  const payload = job.payload;
  const scope = queuedScope(job);
  const actor = queuedActor(job, payload.actor);
  const assessmentId = text(payload.assessmentId);
  const resultId = text(payload.resultId);
  const operationId = job.operationId;
  const expectedVersion = positiveVersion(payload.expectedVersion);
  if (
    scope === undefined || actor === undefined || assessmentId === undefined ||
    resultId === undefined || operationId === undefined ||
    expectedVersion === undefined
  ) return undefined;
  const context: RequestContext = {
    actorId: actor.id,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: job.correlationId,
    origin: "job",
  };
  if (job.jobType === "financial-risk.compute") {
    const references = parseQueuedReferences(payload.references, scope);
    if (
      references === undefined ||
      !sameInputVersionReferences(
        job.inputVersionReferences,
        inputReferences(references),
      )
    ) return undefined;
    return {
      kind: "compute",
      request: {
        context,
        actor,
        assessmentId:
          assessmentId as FinancialRiskComputeRequest["assessmentId"],
        resultId: resultId as FinancialRiskComputeRequest["resultId"],
        operationId,
        jobId: job.jobId,
        idempotencyKey: job.idempotencyKey,
        expectedVersion,
        references,
      },
    };
  }
  if (job.jobType !== "financial-risk.invalidate") return undefined;
  if (job.inputVersionReferences.length !== 0) return undefined;
  const reason = text(payload.reason);
  const invalidationId = text(payload.invalidationId);
  if (reason === undefined || invalidationId === undefined) return undefined;
  return {
    kind: "invalidate",
    request: {
      context,
      actor,
      assessmentId:
        assessmentId as FinancialRiskInvalidationRequest["assessmentId"],
      resultId: resultId as FinancialRiskInvalidationRequest["resultId"],
      invalidationId:
        invalidationId as FinancialRiskInvalidationRequest["invalidationId"],
      operationId,
      jobId: job.jobId,
      idempotencyKey: job.idempotencyKey,
      expectedVersion,
      reason,
    },
  };
}

function inputReferences(references: FinancialRiskReferences) {
  return [
    ...references.financialData.map((reference) => ({
      aggregateType: "financial_data",
      aggregateId: reference.sourceId,
      version: reference.version as AggregateVersion,
      exactReference: reference.checksum,
    })),
    ...references.calculations.map((reference) => ({
      aggregateType: "financial_risk_calculation",
      aggregateId: reference.calculationId,
      version: reference.version as AggregateVersion,
      exactReference: reference.algorithmVersion,
    })),
    {
      aggregateType: "financial_risk_evidence_basis",
      aggregateId: references.evidenceBasis.basisDigest,
      version: 1 as AggregateVersion,
      exactReference: references.evidenceBasis.basisDigest,
    },
    ...references.evidenceBasis.references.map((reference) =>
      evidenceInputReference(reference, references.evidenceBasis.basisDigest)
    ),
  ];
}

function queuedScope(job: DurableJob): FinancialRiskScope | undefined {
  if (job.workspaceId === undefined || job.dealId === undefined) {
    return undefined;
  }
  return {
    tenantId: job.tenantId,
    workspaceId: job.workspaceId,
    dealId: job.dealId,
  };
}

function queuedActor(
  job: DurableJob,
  value: unknown,
): ActorReference | undefined {
  if (!isRecord(value) || value.id !== job.initiatingActorId) return undefined;
  if (
    value.kind !== "human" && value.kind !== "ai" &&
    value.kind !== "service" && value.kind !== "external"
  ) return undefined;
  if (
    value.state !== "active" && value.state !== "inactive" &&
    value.state !== "revoked"
  ) return undefined;
  return {
    id: value.id as ActorReference["id"],
    kind: value.kind,
    state: value.state,
  };
}

function parseQueuedReferences(
  value: unknown,
  expectedScope: FinancialRiskScope,
): FinancialRiskReferences | undefined {
  if (!isRecord(value) || !Array.isArray(value.financialData)) return undefined;
  if (!Array.isArray(value.calculations) || !isRecord(value.evidenceBasis)) {
    return undefined;
  }
  const basis = value.evidenceBasis;
  if (
    !isRecord(basis.scope) || !Array.isArray(basis.references) ||
    typeof basis.basisDigest !== "string" ||
    typeof basis.capturedAt !== "string"
  ) return undefined;
  const capturedAt = new Date(basis.capturedAt);
  if (Number.isNaN(capturedAt.getTime())) return undefined;
  const scope = basis.scope as unknown as FinancialRiskScope;
  try {
    const evidenceBasis = createExactEvidenceBasis({
      scope,
      references: basis.references as Parameters<
        typeof createExactEvidenceBasis
      >[0]["references"],
      basisDigest: basis.basisDigest,
      capturedAt,
    });
    const references = {
      financialData: value
        .financialData as FinancialRiskReferences["financialData"],
      evidenceBasis,
      calculations: value
        .calculations as FinancialRiskReferences["calculations"],
    };
    assertFinancialRiskReferences(references, expectedScope);
    return references;
  } catch {
    return undefined;
  }
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function positiveVersion(value: unknown): AggregateVersion | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value as AggregateVersion
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function evidenceInputReference(
  reference: FinancialRiskReferences["evidenceBasis"]["references"][number],
  basisDigest: string,
) {
  if (reference.kind === "document_version") {
    return {
      aggregateType: "document_version",
      aggregateId: reference.reference.documentVersionId,
      version: 1 as AggregateVersion,
      exactReference: JSON.stringify(reference.reference),
    };
  }
  const aggregateId = reference.kind === "evidence"
    ? reference.evidenceId
    : reference.factVersionId;
  return {
    aggregateType: reference.kind,
    aggregateId,
    version: 1 as AggregateVersion,
    exactReference: `${basisDigest}:${aggregateId}`,
  };
}

function sameInputVersionReferences(
  left: readonly {
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly version: AggregateVersion;
    readonly exactReference?: string;
  }[],
  right: readonly {
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly version: AggregateVersion;
    readonly exactReference?: string;
  }[],
): boolean {
  return left.length === right.length && left.every((reference, index) => {
    const candidate = right[index];
    return candidate !== undefined &&
      reference.aggregateType === candidate.aggregateType &&
      reference.aggregateId === candidate.aggregateId &&
      reference.version === candidate.version &&
      reference.exactReference === candidate.exactReference;
  });
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
