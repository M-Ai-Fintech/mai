import {
  evaluateLegacyTermSheet,
  optimizeLegacyTermSheet,
} from "../negotiation/term_sheet_compatibility.ts";
import type {
  TermSheetOptimizerParams,
  TermSheetOptimizerResult,
  TermSheetProposal,
} from "../types.ts";

/**
 * Legacy term-sheet facade retained until MAI-129 physically retires it.
 *
 * @example await TermSheetOptimizer.run({ populationSize: 20, generations: 10, mutationRate: 0.1, crossoverRate: 0.8, minBuyerReservationUtility: 0.2, minSellerReservationUtility: 0.2 })
 */
export class TermSheetOptimizer {
  public static run(
    params: TermSheetOptimizerParams,
  ): Promise<TermSheetOptimizerResult> {
    return Promise.resolve(optimizeLegacyTermSheet(params));
  }

  public static evaluate(
    solution: TermSheetProposal,
    preference: NonNullable<TermSheetOptimizerParams["preference"]> =
      "balanced",
  ): { buyerUtility: number; sellerUtility: number } {
    return evaluateLegacyTermSheet(solution, preference);
  }
}
