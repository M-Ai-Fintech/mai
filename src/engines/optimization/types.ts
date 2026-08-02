import { z } from "zod";

export const TermSheetOptimizerParamsSchema = z.object({
  minBuyerReservationUtility: z.number().min(0).max(1),
  minSellerReservationUtility: z.number().min(0).max(1),
  populationSize: z.number().int().positive(),
  generations: z.number().int().positive(),
  mutationRate: z.number().min(0).max(1),
  crossoverRate: z.number().min(0).max(1),
  preference: z.enum(["liquidity", "balanced", "retention"]).optional(),
  seed: z.number().int().min(0).max(4294967295).optional(),
});
export type TermSheetOptimizerParams = z.infer<
  typeof TermSheetOptimizerParamsSchema
>;

export const TermSheetProposalSchema = z.object({
  cashPercentage: z.number(),
  buyerEquityShare: z.number(),
  earnOutTargetYears: z.number(),
  nonCompeteMonths: z.number(),
});
export type TermSheetProposal = z.infer<typeof TermSheetProposalSchema>;

export const TermSheetOptimizerResultSchema = z.object({
  bestProposal: TermSheetProposalSchema,
  buyerUtility: z.number(),
  sellerUtility: z.number(),
  fitness: z.number(),
});
export type TermSheetOptimizerResult = z.infer<
  typeof TermSheetOptimizerResultSchema
>;

export const TargetRawInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  synergyValue: z.number(),
  acquisitionCost: z.number(),
  ebitda: z.number(),
  revenue: z.number(),
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  operatingCashFlow: z.number(),
  historicalVolatility: z.number(),
  businessSector: z.string(),
  taxDebtsAmount: z.number().optional().default(0),
});
export type TargetRawInput = z.infer<typeof TargetRawInputSchema>;

export const PortfolioCriteriaSchema = z.object({
  budgetLimit: z.number().positive(),
  riskToleranceLimit: z.number().min(0).max(1),
  taxDebtCap: z.number().nonnegative(),
  sectorAllocationCaps: z.record(z.string(), z.number().nonnegative())
    .optional(),
  mutualExclusions: z.array(z.array(z.string())).optional(),
});
export type PortfolioCriteria = z.infer<typeof PortfolioCriteriaSchema>;

export const PortfolioResultSchema = z.object({
  optimization: z.object({
    status: z.string(),
    selectedTargetIds: z.array(z.string()),
  }),
  totalSynergy: z.number(),
  totalCost: z.number(),
  evaluatedProfiles: z.record(
    z.string(),
    z.object({
      metrics: z.object({
        insolvencyRisk: z.number(),
      }),
    }),
  ),
});
export type PortfolioResult = z.infer<typeof PortfolioResultSchema>;
