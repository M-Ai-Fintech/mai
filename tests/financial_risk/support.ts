import {
  allowedDecision,
  authoritySnapshotReference,
} from "../../src/platform/authz/vocabulary.ts";
import {
  type Action,
  type ActorReference,
  type AllowedAuthorizationDecision,
  type AuthorizationDecision,
  type FieldMask,
} from "../../src/platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../../src/platform/api/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import type { DurableJob } from "../../src/platform/jobs/v1.ts";
import {
  FinancialRiskError,
  type FinancialRiskIdempotencyFailureCode,
} from "../../src/financial_risk/errors.ts";
import { createExactEvidenceBasis } from "../../src/diligence_decisions/basis.ts";
import type {
  FinancialRiskAuthorizationPort,
  FinancialRiskComputeRequest,
  FinancialRiskInputLoader,
  FinancialRiskReferenceVerificationPort,
} from "../../src/financial_risk/application.ts";
import type {
  FinancialRiskFindingProposal,
  FinancialRiskFindingProposalInput,
  FinancialRiskFindingProposalPort,
} from "../../src/financial_risk/finding_proposal.ts";
import type {
  FinancialRiskInput,
  FinancialRiskReferences,
  FinancialRiskScope,
} from "../../src/financial_risk/model.ts";
import { FINANCIAL_RISK_PROJECTION_FIELD_MASK } from "../../src/financial_risk/projection.ts";
import { FINANCIAL_RISK_INPUT_FIELD_MASK } from "../../src/financial_risk/input_contract.ts";
import type { FinancialRiskInferenceResult } from "../../src/financial_risk/inference.ts";
import type { FinancialRiskInferencePort } from "../../src/financial_risk/ports.ts";
import type {
  FinancialRiskJobPort,
  FinancialRiskJobStatus,
} from "../../src/financial_risk/job_port.ts";
import type {
  FinancialRiskIdempotencyClaim,
  FinancialRiskIdempotencyClaimResult,
  FinancialRiskVersionConflictCode,
} from "../../src/financial_risk/repository.ts";
import type { FinancialRiskQueueLookupResult } from "../../src/financial_risk/job_port.ts";
import { ZScoreLabel } from "../../src/engines/prediction/contracts.ts";
import type {
  FinancialRiskAssessmentId,
  FinancialRiskResultId,
} from "../../src/financial_risk/ids.ts";

export const TEST_TIME = new Date("2026-08-10T12:00:00.000Z");
export const TEST_CHECKSUM = "a".repeat(64);

export const FINANCIAL_RISK_ALL_FIELD_MASK: FieldMask = Object.freeze({
  include: Object.freeze([
    ...FINANCIAL_RISK_PROJECTION_FIELD_MASK.include,
    ...FINANCIAL_RISK_INPUT_FIELD_MASK.include,
  ]),
  omit: Object.freeze([]),
  redact: Object.freeze([]),
  approvedClassifications: Object.freeze([
    ...FINANCIAL_RISK_PROJECTION_FIELD_MASK.approvedClassifications,
    ...FINANCIAL_RISK_INPUT_FIELD_MASK.approvedClassifications,
  ]),
});

export const TEST_INPUT: FinancialRiskInput = Object.freeze({
  ebitda: 100,
  revenue: 1_000,
  totalAssets: 2_000,
  totalLiabilities: 900,
  operatingCashFlow: 80,
  historicalVolatility: 0.12,
});

export const MODEL_OUTPUTS = {
  insolvencyRisk: 0.2,
  churnProbability: 0.3,
  dcfVolatility: 14,
  industry4Score: 72,
  zScore: ZScoreLabel.Safe,
} as const;

export const MODEL_RESULT: FinancialRiskInferenceResult = {
  state: "completed",
  outputs: MODEL_OUTPUTS,
  provenance: {
    kind: "model-inference",
    providerIdentity: "reference-risk-provider",
    prompt: {
      templateReference: "src/agent/agents/financial-risk/instructions.md",
      templateVersion: "1.0.0",
      promptDigest:
        "sha256:363b21dd3cf0b8704492506711ba6e42e1f6ab95de62b8d046d6495688bb2d8b",
    },
    inputDigest: TEST_CHECKSUM,
    modelId: "reference-risk-model",
    modelVersion: "1.0.0",
    artifactChecksum: TEST_CHECKSUM,
    readiness: "reference-only",
    runtimeIdentity: "fake-runtime",
    adapterIdentity: "fake-adapter",
  },
};

