import { z } from "zod";
import { domainAreaSchema } from "../../../../shared/schemas/domain-area.ts";

export const contingencySchema = z.object({
  contingencyTitle: z.string().describe("Title of the contingency."),
  category: domainAreaSchema.describe("Domain area of the contingency."),
  severity: z.enum(["low", "medium", "high", "critical"]).describe(
    "Severity level of the contingency.",
  ),
  legalBasis: z.string().describe("Legal basis for the contingency."),
  probabilityOfLoss: z.enum(["Probable", "Possible", "Remote"]).describe(
    "Probability of loss.",
  ),
  estimatedFinancialImpact: z.number().describe(
    "Estimated financial impact in millions.",
  ),
  escrowRetentionRecommended: z.boolean().describe(
    "Whether escrow retention is recommended.",
  ),
  recommendedEscrowAmount: z.number().describe(
    "Recommended escrow retention amount.",
  ),
  redFlags: z.array(z.string()).describe("List of identified red flags."),
});
