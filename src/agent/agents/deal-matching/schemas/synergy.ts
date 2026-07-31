import { z } from "zod";

export const synergySchema = z.object({
  dealId: z.string().describe("Unique identifier of the deal."),
  targetCompany: z.string().describe("Name of the target company."),
  standaloneValue: z.number().describe(
    "Standalone value of the target company in millions of reais (BRL).",
  ),
  costSynergies: z.array(z.number()).describe(
    "Projected annual vector of cost synergies in millions of reais.",
  ),
  revenueSynergies: z.array(z.number()).describe(
    "Projected annual vector of revenue synergies in millions of reais.",
  ),
  integrationCosts: z.array(z.number()).describe(
    "Projected annual vector of integration costs in millions of reais.",
  ),
  wacc: z.number().describe(
    "Weighted Average Cost of Capital (WACC) for the discount rate (e.g., 0.12 for 12%).",
  ),
  taxRate: z.number().describe(
    "Applicable corporate tax rate (e.g., 0.34 for 34%).",
  ),
  revenueHaircut: z.number().describe(
    "Risk discount applied to revenue synergies (e.g., 0.40 for 40%).",
  ),
  sharingCoefficient: z.number().describe(
    "Alpha coefficient for sharing synergy with the seller (e.g., 0.30 for 30%).",
  ),
  netSynergyValue: z.number().describe(
    "Net present value of the combined total synergies in millions of reais.",
  ),
  sellerPremium: z.number().describe(
    "Synergy premium to be paid to the seller based on the Alpha coefficient (millions of BRL).",
  ),
  recommendedPurchasePrice: z.number().describe(
    "Recommended total purchase price (Standalone + Seller Premium) in millions of BRL.",
  ),
  isFeasible: z.boolean().describe(
    "Indicates whether the deal is viable considering a positive net synergy value.",
  ),
  comments: z.string().optional().describe(
    "Additional strategic notes and observations on the synergies.",
  ),
});
