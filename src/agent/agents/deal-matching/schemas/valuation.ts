import { z } from "zod";

export const valuationSchema = z.object({
  dealId: z.string().describe("Unique identifier of the deal."),
  targetCompany: z.string().describe("Name of the analyzed target company."),
  ebitda: z.number().describe(
    "Reference EBITDA for valuation in millions of reais (BRL).",
  ),
  revenue: z.number().describe("Reference net revenue in millions of reais."),
  suggestedMultiple: z.number().describe(
    "Suggested or practiced EV/EBITDA multiple for the sector in Brazil.",
  ),
  ev: z.number().describe(
    "Resulting estimated Enterprise Value in millions of reais.",
  ),
  netDebt: z.number().describe(
    "Current net debt (Total debt - Cash and equivalents) in millions of reais.",
  ),
  equityValue: z.number().describe(
    "Resulting Equity Value (EV - Net Debt) in millions of reais.",
  ),
  valuationMethod: z.enum(["DCF", "Multiples", "LBO", "Asset-Based"]).describe(
    "Primary valuation method adopted.",
  ),
  discountRate: z.number().describe(
    "Discount rate or WACC used in modeling (e.g., 0.12 for 12%).",
  ),
  perpetualGrowthRate: z.number().describe(
    "Perpetuity growth rate (g) adopted (e.g., 0.03 for 3%).",
  ),
  valuationRange: z.object({
    min: z.number().describe(
      "Minimum estimated value of the valuation range in millions of reais.",
    ),
    max: z.number().describe(
      "Maximum estimated value of the valuation range in millions of reais.",
    ),
  }).describe("Acceptable valuation range to mitigate negotiation fatigue."),
  illiquidityDiscount: z.number().describe(
    "Illiquidity discount applied to the deal (e.g., 0.20 for 20%).",
  ),
  controlPremium: z.number().describe(
    "Control premium added to the deal (e.g., 0.15 for 15%).",
  ),
  notes: z.string().optional().describe(
    "Observations on assumptions and EBITDA normalizations (QoE).",
  ),
});
