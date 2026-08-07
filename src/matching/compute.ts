import { selectPortfolio } from "../engines/optimization/matching/portfolio_selection.ts";
import {
  MATCHING_CONTRACT_VERSION,
  type MatchingCandidate,
  type PortfolioSelectionCriteria,
  type PortfolioSelectionResult,
} from "../engines/optimization/matching/types.ts";

export const MATCHING_COMPUTE_PORT_VERSION = "matching-compute/v1" as const;

export interface MatchingComputeRequest {
  readonly criteriaVersion: number;
  readonly criteria: PortfolioSelectionCriteria;
  readonly candidates: readonly MatchingCandidate[];
}

export interface MatchingComputeResult {
  readonly portVersion: typeof MATCHING_COMPUTE_PORT_VERSION;
  readonly optimizerContractVersion: typeof MATCHING_CONTRACT_VERSION;
  readonly selection: PortfolioSelectionResult;
}

export interface MatchingComputePort {
  readonly portVersion: typeof MATCHING_COMPUTE_PORT_VERSION;
  compute(input: MatchingComputeRequest): MatchingComputeResult;
}

/** Adapts the pure MAI-19 optimizer without importing matching policy. */
export class LegacyMatchingComputeAdapter implements MatchingComputePort {
  readonly portVersion = MATCHING_COMPUTE_PORT_VERSION;

  compute(input: MatchingComputeRequest): MatchingComputeResult {
    return {
      portVersion: this.portVersion,
      optimizerContractVersion: MATCHING_CONTRACT_VERSION,
      selection: selectPortfolio({
        candidates: input.candidates,
        criteria: input.criteria,
      }),
    };
  }
}
