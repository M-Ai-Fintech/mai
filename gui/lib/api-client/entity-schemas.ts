import { z } from "zod";

import { idSchema, timestampSchema } from "./common-schemas";

export const entityRoleSchema = z.enum([
  "buyer",
  "seller",
  "target",
  "institution",
]);

export const kybStatusSchema = z.enum([
  "pending",
  "in_review",
  "approved",
  "rejected",
]);

export const entitySummarySchema = z.object({
  id: idSchema,
  legalName: z.string(),
  taxId: z.string(),
  sector: z.string(),
  countryCode: z.string().length(2),
  roles: z.array(entityRoleSchema).min(1),
  contactEmail: z.string().email(),
  kybStatus: kybStatusSchema,
  regulatoryClearanceRequired: z.boolean(),
  primaryAdvisorId: idSchema.nullable(),
  archivedAt: timestampSchema.nullable(),
  updatedAt: timestampSchema,
  version: z.number().int().positive(),
});

export const entityDetailSchema = entitySummarySchema.extend({
  createdAt: timestampSchema,
});

export const targetDossierSchema = z.object({
  entityId: idSchema,
  executiveSummary: z.string(),
  corporateStructure: z.string(),
  financialHealth: z.string(),
  litigationRisks: z.string(),
  marketPosition: z.string(),
  lastUpdated: timestampSchema,
  version: z.number().int().positive(),
});

export const updateTargetDossierSchema = z.object({
  executiveSummary: z.string().optional(),
  corporateStructure: z.string().optional(),
  financialHealth: z.string().optional(),
  litigationRisks: z.string().optional(),
  marketPosition: z.string().optional(),
  version: z.number().int().positive(),
});

export const entityWriteSchema = z.object({
  legalName: z.string().trim().min(1),
  taxId: z.string().trim().min(1),
  sector: z.string().trim().min(1),
  countryCode: z.string().length(2),
  roles: z.array(entityRoleSchema).min(1),
  contactEmail: z.string().email(),
  kybStatus: kybStatusSchema,
  regulatoryClearanceRequired: z.boolean(),
  primaryAdvisorId: idSchema.nullable(),
});

export const entityUpdateSchema = entityWriteSchema.partial().extend({
  version: z.number().int().positive(),
});
