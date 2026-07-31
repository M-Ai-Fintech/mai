import { z } from "zod";
import {
  termSheetCoreSchema,
  termSheetFinancialSchema,
} from "../../../../shared/schemas/term-sheet.ts";
import type { NegotiationProposal } from "../../negotiation/schemas/term-sheet.ts";

// Nesting decision:
// - nesting preserves the boundary between analytical proposal terms and document/legal terms;
// - it avoids field collisions;
// - conversion is explicit;
// - it does not imply approval or release.
export const bindingTermSheetSchema = termSheetCoreSchema.extend({
  proposal: termSheetFinancialSchema.describe(
    "Financial terms of the proposal.",
  ),
  governingLaw: z.string().default("Brazil").describe(
    "Governing law and jurisdiction.",
  ),
  exclusivityPeriodDays: z.number().describe(
    "Number of days for exclusivity period.",
  ),
  confidentialityAgreed: z.boolean().describe(
    "Whether confidentiality is agreed.",
  ),
  bindingClauses: z.array(z.string()).describe("Clauses that are binding."),
});

export type BindingTermSheet = z.infer<typeof bindingTermSheetSchema>;

export interface AssembleBindingTermSheetParams {
  proposal: NegotiationProposal;
  legalTerms: {
    governingLaw?: string;
    exclusivityPeriodDays: number;
    confidentialityAgreed: boolean;
    bindingClauses: string[];
  };
  parties?: {
    buyerName?: string;
    sellerName?: string;
    targetName?: string;
  };
  dealId?: string;
  valuationAmount?: number;
}

/**
 * Pure assembly function that constructs a BindingTermSheet representation
 * from an in-progress NegotiationProposal and legal/document fields.
 *
 * Requirements:
 * - Requires an explicit NegotiationProposal;
 * - Requires explicit legal/document fields;
 * - Preserves all proposal financial values;
 * - Returns a BindingTermSheet-shaped value;
 * - Performs no persistence;
 * - Performs no approval;
 * - Performs no sending or external side effect.
 */
export function assembleBindingTermSheet(
  params: AssembleBindingTermSheetParams,
): BindingTermSheet {
  const proposalFinancial = termSheetFinancialSchema.parse({
    cashPercentage: params.proposal.cashPercentage,
    buyerEquityShare: params.proposal.buyerEquityShare,
    earnOutTargetYears: params.proposal.earnOutTargetYears,
    nonCompeteMonths: params.proposal.nonCompeteMonths,
  });

  const rawCandidate = {
    dealId: params.dealId ?? params.proposal.dealId,
    buyerName: params.parties?.buyerName,
    sellerName: params.parties?.sellerName,
    targetName: params.parties?.targetName,
    valuationAmount: params.valuationAmount,
    proposal: proposalFinancial,
    governingLaw: params.legalTerms.governingLaw ?? "Brazil",
    exclusivityPeriodDays: params.legalTerms.exclusivityPeriodDays,
    confidentialityAgreed: params.legalTerms.confidentialityAgreed,
    bindingClauses: params.legalTerms.bindingClauses,
  };

  return bindingTermSheetSchema.parse(rawCandidate);
}
