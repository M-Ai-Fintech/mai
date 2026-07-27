/**
 * @module OptimizationEngine
 * @description Main export barrel for the optimization engine modules (valuation and future kyc).
 */

export * from "./valuation/index.ts";
export * from "./genetic.ts";
export * from "./types.ts";
export * from "./constraints.ts";

import { selectTermSheetAlternatives } from "./alternatives.ts";
import {
  Constraint,
  EvaluationContext,
  filterFeasible,
  FinancialData,
  KycData,
} from "./constraints.ts";
import {
  DealProfile,
  DEFAULT_CONFIG,
  evolve,
  GeneticConfig,
  initialPopulation,
  TermSheetAlternative,
} from "./genetic.ts";

export interface OptimizationRequest {
  profile: DealProfile;
  kyc?: KycData;
  financial?: FinancialData;
  constraints?: Constraint[];
  geneticConfig?: Partial<GeneticConfig>;
}

/**
 * Runs the genetic algorithm and applies constraint programming filters before ranking the results.
 * @param request The deal profile, constraint settings, and genetic config
 * @returns Feasible and distinct term sheet alternatives
 */
export function optimizeWithConstraints(
  request: OptimizationRequest,
): TermSheetAlternative[] {
  const { profile, constraints = [], geneticConfig = {} } = request;
  const finalConfig = { ...DEFAULT_CONFIG, ...geneticConfig };
  const initialPop = initialPopulation(finalConfig.populationSize, profile);
  const finalPop = evolve(initialPop, profile, finalConfig);
  const candidates = evaluationContexts(finalPop, request);
  const feasibleCandidates = filterFeasible(candidates, constraints);
  return selectTermSheetAlternatives(
    feasibleCandidates.map((candidate) => candidate.chromosome),
  );
}

function evaluationContexts(
  chromosomes: EvaluationContext["chromosome"][],
  request: OptimizationRequest,
): EvaluationContext[] {
  return chromosomes.map((chromosome) => ({
    chromosome,
    profile: request.profile,
    kyc: request.kyc,
    financial: request.financial,
  }));
}
