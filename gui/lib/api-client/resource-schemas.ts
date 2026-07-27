import { z } from "zod";

import {
  errorEnvelopeSchema,
  idSchema,
  jsonObjectSchema,
  timestampSchema,
} from "./common-schemas";

export const engineNameSchema = z.enum([
  "financial_risk",
  "portfolio_match",
  "negotiation",
]);

export const engineRunSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  engine: engineNameSchema,
  status: z.enum(["queued", "running", "completed", "failed"]),
  result: jsonObjectSchema.nullable(),
  error: errorEnvelopeSchema.shape.error.nullable(),
  createdAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
});

export const createEngineRunSchema = z.object({
  engine: engineNameSchema,
  input: jsonObjectSchema,
});

export const vdrDocumentSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: timestampSchema,
});

const generatedDocumentTypeSchema = z.enum([
  "due_diligence_report",
  "term_sheet",
  "closing_package",
]);

export const generatedDocumentSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  documentType: generatedDocumentTypeSchema,
  sourceRunId: idSchema,
  fileName: z.string(),
  downloadUrl: z.string().url(),
  createdAt: timestampSchema,
});

export const createDocumentResourceSchema = z.object({
  documentType: generatedDocumentTypeSchema,
  sourceRunId: idSchema,
});

export const notificationSchema = z.object({
  id: idSchema,
  type: z.enum(["deal", "engine", "document", "system"]),
  title: z.string(),
  body: z.string(),
  dealId: idSchema.nullable(),
  createdAt: timestampSchema,
  readAt: timestampSchema.nullable(),
});

export const widgetSchema = z.object({
  instanceId: idSchema,
  type: z.enum(["kpi", "pipeline_table", "agent_entry", "risk_summary"]),
  grid: z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
  config: jsonObjectSchema,
});

export const dashboardLayoutSchema = z.object({
  slug: z.string(),
  version: z.number().int().nonnegative(),
  widgets: z.array(widgetSchema),
  updatedAt: timestampSchema,
});

export const dashboardLayoutWriteSchema = z.object({
  version: z.number().int().nonnegative(),
  widgets: z.array(widgetSchema),
});

export const kybSchema = z.object({ cnpj: z.string().trim().min(1) });

export const kybResponseSchema = z.object({
  cnpj: z.string(),
  legalName: z.string(),
  tradeName: z.string(),
  registrationStatus: z.string(),
  foundingDate: z.string(),
  shareCapital: z.number(),
  legalEntity: z.string(),
  shareholders: z.array(z.object({ name: z.string(), role: z.string() })),
  federalClearance: z.string(),
  laborClearance: z.string(),
  slaveLaborList: z.string(),
  ceis: z.string(),
  taxDebtsAmount: z.number(),
});

export const predictSchema = z.object({
  name: z.string(),
  sector: z.string(),
  ebitda: z.number(),
  revenue: z.number(),
  assets: z.number(),
  liabilities: z.number(),
  cashflow: z.number(),
  volatility: z.number(),
});

export const predictResponseSchema = z.object({
  companyName: z.string(),
  metrics: z.object({ insolvencyRisk: z.number(), zScore: z.string() }),
  embeddingsGenerated: z.boolean(),
  dcfRiskLabel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  timestamp: timestampSchema,
});

export const portfolioSchema = z.object({
  budget: z.number(),
  riskTolerance: z.number(),
});

export const portfolioResponseSchema = z.object({
  optimization: z.object({
    status: z.string(),
    selectedTargetIds: z.array(z.string()),
  }),
  totalSynergy: z.number(),
  totalCost: z.number(),
  evaluatedProfiles: z.record(
    z.string(),
    z.object({ metrics: z.object({ insolvencyRisk: z.number() }) }),
  ),
});

export const negotiateSchema = z.object({
  valuationMin: z.number().optional(),
  valuationMax: z.number().optional(),
  preferences: z
    .object({
      cash: z.number(),
      equity: z.number(),
      earnOut: z.number(),
      escrow: z.number(),
    })
    .optional(),
  maxLeverage: z.number().optional(),
  minCoverage: z.number().optional(),
  geneticConfig: z
    .object({ populationSize: z.number(), generations: z.number() })
    .optional(),
});

export const negotiateResponseSchema = z.array(
  z.object({
    valuation: z.number(),
    cashPercentage: z.number(),
    equityPercentage: z.number(),
    earnOutPercentage: z.number(),
    escrowPercentage: z.number(),
    fitness: z.number(),
  }),
);

export const documentSchema = z.object({
  buyer: z.string(),
  seller: z.string(),
  target: z.string(),
  valuation: z.number(),
  output: z.string().optional(),
});

export const documentResponseSchema = z.object({
  status: z.literal("success"),
  file: z.string(),
});
