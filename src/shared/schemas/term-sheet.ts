import { z } from "zod";

export const termSheetFinancialSchema = z.object({
  cashPercentage: z.number().min(0).max(1).describe(
    "Percentage paid in cash at the closing date.",
  ),
  buyerEquityShare: z.number().min(0).max(1).describe(
    "Percentage of the buyer's equity share in the Target.",
  ),
  earnOutTargetYears: z.number().min(0).max(5).describe(
    "Earn-out validity period in years.",
  ),
  nonCompeteMonths: z.number().min(0).max(60).describe(
    "Non-compete restriction period for founders in months.",
  ),
});

export const termSheetCoreSchema = z.object({
  dealId: z.string().describe("Unique identification of the transaction."),
  buyerName: z.string().describe(
    "Corporate name or name of the buyer (Buy-Side).",
  ).optional(),
  sellerName: z.string().describe(
    "Corporate name or name of the seller (Sell-Side).",
  ).optional(),
  targetName: z.string().describe(
    "Name or brand of the target company of the transaction.",
  ).optional(),
  valuationAmount: z.number().describe(
    "Total value attributed to the company (Enterprise Value) in millions of reais (BRL).",
  ).optional(),
});
