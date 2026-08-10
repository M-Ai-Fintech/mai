import { z } from "zod";

import { timestampSchema } from "./common-schemas";

const identifier = (prefix: string, maximum = 96) =>
  z.string().max(maximum).regex(
    new RegExp(`^${prefix}[a-z0-9]+(?:-[a-z0-9]+)*$`),
  );

const tenantIdSchema = identifier("tenant_", 64);
const workspaceIdSchema = identifier("workspace_", 64);
const dealIdSchema = identifier("deal_", 64);
const assessmentIdSchema = identifier("risk_assessment_");
const resultIdSchema = identifier("risk_result_");
const invalidationIdSchema = identifier("risk_invalidation_");
const operationIdSchema = identifier("op_", 64);
const jobIdSchema = identifier("job_", 64);
const calculationIdSchema = identifier("calc_");
const evidenceIdSchema = identifier("evidence_");
const factVersionIdSchema = identifier("factver_");
const documentVersionIdSchema = identifier("docver_");
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const financialRiskScopeSchema = z.object({
  tenantId: tenantIdSchema,
  workspaceId: workspaceIdSchema,
  dealId: dealIdSchema,
});

const citationLocationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page"), page: z.number().int().positive() }),
  z.object({
    kind: z.literal("line"),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  }).refine((location) => location.endLine >= location.startLine),
  z.object({
    kind: z.literal("character"),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }).refine((location) => location.end >= location.start),
  z.object({
    kind: z.literal("artifact"),
    artifactId: z.string().trim().min(1),
  }),
]);

const documentVersionReferenceSchema = z.object({
  documentVersionId: documentVersionIdSchema,
  checksum: z.object({
    algorithm: z.literal("sha256"),
    value: sha256Schema,
  }),
  location: citationLocationSchema,
  classification: z.enum(["legal", "financial", "tax", "operational", "other"]),
  processingVersion: z.string().trim().min(1),
});

const evidenceBasisReferenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("document_version"),
    reference: documentVersionReferenceSchema,
  }),
  z.object({ kind: z.literal("evidence"), evidenceId: evidenceIdSchema }),
  z.object({
    kind: z.literal("fact_version"),
    factVersionId: factVersionIdSchema,
  }),
]);

export const financialRiskEvidenceBasisSchema = z.object({
  scope: financialRiskScopeSchema,
  references: z.array(evidenceBasisReferenceSchema).min(1),
  basisDigest: sha256Schema,
  capturedAt: timestampSchema,
});

export const financialRiskReferencesSchema = z.object({
  financialData: z.array(z.object({
    kind: z.literal("financial_data"),
    sourceId: z.string().trim().min(1),
    version: z.number().int().positive(),
    checksum: sha256Schema,
  })).min(1),
  evidenceBasis: financialRiskEvidenceBasisSchema,
  calculations: z.array(z.object({
    kind: z.literal("calculation"),
    calculationId: calculationIdSchema,
    version: z.number().int().positive(),
    algorithmVersion: z.string().trim().min(1),
  })).min(1),
});

const financialRiskOutputsSchema = z.object({
  insolvencyRisk: z.number().finite().min(0).max(1),
  churnProbability: z.number().finite().min(0).max(1),
  dcfVolatility: z.number().finite().min(0).max(100),
  industry4Score: z.number().finite().min(0).max(100),
  zScore: z.enum(["Safe", "Grey", "Distress"]),
});

const modelInferenceProvenanceSchema = z.object({
  kind: z.literal("model-inference"),
  modelId: z.string().trim().min(1).optional(),
  modelVersion: z.string().trim().min(1).optional(),
  artifactChecksum: sha256Schema.optional(),
  readiness: z.literal("reference-only"),
});

const configuredFallbackProvenanceSchema = z.object({
  kind: z.literal("configured-fallback"),
  readiness: z.literal("not-claimed"),
  reasonCode: z.literal("CONFIGURED_FALLBACK"),
});

function unavailableProvenance(
  kind: "unavailable" | "failed" | "cancelled" | "stale" | "superseded",
  reasonCode:
    | "CAPABILITY_UNAVAILABLE"
    | "INFERENCE_FAILED"
    | "CANCELLED"
    | "SOURCE_STALE"
    | "RESULT_SUPERSEDED",
) {
  return z.object({
    kind: z.literal(kind),
    readiness: z.literal("unavailable"),
    reasonCode: z.literal(reasonCode),
  });
}

