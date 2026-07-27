import { z } from "zod";

import { jsonObjectSchema } from "./common-schemas";

export const legacyDealSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  code: z.string(),
  targetValuation: z.coerce.number(),
  currency: z.string(),
  createdAt: z.string().optional(),
  status: z.string().nullable(),
  type: z.string().nullable(),
  strategy: z.string().nullable(),
  targetId: z.string().nullable().optional(),
  targetName: z.string().nullable().optional(),
  targetCnpj: z.string().nullable().optional(),
  targetSector: z.string().nullable().optional(),
  targetOriginCountry: z.string().nullable().optional(),
  currentPhase: z.string().nullable(),
  currentPhaseStatus: z.string().nullable(),
  currentPhaseStartedAt: z.string().nullable().optional(),
  currentPhaseComments: z.string().nullable().optional(),
});

export const legacyDealDetailSchema = legacyDealSummarySchema
  .omit({
    targetId: true,
    targetName: true,
    targetCnpj: true,
    targetSector: true,
    targetOriginCountry: true,
    currentPhase: true,
    currentPhaseStatus: true,
    currentPhaseStartedAt: true,
    currentPhaseComments: true,
  })
  .extend({
    financial_structure: jsonObjectSchema.nullable(),
    business: jsonObjectSchema.nullable(),
    phase_history: z.array(jsonObjectSchema),
  });
