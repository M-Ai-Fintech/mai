import { z } from "zod";

export const kybreportSchema = z.object({
  companyName: z.string().describe("Corporate name of the searched company."),
  cnpj: z.string().describe("CNPJ of the searched company."),
  registrationStatus: z.string().describe(
    "Registration status with the Federal Revenue (e.g., ACTIVE).",
  ),
  hasCeisSanction: z.boolean().describe(
    "If it has any active sanction in CEIS.",
  ),
  hasCnepSanction: z.boolean().describe(
    "If it has any active sanction in CNEP.",
  ),
  taxDebtAmount: z.number().describe(
    "Consolidated value of tax debts in CADIN or PGFN.",
  ),
  keyPersonRiskScore: z.number().min(0).max(10).describe(
    "Founder dependence risk score (0 to 10).",
  ),
  cultureProfile: z.string().describe(
    "Brief description of the mapped corporate culture.",
  ),
  negotiatorFatigueFlag: z.boolean().describe(
    "Indicator of wear or negotiation fatigue detected.",
  ),
  redFlags: z.array(z.string()).describe(
    "List of registration alerts or relevant risks found.",
  ),
});
