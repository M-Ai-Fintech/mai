import { z } from "zod";

export const spaSchema = z.object({
  dealId: z.string().describe("Unique identifier of the deal."),
  contractType: z.enum(["SPA", "QPA", "Trespasse"]).describe(
    "Type of definitive closing contract (Share/Quota Purchase Agreement or Transfer).",
  ),
  purchasePriceAdjustmentType: z.enum(["Locked-Box", "Closing-Accounts"])
    .describe(
      "Price adjustment mechanism (Fixed Price / Locked-Box or Post-closing Reconciliation).",
    ),
  repsAndWarrantiesCap: z.number().describe(
    "Maximum compensation limit (Cap) of R&Ws in millions.",
  ),
  basketThreshold: z.number().describe(
    "Minimum cumulative limit (Basket) to start compensation claims in millions.",
  ),
  deMinimisThreshold: z.number().describe(
    "Individual minimum value (De Minimis) to consider a compensation claim in millions.",
  ),
  escrowRetentionAmount: z.number().describe(
    "Amount retained in Escrow account or Linked Notarial Account in millions.",
  ),
  survivalPeriodsMonths: z.object({
    generalCivil: z.number().describe(
      "Survival period for general civil claims (in months).",
    ),
    laborClaims: z.number().describe(
      "Survival period for labor liabilities (in months).",
    ),
    taxLiabilities: z.number().describe(
      "Survival period for tax contingencies (in months).",
    ),
  }).describe("Specific survival periods by type of contingency."),
  disputeResolutionMethod: z.enum([
    "CAM-CCBC",
    "CAM-B3",
    "CCI",
    "Judicial-Court",
  ]).describe("Elected dispute resolution mechanism."),
  closingConditionsPrecedent: z.array(z.string()).describe(
    "List of essential final precedent conditions for closing.",
  ),
});
