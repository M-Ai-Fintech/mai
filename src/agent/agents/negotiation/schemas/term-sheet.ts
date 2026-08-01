import { z } from "zod";
import { disputeResolutionMechanismSchema } from "../../../../shared/schemas/dispute-resolution.ts";
import { termSheetFinancialSchema } from "../../../../shared/schemas/term-sheet.ts";

export const negotiationProposalSchema = termSheetFinancialSchema.extend({
  dealId: z.string().describe("Unique identifier of the deal."),
  escrowPercentage: z.number().min(0).max(0.5).describe(
    "Percentage of the purchase price retained in an Escrow account.",
  ),
  statutoryLimitationsMatching: z.boolean().describe(
    "If the Escrow release deadlines coincide with the Brazilian tax/labor statute of limitations.",
  ),
  disputeResolution: disputeResolutionMechanismSchema.describe(
    "Canonical dispute-resolution mechanism proposed for the term sheet.",
  ),
  buyerUtility: z.number().describe(
    "Calculated utility for the buyer under the negotiation model.",
  ),
  sellerUtility: z.number().describe(
    "Calculated utility for the seller under the negotiation model.",
  ),
  redFlags: z.array(z.string()).describe(
    "Structural alerts or contractual risks highlighted in the Term Sheet.",
  ),
}).strict();

export type NegotiationProposal = z.infer<typeof negotiationProposalSchema>;
