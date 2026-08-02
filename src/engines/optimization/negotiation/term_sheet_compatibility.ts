import {
  COMPATIBILITY_POLICY_VERSION,
  compatibilityMetadata,
} from "./compatibility.ts";
import { evaluateUtilities } from "./utility.ts";
import {
  NEGOTIATION_UTILITY_UNITS,
  negotiationProposalSchema,
} from "./types.ts";
import type {
  NegotiationOptimizerResult,
  NegotiationProposal,
  ProposalBound,
  ProposalBounds,
  UtilityFunction,
  UtilityModel,
} from "./types.ts";
import { optimizeNegotiationProposal } from "./optimizer.ts";
import { TermSheetOptimizerParamsSchema } from "../types.ts";
import type {
  TermSheetOptimizerParams,
  TermSheetOptimizerResult,
  TermSheetProposal,
} from "../types.ts";

const TERM_SHEET_DEFAULT_SEED = 146;

/**
 * Delegates the legacy term-sheet DTO to the typed negotiation optimizer.
 *
 * @example await optimizeLegacyTermSheet({ populationSize: 50, generations: 20, mutationRate: 0.1, crossoverRate: 0.8, minBuyerReservationUtility: 0.2, minSellerReservationUtility: 0.2 })
 */
export function optimizeLegacyTermSheet(
  params: TermSheetOptimizerParams,
): TermSheetOptimizerResult {
  const validated = TermSheetOptimizerParamsSchema.parse(params);
  const bounds = termSheetBounds();
  const utilities = termSheetUtilities(
    validated.preference ?? "balanced",
    validated.minBuyerReservationUtility,
    validated.minSellerReservationUtility,
  );
  const result = optimizeNegotiationProposal({
    bounds,
    utilities,
    seed: validated.seed ?? TERM_SHEET_DEFAULT_SEED,
    config: {
      populationSize: validated.populationSize,
      maxGenerations: validated.generations,
      mutationRate: validated.mutationRate,
      crossoverRate: validated.crossoverRate,
      tournamentSize: Math.min(3, validated.populationSize),
      alternativeCount: Math.min(3, validated.populationSize),
      stagnationGenerations: Math.min(8, validated.generations),
      minimumImprovement: 0.000001,
    },
  });
  if (!result.best) {
    throw new Error(
      `Negotiation compatibility adapter returned infeasible; expected a feasible term-sheet proposal. Violations: ${
        result.violations.map((violation) => violation.message).join(" | ")
      }.`,
    );
  }
  return termSheetResult(result.best, validated);
}

export function evaluateLegacyTermSheet(
  solution: TermSheetProposal,
  preference: NonNullable<TermSheetOptimizerParams["preference"]> = "balanced",
): { buyerUtility: number; sellerUtility: number } {
  const proposal = legacyTermSheetProposal(solution);
  const utilities = termSheetUtilities(preference, 0, 0);
  const evaluation = evaluateUtilities(proposal, termSheetBounds(), utilities);
  return {
    buyerUtility: round(evaluation.buyer.total, 3),
    sellerUtility: round(evaluation.seller.total, 3),
  };
}

function termSheetBounds(): ProposalBounds {
  return {
    valuation: bound("term-sheet-valuation", 0, 0, "valuation-amount"),
    cashPercentage: bound("term-sheet-cash", 0.1, 1, "fraction"),
    equityPercentage: bound("term-sheet-equity", 0.1, 1, "fraction"),
    earnOutPercentage: bound("term-sheet-earn-out", 0, 1, "fraction"),
    escrowPercentage: bound("term-sheet-escrow", 0, 1, "fraction"),
    earnOutTargetYears: bound("term-sheet-earn-out-years", 1, 5, "years"),
    nonCompeteMonths: bound("term-sheet-non-compete", 12, 60, "months"),
  };
}

function termSheetUtilities(
  preference: NonNullable<TermSheetOptimizerParams["preference"]>,
  buyerReservation: number,
  sellerReservation: number,
): UtilityModel {
  const weights = termWeights(preference);
  return {
    buyer: termUtility("buyer", weights.buyer),
    seller: termUtility("seller", weights.seller),
    reservation: {
      buyer: reservation("buyer", buyerReservation),
      seller: reservation("seller", sellerReservation),
    },
  };
}

