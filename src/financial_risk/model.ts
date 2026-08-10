import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  CorrelationId,
  IdempotencyKey,
  JobId,
  OperationId,
} from "../platform/api/v1.ts";
import type {
  CalculationId,
  EvidenceId,
  EvidenceScope,
  ExactDocumentVersionReference,
  FactVersionId,
} from "../evidence_knowledge/v1.ts";
import type { ExactEvidenceBasis } from "../diligence_decisions/basis.ts";
import {
  type ZScoreLabel,
  ZScoreLabel as ZScoreLabels,
} from "../engines/prediction/contracts.ts";
import type {
  FinancialRiskAssessmentId,
  FinancialRiskResultId,
} from "./ids.ts";
import { FinancialRiskError } from "./errors.ts";

export type FinancialRiskScope = EvidenceScope;
export type FinancialRiskResultState =
  | "completed"
  | "fallback"
  | "unavailable"
  | "failed"
  | "cancelled"
  | "stale"
  | "superseded";

export interface FinancialRiskInput {
  readonly ebitda: number;
  readonly revenue: number;
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  readonly operatingCashFlow: number;
  readonly historicalVolatility: number;
}

export function assertFinancialRiskInput(input: FinancialRiskInput): void {
  for (const [name, value] of Object.entries(input)) {
    if (Number.isFinite(value)) continue;
    throw invalid(
      `Financial-risk input "${name}" has value "${
        String(value)
      }"; expected a finite number.`,
    );
  }
}

export interface FinancialDataReference {
  readonly kind: "financial_data";
  readonly sourceId: string;
  readonly version: number;
  readonly checksum: string;
}

export interface FinancialRiskCalculationReference {
  readonly kind: "calculation";
  readonly calculationId: CalculationId;
  readonly version: number;
  readonly algorithmVersion: string;
}

export type FinancialRiskEvidenceReference =
  | {
    readonly kind: "document_version";
    readonly reference: ExactDocumentVersionReference;
  }
  | {
    readonly kind: "evidence";
    readonly evidenceId: EvidenceId;
    readonly version: number;
  }
  | {
    readonly kind: "fact_version";
    readonly factVersionId: FactVersionId;
    readonly version: number;
  };

export interface FinancialRiskReferences {
  readonly financialData: readonly FinancialDataReference[];
  readonly evidenceBasis: ExactEvidenceBasis;
  readonly calculations: readonly FinancialRiskCalculationReference[];
}

export interface FinancialRiskOutputs {
  readonly insolvencyRisk: number;
  readonly churnProbability: number;
  readonly dcfVolatility: number;
  readonly industry4Score: number;
  readonly zScore: ZScoreLabel;
}

export interface FinancialRiskPromptLineage {
  readonly templateReference: string;
  readonly templateVersion: string;
  readonly promptDigest: string;
}

export type FinancialRiskReadiness =
  | "reference-only"
  | "not-claimed"
  | "unavailable";

interface FinancialRiskProvenanceBase {
  readonly providerIdentity?: string;
  readonly prompt?: FinancialRiskPromptLineage;
  readonly inputDigest?: string;
  readonly modelId?: string;
  readonly modelVersion?: string;
  readonly artifactChecksum?: string;
  readonly readiness: FinancialRiskReadiness;
  readonly runtimeIdentity: string;
  readonly adapterIdentity: string;
}

export type FinancialRiskProvenance =
  | (FinancialRiskProvenanceBase & {
    readonly kind: "model-inference";
    readonly modelId: string;
    readonly modelVersion: string;
    readonly artifactChecksum: string;
    readonly readiness: "reference-only";
  })
  | (FinancialRiskProvenanceBase & {
    readonly kind: "configured-fallback";
    readonly fallbackReason: string;
    readonly readiness: "not-claimed";
  })
  | (FinancialRiskProvenanceBase & {
    readonly kind:
      | "unavailable"
      | "failed"
      | "cancelled"
      | "stale"
      | "superseded";
    readonly reason: string;
  });

export interface FinancialRiskExecutionReference {
  readonly operationId: OperationId;
  readonly jobId: JobId;
  readonly status: "queued" | "completed" | "failed" | "cancelled";
}

