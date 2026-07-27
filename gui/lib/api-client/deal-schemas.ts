import { z } from "zod";

import {
  idSchema,
  jsonObjectSchema,
  moneySchema,
  timestampSchema,
} from "./common-schemas";
import { teamAssignmentSchema } from "./team-schemas";

export const dealTypeSchema = z.enum(["buy_side", "sell_side"]);
export const dealStatusSchema = z.enum(["active", "archived", "completed"]);
export const dealPhaseSchema = z.enum([
  "sourcing",
  "due_diligence",
  "negotiation",
  "closing",
]);

export const dealTargetSchema = z.object({
  id: idSchema,
  legalName: z.string(),
  sector: z.string(),
  countryCode: z.string().length(2),
});

export const advisorSummarySchema = z.object({
  id: idSchema,
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
});

export const valuationRangeSchema = z.object({
  min: moneySchema,
  max: moneySchema,
});

export const dealSummarySchema = z.object({
  id: idSchema,
  code: z.string(),
  title: z.string(),
  dealType: dealTypeSchema,
  status: dealStatusSchema,
  currentPhase: dealPhaseSchema,
  target: dealTargetSchema,
  valuationRange: valuationRangeSchema,
  leadAdvisor: advisorSummarySchema.nullable(),
  updatedAt: timestampSchema,
  version: z.number().int().positive(),
});

export const phaseHistoryEntrySchema = z.object({
  id: idSchema,
  fromPhase: dealPhaseSchema.nullable(),
  toPhase: dealPhaseSchema,
  comment: z.string().nullable(),
  changedAt: timestampSchema,
  changedBy: advisorSummarySchema.nullable(),
});

export const dealDetailSchema = dealSummarySchema.extend({
  phaseHistory: z.array(phaseHistoryEntrySchema),
  financialStructure: jsonObjectSchema.nullable(),
  teamAssignments: z.array(teamAssignmentSchema),
});

export const dealCreateSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  dealType: dealTypeSchema,
  targetId: idSchema,
  valuationRange: valuationRangeSchema,
  leadAdvisorId: idSchema.nullable(),
  financialStructure: jsonObjectSchema.nullable(),
});

export const dealUpdateSchema = dealCreateSchema.partial().extend({
  version: z.number().int().positive(),
});

export const phaseTransitionSchema = z.object({
  toPhase: dealPhaseSchema,
  comment: z.string().trim().min(1),
  version: z.number().int().positive(),
});
