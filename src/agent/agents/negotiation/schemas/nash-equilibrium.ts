import { z } from "zod";

export const nashequilibriumSchema = z.object({
  dealId: z.string().describe("Unique identifier of the deal/transaction."),
  buyerReservationUtility: z.number().describe(
    "Minimum acceptable reservation utility for the buyer (e.g., 0.3).",
  ),
  sellerReservationUtility: z.number().describe(
    "Minimum acceptable reservation utility for the seller (e.g., 0.3).",
  ),
  payoffMatrix: z.array(
    z.object({
      round: z.number().describe("Number of the negotiation round."),
      proposal: z.object({
        cashPercentage: z.number().describe(
          "Percentage paid in cash at closing (e.g., 0.6 for 60%).",
        ),
        buyerEquityShare: z.number().describe(
          "Percentage of equity share transferred (e.g., 0.2 for 20%).",
        ),
        earnOutTargetYears: z.number().describe(
          "Earn-out target period in years (e.g., 3.0 years).",
        ),
        nonCompeteMonths: z.number().describe(
          "Non-compete clause term in months (e.g., 60 months).",
        ),
      }).describe("Transaction structure proposal evaluated in this round."),
      buyerUtility: z.number().describe(
        "Calculated utility for the buyer (0.0 to 1.0).",
      ),
      sellerUtility: z.number().describe(
        "Calculated utility for the seller (0.0 to 1.0).",
      ),
      fitness: z.number().describe(
        "Nash fitness for bilateral optimization (U_B - min)*(U_S - min) or 0 if unviable.",
      ),
    }),
  ).describe(
    "Historical and iterative matrix of negotiation rounds and calculated utilities.",
  ),
  nashEquilibriumAchieved: z.boolean().describe(
    "Informs if a viable and acceptable equilibrium point by both parties has been reached.",
  ),
  optimalProposal: z.object({
    cashPercentage: z.number().describe(
      "Cash percentage of the best proposal found.",
    ),
    buyerEquityShare: z.number().describe(
      "Equity share of the best proposal found.",
    ),
    earnOutTargetYears: z.number().describe(
      "Earn-out target in years of the best proposal found.",
    ),
    nonCompeteMonths: z.number().describe(
      "Non-compete term in months of the best proposal found.",
    ),
  }).describe(
    "The optimal Term Sheet proposal that maximizes the Nash product of utilities.",
  ),
  comments: z.string().optional().describe(
    "Justification and analytical notes on the convergence of the equilibrium.",
  ),
});
