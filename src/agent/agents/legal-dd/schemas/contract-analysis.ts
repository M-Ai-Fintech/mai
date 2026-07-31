import { z } from "zod";
import { riskSeveritySchema } from "../../../../shared/schemas/risk-severity.ts";

export const contractanalysisSchema = z.object({
  contractTitle: z.string().describe(
    "Title or identification of the analyzed contract.",
  ),
  counterparty: z.string().describe(
    "Name of the counterparty in the contract.",
  ),
  hasChangeOfControlClause: z.boolean().describe(
    "If there is an explicit change of control clause.",
  ),
  requiresConsentForAssignment: z.boolean().describe(
    "If prior consent is required for contract assignment.",
  ),
  noticePeriodDays: z.number().describe(
    "Minimum notice period for termination without cause (in days).",
  ),
  hasNonCompeteOrExclusivity: z.boolean().describe(
    "If it has an exclusivity or non-compete restriction clause.",
  ),
  arbitrationChamber: z.enum([
    "CAM-CCBC",
    "CAM-B3",
    "CCI",
    "FGV",
    "Judicial-Court",
    "Other",
  ]).describe(
    "Arbitration chamber elected for dispute resolution (e.g., CAM-CCBC, B3).",
  ),
  riskRating: riskSeveritySchema.describe(
    "Classification of the contractual risk level.",
  ),
  recommendations: z.array(z.string()).describe(
    "List of recommendations for renegotiation or regulatory notifications.",
  ),
});