const assessmentCommonSchema = z.object({
  schemaVersion: z.literal(1),
  aggregateType: z.literal("financial_risk_result"),
  assessmentId: assessmentIdSchema,
  resultId: resultIdSchema,
  version: z.number().int().positive(),
  supersedesResultId: resultIdSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const financialRiskAssessmentSchema = z.discriminatedUnion("state", [
  assessmentCommonSchema.extend({
    state: z.literal("completed"),
    reasonCode: z.literal("MODEL_INFERENCE"),
    outputs: financialRiskOutputsSchema.optional(),
    provenance: modelInferenceProvenanceSchema,
  }),
  assessmentCommonSchema.extend({
    state: z.literal("fallback"),
    reasonCode: z.literal("CONFIGURED_FALLBACK"),
    outputs: financialRiskOutputsSchema.optional(),
    provenance: configuredFallbackProvenanceSchema,
  }),
  assessmentCommonSchema.extend({
    state: z.literal("unavailable"),
    reasonCode: z.literal("CAPABILITY_UNAVAILABLE"),
    provenance: unavailableProvenance("unavailable", "CAPABILITY_UNAVAILABLE"),
  }),
  assessmentCommonSchema.extend({
    state: z.literal("failed"),
    reasonCode: z.literal("INFERENCE_FAILED"),
    provenance: unavailableProvenance("failed", "INFERENCE_FAILED"),
  }),
  assessmentCommonSchema.extend({
    state: z.literal("cancelled"),
    reasonCode: z.literal("CANCELLED"),
    provenance: unavailableProvenance("cancelled", "CANCELLED"),
  }),
  assessmentCommonSchema.extend({
    state: z.literal("stale"),
    reasonCode: z.literal("SOURCE_STALE"),
    provenance: unavailableProvenance("stale", "SOURCE_STALE"),
  }),
  assessmentCommonSchema.extend({
    state: z.literal("superseded"),
    reasonCode: z.literal("RESULT_SUPERSEDED"),
    provenance: unavailableProvenance("superseded", "RESULT_SUPERSEDED"),
  }),
]);

export const financialRiskJobStateSchema = z.enum([
  "queued",
  "running",
  "retry_scheduled",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
  "dead_lettered",
]);

export const financialRiskJobStatusSchema = z.object({
  schemaVersion: z.literal(1),
  jobId: jobIdSchema,
  operationId: operationIdSchema.optional(),
  state: financialRiskJobStateSchema,
  progress: z.number().int().min(0).max(100),
  attemptCount: z.number().int().nonnegative(),
  cancellationRequested: z.boolean(),
  createdAt: timestampSchema,
  startedAt: timestampSchema.optional(),
  terminalAt: timestampSchema.optional(),
});

export const financialRiskAcceptedJobDataSchema = z.object({
  operationId: operationIdSchema,
  jobId: jobIdSchema,
  status: z.enum(["queued", "accepted"]),
  statusUrl: z.string().min(1),
});

export const financialRiskComputeRequestSchema = z.object({
  resultId: resultIdSchema,
  operationId: operationIdSchema,
  jobId: jobIdSchema,
  references: financialRiskReferencesSchema,
});

export const financialRiskInvalidationRequestSchema = z.object({
  resultId: resultIdSchema,
  invalidationId: invalidationIdSchema,
  operationId: operationIdSchema,
  jobId: jobIdSchema,
  reason: z.string().trim().min(1),
});

export type FinancialRiskScope = z.infer<typeof financialRiskScopeSchema>;
type ParsedFinancialRiskReferences = z.infer<
  typeof financialRiskReferencesSchema
>;
export type FinancialRiskReferences = Readonly<{
  readonly financialData:
    readonly ParsedFinancialRiskReferences["financialData"][number][];
  readonly evidenceBasis: FinancialRiskEvidenceBasis;
  readonly calculations:
    readonly ParsedFinancialRiskReferences["calculations"][number][];
}>;
type ParsedFinancialRiskEvidenceBasis = z.infer<
  typeof financialRiskEvidenceBasisSchema
>;
export type FinancialRiskEvidenceBasis = Readonly<{
  readonly scope: ParsedFinancialRiskEvidenceBasis["scope"];
  readonly references:
    readonly ParsedFinancialRiskEvidenceBasis["references"][number][];
  readonly basisDigest: ParsedFinancialRiskEvidenceBasis["basisDigest"];
  readonly capturedAt: ParsedFinancialRiskEvidenceBasis["capturedAt"];
}>;
export type FinancialRiskOutputs = z.infer<typeof financialRiskOutputsSchema>;
export type FinancialRiskAssessment = z.infer<
  typeof financialRiskAssessmentSchema
>;
export type FinancialRiskJobState = z.infer<typeof financialRiskJobStateSchema>;
export type FinancialRiskJobStatus = z.infer<
  typeof financialRiskJobStatusSchema
>;
export type FinancialRiskAcceptedJobData = z.infer<
  typeof financialRiskAcceptedJobDataSchema
>;
