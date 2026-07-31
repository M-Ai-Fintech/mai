import { z } from "zod";
import { domainAreaSchema } from "../../../../shared/schemas/domain-area.ts";
import { riskSeveritySchema } from "../../../../shared/schemas/risk-severity.ts";

export const riskmatrixSchema = z.object({
  dealId: z.string().describe("Unique identifier of the deal."),
  risks: z.array(
    z.object({
      id: z.string().describe("Identifier of the audited risk."),
      category: domainAreaSchema.describe("Main category of the risk."),
      description: z.string().describe(
        "Literal detail of the found risk or contingent liability.",
      ),
      severity: riskSeveritySchema.describe(
        "Severity of the risk impact.",
      ),
      probability: z.enum(["low", "medium", "high"]).describe(
        "Probability of materialization of the liability.",
      ),
      valuationImpact: z.number().describe(
        "Direct financial impact or suggested reduction in Enterprise Value in millions of reais.",
      ),
      mitigationStrategy: z.string().describe(
        "Suggested strategy or contingency for mitigation (e.g., Escrow, indemnification, renegotiation).",
      ),
      isDealBreaker: z.boolean().describe(
        "Marks if the risk violates the deal's Go/No-Go criteria.",
      ),
    }),
  ).describe(
    "Matrix of unified risks and contingent liabilities identified in the audit.",
  ),
  overallRiskScore: z.number().min(0).max(10).describe(
    "Consolidated overall deal risk score (0 to 10).",
  ),
});