export const FALLBACK_OUTPUTS = {
  insolvencyRisk: 0.7,
  churnProbability: 0.65,
  dcfVolatility: 44,
  industry4Score: 38,
  zScore: ZScoreLabel.Distress,
} as const;

export const FALLBACK_RESULT: FinancialRiskInferenceResult = {
  state: "fallback",
  outputs: FALLBACK_OUTPUTS,
  provenance: {
    kind: "configured-fallback",
    providerIdentity: "reference-risk-provider",
    prompt: {
      templateReference: "src/agent/agents/financial-risk/instructions.md",
      templateVersion: "1.0.0",
      promptDigest:
        "sha256:363b21dd3cf0b8704492506711ba6e42e1f6ab95de62b8d046d6495688bb2d8b",
    },
    inputDigest: TEST_CHECKSUM,
    fallbackReason: "Configured local fallback for contract evidence.",
    readiness: "not-claimed",
    runtimeIdentity: "fake-runtime",
    adapterIdentity: "fake-adapter",
  },
};

export function financialRiskContext(
  scope: FinancialRiskScope = financialRiskScope(),
  actorId: ActorId = "actor_alpha" as ActorId,
): RequestContext {
  return {
    actorId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_alpha" as CorrelationId,
    origin: "internal",
  };
}

export function financialRiskScope(): FinancialRiskScope {
  return {
    tenantId: "tenant_alpha" as TenantId,
    workspaceId: "workspace_alpha" as WorkspaceId,
    dealId: "deal_alpha" as DealId,
  };
}

export function financialRiskActor(
  actorId: ActorId = "actor_alpha" as ActorId,
): ActorReference {
  return { id: actorId, kind: "human", state: "active" };
}

export function financialRiskReferences(
  calculationVersion = 1,
): FinancialRiskReferences {
  return {
    financialData: [{
      kind: "financial_data",
      sourceId: "financial_source_alpha",
      version: 1,
      checksum: TEST_CHECKSUM,
    }],
    evidenceBasis: createExactEvidenceBasis({
      scope: financialRiskScope(),
      references: [{
        kind: "evidence",
        evidenceId: "evidence_alpha" as never,
      }],
      basisDigest: TEST_CHECKSUM,
      capturedAt: TEST_TIME,
    }),
    calculations: [{
      kind: "calculation",
      calculationId: "calc_alpha" as never,
      version: calculationVersion,
      algorithmVersion: "financial-risk-input-v1",
    }],
  };
}

export function computeRequest(
  overrides: Partial<FinancialRiskComputeRequest> = {},
): FinancialRiskComputeRequest {
  const scope = financialRiskScope();
  const context = financialRiskContext(scope);
  return {
    context,
    actor: financialRiskActor(),
    assessmentId: "risk_assessment_alpha" as FinancialRiskAssessmentId,
    resultId: "risk_result_alpha" as FinancialRiskResultId,
    operationId: "op_alpha" as OperationId,
    jobId: "job_alpha" as JobId,
    idempotencyKey: "idem_alpha" as IdempotencyKey,
    expectedVersion: 1 as never,
    references: financialRiskReferences(),
    loadInput: new RecordingInputLoader(),
    ...overrides,
  };
}

export class FakeFinancialRiskAuthorization
  implements FinancialRiskAuthorizationPort {
  calls = 0;

  constructor(
    private readonly outcome: "allow" | "deny" = "allow",
    private fieldMask: FieldMask = FINANCIAL_RISK_ALL_FIELD_MASK,
    private readonly snapshotReference?: string,
  ) {}

  setFieldMask(fieldMask: FieldMask): void {
    this.fieldMask = fieldMask;
  }

  authorize(
    input: Parameters<FinancialRiskAuthorizationPort["authorize"]>[0],
  ): Promise<AuthorizationDecision> {
    this.calls++;
    if (this.outcome === "deny") return Promise.resolve(deniedDecision());
    return Promise.resolve(
      allowedFor(
        input.context,
        input.actor,
        input.scope,
        input.action as Action,
        input.resource,
        this.fieldMask,
        this.snapshotReference,
      ),
    );
  }
}

