import {
  NEGOTIATION_UTILITY_UNITS,
  NegotiationProposal,
  ProposalBound,
  ProposalBounds,
  ProposalDimension,
  UtilityEvaluation,
  UtilityFunction,
  UtilityModel,
  UtilityScore,
} from "./types.ts";

export type BoundNormalizationState =
  | "range"
  | "fixed-match"
  | "fixed-mismatch"
  | "invalid-negative-width";

export interface BoundNormalization {
  value: number;
  state: BoundNormalizationState;
}

const dimensions: ProposalDimension[] = [
  "valuation",
  "cashPercentage",
  "equityPercentage",
  "earnOutPercentage",
  "escrowPercentage",
  "earnOutTargetYears",
  "nonCompeteMonths",
];

export function normalizeDimension(
  value: number,
  bound: ProposalBound,
): BoundNormalization {
  const width = bound.maximum - bound.minimum;
  if (width < 0) {
    return { value: 0, state: "invalid-negative-width" };
  }
  if (width === 0) {
    return {
      value: value === bound.minimum ? 1 : 0,
      state: fixedState(value, bound),
    };
  }
  return {
    value: clamp((value - bound.minimum) / width, 0, 1),
    state: "range",
  };
}

export function evaluateUtilities(
  proposal: NegotiationProposal,
  bounds: ProposalBounds,
  model: UtilityModel,
): UtilityEvaluation {
  return {
    buyer: evaluateSide(proposal, bounds, model.buyer),
    seller: evaluateSide(proposal, bounds, model.seller),
  };
}

function evaluateSide(
  proposal: NegotiationProposal,
  bounds: ProposalBounds,
  utility: UtilityFunction,
): UtilityScore {
  const components = evaluateComponents(proposal, bounds, utility);
  const total = dimensions.reduce(
    (sum, dimension) =>
      sum + components[dimension] * utility.weights[dimension],
    0,
  );
  return {
    total: clamp(total, 0, 1),
    units: NEGOTIATION_UTILITY_UNITS,
    components,
  };
}

function evaluateComponents(
  proposal: NegotiationProposal,
  bounds: ProposalBounds,
  utility: UtilityFunction,
): Record<ProposalDimension, number> {
  return {
    valuation: componentScore("valuation", proposal, bounds, utility),
    cashPercentage: componentScore("cashPercentage", proposal, bounds, utility),
    equityPercentage: componentScore(
      "equityPercentage",
      proposal,
      bounds,
      utility,
    ),
    earnOutPercentage: componentScore(
      "earnOutPercentage",
      proposal,
      bounds,
      utility,
    ),
    escrowPercentage: componentScore(
      "escrowPercentage",
      proposal,
      bounds,
      utility,
    ),
    earnOutTargetYears: componentScore(
      "earnOutTargetYears",
      proposal,
      bounds,
      utility,
    ),
    nonCompeteMonths: componentScore(
      "nonCompeteMonths",
      proposal,
      bounds,
      utility,
    ),
  };
}

function componentScore(
  dimension: ProposalDimension,
  proposal: NegotiationProposal,
  bounds: ProposalBounds,
  utility: UtilityFunction,
): number {
  const normalized =
    normalizeDimension(proposal[dimension], bounds[dimension]).value;
  const target = utility.targets?.[dimension];
  if (target !== undefined) {
    return clamp(1 - Math.abs(normalized - target), 0, 1);
  }
  return utility.directions[dimension] === "higher"
    ? normalized
    : 1 - normalized;
}

function fixedState(
  value: number,
  bound: ProposalBound,
): BoundNormalizationState {
  return value === bound.minimum ? "fixed-match" : "fixed-mismatch";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
