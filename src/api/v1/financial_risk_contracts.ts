import {
  createExactEvidenceBasis,
  type EvidenceBasisReference,
  type ExactEvidenceBasis,
} from "../../diligence_decisions/basis.ts";
import {
  type CitationLocation,
  createExactDocumentVersionReference,
  type EvidenceClassification,
  type ExactDocumentVersionReference,
} from "../../evidence_knowledge/v1.ts";
import {
  parseCalculationId,
  parseEvidenceId,
  parseFactVersionId,
} from "../../evidence_knowledge/ids.ts";
import { parseDocumentVersionId } from "../../documents/ids.ts";
import {
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../platform/api/v1.ts";
import type {
  FinancialDataReference,
  FinancialRiskCalculationReference,
  FinancialRiskOutputs,
  FinancialRiskProvenance,
  FinancialRiskReferences,
  FinancialRiskResult,
  FinancialRiskResultState,
  FinancialRiskScope,
} from "../../financial_risk/model.ts";

export type FinancialRiskApiState = FinancialRiskResultState;

export type FinancialRiskApiEvidenceBasis =
  & Omit<
    ExactEvidenceBasis,
    "capturedAt"
  >
  & { readonly capturedAt: string };

export type FinancialRiskApiReferences =
  & Omit<
    FinancialRiskReferences,
    "evidenceBasis"
  >
  & { readonly evidenceBasis: FinancialRiskApiEvidenceBasis };

export interface FinancialRiskAssessmentResponse {
  readonly aggregateType: "financial_risk_result";
  readonly resultId: FinancialRiskResult["resultId"];
  readonly assessmentId: FinancialRiskResult["assessmentId"];
  readonly scope: FinancialRiskScope;
  readonly version: FinancialRiskResult["version"];
  readonly state: FinancialRiskApiState;
  readonly outputs?: FinancialRiskOutputs;
  readonly provenance: FinancialRiskProvenance;
  readonly references: FinancialRiskApiReferences;
  readonly execution: FinancialRiskResult["execution"];
  readonly supersedesResultId?: FinancialRiskResult["supersedesResultId"];
  readonly reason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function financialRiskAssessmentResponse(
  result: FinancialRiskResult,
): FinancialRiskAssessmentResponse {
  return {
    aggregateType: result.aggregateType,
    resultId: result.resultId,
    assessmentId: result.assessmentId,
    scope: result.scope,
    version: result.version,
    state: result.state,
    ...(result.outputs === undefined ? {} : { outputs: result.outputs }),
    provenance: result.provenance,
    references: {
      ...result.references,
      evidenceBasis: {
        ...result.references.evidenceBasis,
        capturedAt: result.references.evidenceBasis.capturedAt.toISOString(),
      },
    },
    execution: result.execution,
    ...(result.supersedesResultId === undefined
      ? {}
      : { supersedesResultId: result.supersedesResultId }),
    ...(result.reason === undefined ? {} : { reason: result.reason }),
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

export type FinancialRiskReferencesParseResult =
  | { readonly ok: true; readonly value: FinancialRiskReferences }
  | { readonly ok: false };

export function parseFinancialRiskReferences(
  value: unknown,
  expectedScope: FinancialRiskScope,
): FinancialRiskReferencesParseResult {
  if (!isRecord(value)) return invalidReferences();
  const financialData = parseFinancialData(value.financialData);
  const calculations = parseCalculations(value.calculations);
  const evidenceBasis = parseEvidenceBasis(value.evidenceBasis, expectedScope);
  if (
    financialData === undefined || calculations === undefined ||
    evidenceBasis === undefined
  ) return invalidReferences();
  return {
    ok: true,
    value: { financialData, evidenceBasis, calculations },
  };
}

function parseFinancialData(
  value: unknown,
): readonly FinancialDataReference[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const references: FinancialDataReference[] = [];
  for (const item of value) {
    if (!isRecord(item) || item.kind !== "financial_data") return undefined;
    if (
      typeof item.sourceId !== "string" || !item.sourceId.trim() ||
      !positiveInteger(item.version) || !sha256(item.checksum)
    ) return undefined;
    references.push({
      kind: "financial_data",
      sourceId: item.sourceId,
      version: item.version,
      checksum: item.checksum,
    });
  }
  return Object.freeze(references);
}

function parseCalculations(
  value: unknown,
): readonly FinancialRiskCalculationReference[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const references: FinancialRiskCalculationReference[] = [];
  for (const item of value) {
    if (!isRecord(item) || item.kind !== "calculation") return undefined;
    const calculationId = parseCalculationId(item.calculationId);
    if (
      !calculationId.ok || !positiveInteger(item.version) ||
      typeof item.algorithmVersion !== "string" ||
      !item.algorithmVersion.trim()
    ) return undefined;
    references.push({
      kind: "calculation",
      calculationId: calculationId.value,
      version: item.version,
      algorithmVersion: item.algorithmVersion,
    });
  }
  return Object.freeze(references);
}

function parseEvidenceBasis(
  value: unknown,
  expectedScope: FinancialRiskScope,
): ExactEvidenceBasis | undefined {
  if (!isRecord(value)) return undefined;
  const scope = parseScope(value.scope);
  const references = parseEvidenceReferences(value.references);
  const capturedAt = parseDate(value.capturedAt);
  if (
    scope === undefined || references === undefined || capturedAt === undefined
  ) return undefined;
  if (!sameScope(scope, expectedScope)) return undefined;
  if (!sha256(value.basisDigest)) return undefined;
  try {
    return createExactEvidenceBasis({
      scope,
      references,
      basisDigest: value.basisDigest,
      capturedAt,
    });
  } catch {
    return undefined;
  }
}

function parseEvidenceReferences(
  value: unknown,
): readonly EvidenceBasisReference[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const references: EvidenceBasisReference[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.kind !== "string") return undefined;
    if (item.kind === "document_version") {
      const reference = parseDocumentReference(item.reference);
      if (reference === undefined) return undefined;
      references.push({ kind: item.kind, reference });
      continue;
    }
    if (item.kind === "evidence") {
      const evidenceId = parseEvidenceId(item.evidenceId);
      if (!evidenceId.ok) return undefined;
      references.push({ kind: item.kind, evidenceId: evidenceId.value });
      continue;
    }
    if (item.kind === "fact_version") {
      const factVersionId = parseFactVersionId(item.factVersionId);
      if (!factVersionId.ok) return undefined;
      references.push({ kind: item.kind, factVersionId: factVersionId.value });
      continue;
    }
    return undefined;
  }
  return Object.freeze(references);
}

function parseDocumentReference(
  value: unknown,
): ExactDocumentVersionReference | undefined {
  if (!isRecord(value)) return undefined;
  const documentVersionId = parseDocumentVersionId(value.documentVersionId);
  const checksum = parseChecksum(value.checksum);
  const location = parseLocation(value.location);
  const classification = parseClassification(value.classification);
  if (
    !documentVersionId.ok || checksum === undefined || location === undefined ||
    classification === undefined ||
    typeof value.processingVersion !== "string" ||
    !value.processingVersion.trim()
  ) return undefined;
  try {
    return createExactDocumentVersionReference({
      documentVersionId: documentVersionId.value,
      checksum,
      location,
      classification,
      processingVersion: value.processingVersion,
    });
  } catch {
    return undefined;
  }
}

function parseScope(value: unknown): FinancialRiskScope | undefined {
  if (!isRecord(value)) return undefined;
  const tenantId = parseTenantId(value.tenantId);
  const workspaceId = parseWorkspaceId(value.workspaceId);
  const dealId = parseDealId(value.dealId);
  if (!tenantId.ok || !workspaceId.ok || !dealId.ok) return undefined;
  return {
    tenantId: tenantId.value,
    workspaceId: workspaceId.value,
    dealId: dealId.value,
  };
}

function parseChecksum(
  value: unknown,
): { readonly algorithm: "sha256"; readonly value: string } | undefined {
  if (
    !isRecord(value) || value.algorithm !== "sha256" || !sha256(value.value)
  ) {
    return undefined;
  }
  return { algorithm: "sha256", value: value.value };
}

function parseLocation(value: unknown): CitationLocation | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") return undefined;
  if (value.kind === "page" && positiveInteger(value.page)) {
    return { kind: "page", page: value.page };
  }
  if (
    value.kind === "line" && positiveInteger(value.startLine) &&
    positiveInteger(value.endLine) && value.endLine >= value.startLine
  ) return { kind: "line", startLine: value.startLine, endLine: value.endLine };
  if (
    value.kind === "character" && nonNegativeInteger(value.start) &&
    nonNegativeInteger(value.end) && value.end >= value.start
  ) return { kind: "character", start: value.start, end: value.end };
  if (
    value.kind === "artifact" && typeof value.artifactId === "string" &&
    value.artifactId.trim()
  ) {
    return { kind: "artifact", artifactId: value.artifactId };
  }
  return undefined;
}

function parseClassification(
  value: unknown,
): EvidenceClassification | undefined {
  return value === "legal" || value === "financial" || value === "tax" ||
      value === "operational" || value === "other"
    ? value
    : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function sha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function sameScope(
  left: FinancialRiskScope,
  right: FinancialRiskScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function invalidReferences(): FinancialRiskReferencesParseResult {
  return { ok: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
