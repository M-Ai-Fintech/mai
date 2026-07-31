import { z } from "zod";
import { termSheetFinancialSchema } from "../../../../shared/schemas/term-sheet.ts";

export const negotiationProposalSchema = termSheetFinancialSchema.extend({
  dealId: z.string().describe("Unique identification of the transaction."),
  escrowPercentage: z.number().min(0).max(0.5).describe(
    "Percentage of the purchase price retained in an Escrow account.",
  ),
  statutoryLimitationsMatching: z.boolean().describe(
    "If the Escrow release deadlines coincide with the Brazilian tax/labor statute of limitations.",
  ),
  arbitrationChamber: z.enum([
    "CAM-CCBC",
    "CAM-B3",
    "CCI",
    "FGV",
    "Judicial-Court",
    "Other",
  ]).describe("Elected arbitration chamber (e.g., CAM-CCBC, B3, CCI)."),
  buyerUtility: z.number().describe(
    "Calculated utility for the buyer under the negotiation model.",
  ),
  sellerUtility: z.number().describe(
    "Calculated utility for the seller under the negotiation model.",
  ),
  redFlags: z.array(z.string()).describe(
    "Structural alerts or contractual risks highlighted in the Term Sheet.",
  ),
});

export type NegotiationProposal = z.infer<typeof negotiationProposalSchema>;