export class RecordingReferenceVerifier
  implements FinancialRiskReferenceVerificationPort {
  calls = 0;
  authorization?: AllowedAuthorizationDecision;

  constructor(private failure?: Error) {}

  setFailure(failure?: Error): void {
    this.failure = failure;
  }

  clearFailure(): void {
    this.failure = undefined;
  }

  verify(
    _context: RequestContext,
    authorization: AllowedAuthorizationDecision,
  ): Promise<void> {
    this.calls++;
    this.authorization = authorization;
    return this.failure === undefined
      ? Promise.resolve()
      : Promise.reject(this.failure);
  }
}

export class RecordingInputLoader implements FinancialRiskInputLoader {
  calls = 0;
  authorization?: AllowedAuthorizationDecision;
  private failure?: Error;

  setFailure(failure?: Error): void {
    this.failure = failure;
  }

  load(
    _context: RequestContext,
    authorization: AllowedAuthorizationDecision,
  ): Promise<FinancialRiskInput> {
    this.calls++;
    this.authorization = authorization;
    if (this.failure !== undefined) return Promise.reject(this.failure);
    return Promise.resolve(TEST_INPUT);
  }
}

export class FakeFinancialRiskInference implements FinancialRiskInferencePort {
  calls = 0;

  constructor(
    private readonly result: FinancialRiskInferenceResult = MODEL_RESULT,
  ) {}

  infer(): Promise<FinancialRiskInferenceResult> {
    this.calls++;
    return Promise.resolve(this.result);
  }
}

export class FreshnessFlippingInference implements FinancialRiskInferencePort {
  calls = 0;

  constructor(private readonly references: RecordingReferenceVerifier) {}

  infer(): Promise<FinancialRiskInferenceResult> {
    this.calls++;
    this.references.setFailure(
      new FinancialRiskError(
        "EXACT_VERSION_MISMATCH",
        "Exact source version changed during inference.",
      ),
    );
    return Promise.resolve(MODEL_RESULT);
  }
}

export class ThrowingFinancialRiskInference
  implements FinancialRiskInferencePort {
  infer(): Promise<never> {
    return Promise.reject(new Error("inference adapter failed"));
  }
}

export class RecordingFinancialRiskJobPort implements FinancialRiskJobPort {
  readonly jobs = new Map<string, DurableJob>();
  readonly statuses = new Map<string, FinancialRiskJobStatus>();
  statusCalls = 0;
  private readonly claims = new Map<string, TestJobClaim>();
  enqueueCalls = 0;

  constructor(private failure?: Error) {}

  clearFailure(): void {
    this.failure = undefined;
  }

  enqueue(job: DurableJob): Promise<void> {
    this.enqueueCalls++;
    if (this.failure !== undefined) return Promise.reject(this.failure);
    this.jobs.set(job.jobId, job);
    this.statuses.set(job.jobId, queuedJobStatus(job));
    return Promise.resolve();
  }

  claimAndEnqueue(
    claim: FinancialRiskIdempotencyClaim,
    job: DurableJob,
  ): Promise<FinancialRiskIdempotencyClaimResult> {
    const key = claimKey(claim);
    const existing = this.claims.get(key);
    if (existing !== undefined) {
      if (existing.payloadDigest !== claim.payloadDigest) {
        return Promise.reject(
          new Error(
            `IDEMPOTENCY_CONFLICT: key "${claim.idempotencyKey}" payload changed.`,
          ),
        );
      }
      return existing.state === "failed"
        ? Promise.resolve({
          status: "failed",
          failureCode: existing.failureCode!,
        })
        : existing.state === "completed"
        ? Promise.resolve({ status: "replayed", resultId: existing.jobId! })
        : Promise.resolve({ status: "in_progress" });
    }
    this.enqueueCalls++;
    if (this.failure !== undefined) return Promise.reject(this.failure);
    this.jobs.set(job.jobId, job);
    this.statuses.set(job.jobId, queuedJobStatus(job));
    this.claims.set(key, { ...claim, state: "completed", jobId: job.jobId });
    return Promise.resolve({ status: "claimed" });
  }

  peek(
    claim: FinancialRiskIdempotencyClaim,
  ): Promise<FinancialRiskQueueLookupResult> {
    const existing = this.claims.get(claimKey(claim));
    if (existing === undefined) return Promise.resolve({ status: "missing" });
    if (existing.payloadDigest !== claim.payloadDigest) {
      return Promise.reject(
        new Error(
          `IDEMPOTENCY_CONFLICT: key "${claim.idempotencyKey}" payload changed.`,
        ),
      );
    }
    if (existing.state === "failed") {
      return Promise.resolve({
        status: "failed",
        failureCode: existing.failureCode!,
      });
    }
    return existing.state === "completed"
      ? Promise.resolve({ status: "replayed", resultId: existing.jobId! })
      : Promise.resolve({ status: "in_progress" });
  }