function termWeights(
  preference: NonNullable<TermSheetOptimizerParams["preference"]>,
): { buyer: number[]; seller: number[] } {
  if (preference === "liquidity") {
    return { buyer: [0.5, 0.3, 0.1, 0.1], seller: [0.7, 0.1, 0.1, 0.1] };
  }
  if (preference === "retention") {
    return { buyer: [0.2, 0.2, 0.3, 0.3], seller: [0.2, 0.3, 0.25, 0.25] };
  }
  return { buyer: [0.35, 0.35, 0.15, 0.15], seller: [0.4, 0.3, 0.15, 0.15] };
}

function termUtility(
  side: "buyer" | "seller",
  values: number[],
): UtilityFunction {
  return {
    id: `legacy-term-sheet-${side}`,
    version: COMPATIBILITY_POLICY_VERSION,
    units: NEGOTIATION_UTILITY_UNITS,
    weights: {
      valuation: 0,
      cashPercentage: values[0],
      equityPercentage: values[1],
      earnOutPercentage: 0,
      escrowPercentage: 0,
      earnOutTargetYears: values[2],
      nonCompeteMonths: values[3],
    },
    directions: {
      valuation: side === "buyer" ? "lower" : "higher",
      cashPercentage: side === "buyer" ? "lower" : "higher",
      equityPercentage: side === "buyer" ? "higher" : "lower",
      earnOutPercentage: side === "buyer" ? "higher" : "lower",
      escrowPercentage: side === "buyer" ? "higher" : "lower",
      earnOutTargetYears: side === "buyer" ? "higher" : "lower",
      nonCompeteMonths: side === "buyer" ? "higher" : "lower",
    },
  };
}

function reservation(
  side: "buyer" | "seller",
  minimum: number,
): UtilityModel["reservation"]["buyer"] {
  return {
    minimum,
    metadata: compatibilityMetadata(
      NEGOTIATION_UTILITY_UNITS,
      `${side} term-sheet reservation`,
    ),
  };
}

function termSheetResult(
  best: NonNullable<NegotiationOptimizerResult["best"]>,
  params: TermSheetOptimizerParams,
): TermSheetOptimizerResult {
  const buyerUtility = round(best.buyerUtility.total, 3);
  const sellerUtility = round(best.sellerUtility.total, 3);
  return {
    bestProposal: {
      cashPercentage: round(best.proposal.cashPercentage, 2),
      buyerEquityShare: round(best.proposal.equityPercentage, 2),
      earnOutTargetYears: round(best.proposal.earnOutTargetYears, 1),
      nonCompeteMonths: best.proposal.nonCompeteMonths,
    },
    buyerUtility,
    sellerUtility,
    fitness: round(
      Math.max(
        0,
        (buyerUtility - params.minBuyerReservationUtility) *
          (sellerUtility - params.minSellerReservationUtility),
      ),
      4,
    ),
  };
}

function legacyTermSheetProposal(
  solution: TermSheetProposal,
): NegotiationProposal {
  const earnOutPercentage = 1 - solution.cashPercentage -
    solution.buyerEquityShare;
  if (
    !Number.isFinite(earnOutPercentage) || earnOutPercentage < 0 ||
    solution.cashPercentage < 0 || solution.buyerEquityShare < 0
  ) {
    throw new Error(
      `Invalid legacy term-sheet allocation ${solution.cashPercentage}/${solution.buyerEquityShare}; expected non-negative percentages with total at most 1.`,
    );
  }
  return negotiationProposalSchema.parse({
    valuation: 0,
    cashPercentage: solution.cashPercentage,
    equityPercentage: solution.buyerEquityShare,
    earnOutPercentage,
    escrowPercentage: 0,
    earnOutTargetYears: solution.earnOutTargetYears,
    nonCompeteMonths: solution.nonCompeteMonths,
  });
}

function bound(
  id: string,
  minimum: number,
  maximum: number,
  units: string,
): ProposalBound {
  return {
    id,
    minimum,
    maximum,
    metadata: compatibilityMetadata(units, id),
  };
}

function round(value: number, scale: number): number {
  return Number(value.toFixed(scale));
}
