import { z } from "zod";

export const companyCultureProfileSchema = z.object({
  negotiatorStyle: z.string().optional().describe(
    "Psychological profile or negotiation style of key contacts.",
  ),
  founderDependency: z.string().optional().describe(
    "Level of business dependency on founding team.",
  ),
  workplaceDynamic: z.string().optional().describe(
    "Workplace culture, employee turnover, union friction.",
  ),
  governanceMaturity: z.string().optional().describe(
    "Compliance, formal processes, decision-making structure.",
  ),
  keyPersonRiskScore: z.number().min(0).max(10).optional().describe(
    "Key person risk score from 0 to 10.",
  ),
  redFlags: z.array(z.string()).default([]).describe(
    "Cultural or governance red flags.",
  ),
});

export type CompanyCultureProfile = z.infer<typeof companyCultureProfileSchema>;

export const targetDossierDraftSchema = z.object({
  dealId: z.string().describe("Identifier of the associated deal."),
  targetIdentity: z.object({
    companyName: z.string(),
    cnpj: z.string(),
    registrationStatus: z.string().optional(),
    taxDebtAmount: z.number().optional(),
  }).describe("Target identity reference."),
  documentReferences: z.array(z.object({
    documentId: z.string(),
    fileName: z.string(),
    category: z.string().optional(),
    tag: z.string().optional(),
  })).default([]).describe("VDR or external document references."),
  businessKnowledge: z.array(z.object({
    category: z.string(),
    fact: z.string(),
    source: z.string().optional(),
  })).default([]).describe("Aggregated domain/business knowledge entries."),
  cultureProfile: companyCultureProfileSchema.describe(
    "Company culture profile sub-object.",
  ),
  completeness: z.object({
    isIncomplete: z.boolean().describe(
      "True if missing critical sources or documents.",
    ),
    missingSources: z.array(z.string()).default([]).describe(
      "List of missing documents, categories, or registries.",
    ),
    completionRatio: z.number().min(0).max(1).describe(
      "Ratio of required data present (0 to 1).",
    ),
  }).describe("Completeness or missing-information indicators."),
  provenance: z.array(z.object({
    field: z.string(),
    source: z.string(),
    timestamp: z.string(),
    confidence: z.number().min(0).max(1).optional(),
  })).default([]).describe(
    "Provenance or source-reference fields to avoid unsupported factual claims.",
  ),
  proposalStatus: z.object({
    isProposed: z.literal(true).default(true),
    isApproved: z.literal(false).default(false),
    isAuthoritative: z.literal(false).default(false),
    notice: z.string().default(
      "Proposed partial dossier. Not authoritative until accepted through application services.",
    ),
  }).default({
    isProposed: true,
    isApproved: false,
    isAuthoritative: false,
    notice:
      "Proposed partial dossier. Not authoritative until accepted through application services.",
  }),
});

export type TargetDossierDraft = z.infer<typeof targetDossierDraftSchema>;