  claimAndFail(
    claim: FinancialRiskIdempotencyClaim,
    failureCode: FinancialRiskVersionConflictCode,
  ): Promise<FinancialRiskIdempotencyClaimResult> {
    const key = claimKey(claim);
    const existing = this.claims.get(key);
    if (existing !== undefined) {
      if (existing.state === "failed") {
        return Promise.resolve({
          status: "failed",
          failureCode: existing.failureCode!,
        });
      }
      if (existing.state === "completed") {
        return Promise.resolve({
          status: "replayed",
          resultId: existing.jobId!,
        });
      }
      return Promise.resolve({ status: "in_progress" });
    }
    this.claims.set(key, { ...claim, state: "failed", failureCode });
    return Promise.resolve({ status: "failed", failureCode });
  }

  find(
    _scope: FinancialRiskScope,
    jobId: string,
  ): Promise<DurableJob | undefined> {
    return Promise.resolve(this.jobs.get(jobId));
  }

  findStatus(
    scope: FinancialRiskScope,
    jobId: JobId,
  ): Promise<FinancialRiskJobStatus | undefined> {
    this.statusCalls++;
    const job = this.jobs.get(jobId);
    if (
      job === undefined || job.tenantId !== scope.tenantId ||
      job.workspaceId !== scope.workspaceId || job.dealId !== scope.dealId
    ) return Promise.resolve(undefined);
    return Promise.resolve(this.statuses.get(jobId));
  }
}

function queuedJobStatus(job: DurableJob): FinancialRiskJobStatus {
  return {
    schemaVersion: 1,
    jobId: job.jobId,
    operationId: job.operationId,
    state: "queued",
    progress: 0,
    attemptCount: 0,
    cancellationRequested: false,
    createdAt: job.createdAt,
  };
}

export class RecordingFinancialRiskFindingProposalPort
  implements FinancialRiskFindingProposalPort {
  readonly context = "diligence_decisions" as const;
  calls = 0;
  lastInput?: FinancialRiskFindingProposalInput;

  propose(
    input: FinancialRiskFindingProposalInput,
  ): Promise<FinancialRiskFindingProposal> {
    this.calls++;
    this.lastInput = input;
    return Promise.resolve({
      findingId: input.findingId,
      state: "proposed",
      version: 1,
      basisDigest: input.assessment.references.evidenceBasis.basisDigest,
      commandStatus: "accepted",
    });
  }
}

function allowedFor(
  context: RequestContext,
  actor: ActorReference,
  scope: FinancialRiskScope,
  command: Action,
  resource: { readonly kind: string; readonly id: string },
  fieldMask: FieldMask,
  snapshotReference?: string,
): AuthorizationDecision {
  return allowedDecision({
    request: {
      context,
      actor,
      scope,
      resource: { kind: resource.kind as never, id: resource.id },
      action: command,
      requestedFields: [],
      roleFacts: [],
      grantFacts: [],
      restrictionFacts: [],
      relationshipFacts: [],
      clock: { now: () => TEST_TIME.toISOString() },
      ...(snapshotReference === undefined ? {} : {
        authorityRequirement: {
          humanOnly: false,
          action: command,
          snapshotReference: authoritySnapshotReference(snapshotReference),
        },
      }),
    },
    allowedActions: [command],
    fieldMask,
  });
}

function deniedDecision(): AuthorizationDecision {
  return {
    outcome: "deny",
    reasonCode: "NO_MATCHING_GRANT",
    allowedActions: [],
    approvedScope: undefined,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}

function claimKey(claim: FinancialRiskIdempotencyClaim): string {
  return [
    claim.scope.tenantId,
    claim.scope.workspaceId,
    claim.scope.dealId,
    claim.commandType,
    claim.actorId,
    claim.assessmentId,
    claim.idempotencyKey,
  ].join(":");
}

type TestJobClaim = FinancialRiskIdempotencyClaim & {
  readonly state: "in_progress" | "completed" | "failed";
  readonly jobId?: string;
  readonly failureCode?: FinancialRiskIdempotencyFailureCode;
};