export interface FinancialRiskResult {
  readonly aggregateType: "financial_risk_result";
  readonly resultId: FinancialRiskResultId;
  readonly assessmentId: FinancialRiskAssessmentId;
  readonly scope: FinancialRiskScope;
  readonly version: AggregateVersion;
  readonly state: FinancialRiskResultState;
  readonly outputs?: FinancialRiskOutputs;
  readonly provenance: FinancialRiskProvenance;
  readonly references: FinancialRiskReferences;
  readonly actor: ActorReference;
  readonly correlationId: CorrelationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly execution: FinancialRiskExecutionReference;
  readonly supersedesResultId?: FinancialRiskResultId;
  readonly reason?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function assertFinancialRiskReferences(
  references: FinancialRiskReferences,
  expectedScope?: FinancialRiskScope,
): void {
  if (references.financialData.length === 0) {
    throw invalid(
      "Financial data references are empty; expected an exact version.",
    );
  }
  if (references.calculations.length === 0) {
    throw invalid(
      "Calculation references are empty; expected an exact version.",
    );
  }
  if (
    expectedScope !== undefined && !sameScope(
      references.evidenceBasis.scope,
      expectedScope,
    )
  ) {
    throw invalid(
      `Evidence basis scope "${
        JSON.stringify(references.evidenceBasis.scope)
      }" does not match result scope "${
        JSON.stringify(expectedScope)
      }"; expected exact tenant, workspace, and deal scope.`,
    );
  }
  for (const reference of references.financialData) {
    assertPositive(reference.version, "Financial data version");
    assertChecksum(reference.checksum, "Financial data checksum");
    assertText(reference.sourceId, "Financial data source ID");
  }
  for (const reference of references.calculations) {
    assertPositive(reference.version, "Calculation version");
    assertText(reference.algorithmVersion, "Calculation algorithm version");
  }
}

export function createFinancialRiskResult(
  input: FinancialRiskResult,
): FinancialRiskResult {
  assertFinancialRiskReferences(input.references, input.scope);
  assertScope(input.scope);
  assertVersion(input.version, "Financial-risk result version");
  assertDate(input.createdAt, "Financial-risk result creation time");
  assertDate(input.updatedAt, "Financial-risk result update time");
  assertStatePayload(input);
  return Object.freeze({
    ...input,
    scope: Object.freeze({ ...input.scope }),
    references: Object.freeze({
      ...input.references,
      financialData: Object.freeze([...input.references.financialData]),
      evidenceBasis: freezeEvidenceBasis(input.references.evidenceBasis),
      calculations: Object.freeze([...input.references.calculations]),
    }),
    actor: Object.freeze({ ...input.actor }),
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
  });
}

function assertStatePayload(input: FinancialRiskResult): void {
  const needsOutputs = input.state === "completed" ||
    input.state === "fallback";
  const expectedProvenance = input.state === "completed"
    ? "model-inference"
    : input.state === "fallback"
    ? "configured-fallback"
    : input.state;
  if (input.provenance.kind !== expectedProvenance) {
    throw invalid(
      `Result state "${input.state}" has provenance "${input.provenance.kind}"; expected "${expectedProvenance}".`,
    );
  }
  if (needsOutputs && input.outputs === undefined) {
    throw invalid(`Result state "${input.state}" has no model outputs.`);
  }
  if (!needsOutputs && input.outputs !== undefined) {
    throw invalid(`Result state "${input.state}" cannot carry model outputs.`);
  }
  if (input.outputs !== undefined) assertFinancialRiskOutputs(input.outputs);
  if (needsOutputs) assertInferenceLineage(input.provenance);
}

function assertInferenceLineage(
  provenance: FinancialRiskProvenance,
): void {
  if (
    provenance.providerIdentity === undefined ||
    provenance.prompt === undefined || provenance.inputDigest === undefined
  ) {
    throw invalid(
      `Result state "${provenance.kind}" is missing provider, prompt, or input lineage.`,
    );
  }
  assertText(provenance.providerIdentity, "Provider identity");
  assertPrompt(provenance.prompt);
  assertDigest(provenance.inputDigest, "Input digest");
}

function assertPrompt(prompt: FinancialRiskPromptLineage): void {
  assertText(prompt.templateReference, "Prompt template reference");
  assertText(prompt.templateVersion, "Prompt template version");
  if (/^sha256:[0-9a-f]{64}$/.test(prompt.promptDigest)) return;
  throw invalid(
    `Prompt digest "${prompt.promptDigest}" is invalid; expected sha256:<64 lowercase hex characters>.`,
  );
}

export function assertFinancialRiskOutputs(
  outputs: FinancialRiskOutputs,
): void {
  assertRange(outputs.insolvencyRisk, "Insolvency risk", 0, 1);
  assertRange(outputs.churnProbability, "Churn probability", 0, 1);
  assertRange(outputs.dcfVolatility, "DCF volatility", 0, 100);
  assertRange(outputs.industry4Score, "Industry score", 0, 100);
  if (Object.values(ZScoreLabels).includes(outputs.zScore)) return;
  throw invalid(
    `Z-score classification "${
      String(outputs.zScore)
    }" is invalid; expected Safe, Grey, or Distress.`,
  );
}

function freezeEvidenceBasis(
  basis: ExactEvidenceBasis,
): ExactEvidenceBasis {
  return Object.freeze({
    ...basis,
    scope: Object.freeze({ ...basis.scope }),
    references: Object.freeze(
      basis.references.map((reference) => Object.freeze({ ...reference })),
    ),
    capturedAt: new Date(basis.capturedAt),
  });
}

function sameScope(
  left: FinancialRiskScope,
  right: FinancialRiskScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function assertScope(scope: FinancialRiskScope): void {
  assertText(scope.tenantId, "Tenant ID");
  assertText(scope.workspaceId, "Workspace ID");
  assertText(scope.dealId, "Deal ID");
}

function assertVersion(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw invalid(`${label} "${value}" is invalid; expected a positive version.`);
}

function assertPositive(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw invalid(`${label} "${value}" is invalid; expected a positive version.`);
}

function assertRange(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): void {
  if (Number.isFinite(value) && value >= minimum && value <= maximum) return;
  throw invalid(
    `${label} "${value}" is invalid; expected ${minimum}-${maximum}.`,
  );
}

function assertChecksum(value: string, label: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw invalid(`${label} "${value}" is invalid; expected lowercase SHA-256.`);
}

function assertDigest(value: string, label: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw invalid(`${label} "${value}" is invalid; expected lowercase SHA-256.`);
}

function assertText(value: string, label: string): void {
  if (typeof value === "string" && value.trim() && value.length <= 256) return;
  throw invalid(
    `${label} "${value}" is invalid; expected bounded non-empty text.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw invalid(
    `${label} "${String(value)}" is invalid; expected a valid date.`,
  );
}

function invalid(message: string): FinancialRiskError {
  return new FinancialRiskError("INVALID_INPUT", message);
}
