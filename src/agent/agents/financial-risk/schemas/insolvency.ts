import { z } from "zod";

export const insolvencySchema = z.object({
  insolvencyRiskScore: z.number().min(0).max(1).describe(
    "Calculated probability of financial insolvency (from 0 to 1).",
  ),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).describe(
    "Qualitative classification of the financial risk level.",
  ),
  kanitzTermometroScore: z.number().describe(
    "Numerical result of the Kanitz Thermometer (Z Factor).",
  ),
  elizabetskyScore: z.number().describe(
    "Numerical result of the Elizabetsky Model Insolvency Factor.",
  ),
  altmanZDoublePrimeScore: z.number().describe(
    "Numerical result of the Altman Z-Score adapted for unlisted companies in Brazil.",
  ),
  distressWarning: z.boolean().describe(
    "Indicator of imminent danger of insolvency or need for restructuring/recovery.",
  ),
  mitigations: z.array(z.string()).describe(
    "Recommended actions for debt mitigation and covenant renegotiation.",
  ),
});
