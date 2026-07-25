/**
 * @module OptimizationEngine
 * @description Main export barrel for the optimization engine modules (valuation and future kyc).
 */

export * from "./valuation/index.ts";
export * from "./genetic.ts";
export * from "./types.ts";
export * from "./constraints.ts";

import { DealProfile, initialPopulation, evolve, DEFAULT_CONFIG, GeneticConfig, TermSheetAlternative } from "./genetic.ts";
import { Constraint, KycData, FinancialData, EvaluationContext, filterFeasible } from "./constraints.ts";

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
export function optimizeWithConstraints(request: OptimizationRequest): TermSheetAlternative[] {
  const { profile, kyc, financial, constraints = [], geneticConfig = {} } = request;
  
  const finalConfig = { ...DEFAULT_CONFIG, ...geneticConfig };
  const initialPop = initialPopulation(finalConfig.populationSize, profile);
  const finalPop = evolve(initialPop, profile, finalConfig);
  
  // Form contexts for constraint evaluation
  const candidates: EvaluationContext[] = finalPop.map(c => ({
    chromosome: c,
    profile,
    kyc,
    financial,
  }));
  
  // 4. filterFeasible(candidates, constraints) antes do ranking
  const feasibleCandidates = filterFeasible(candidates, constraints);
  
  const distinct: TermSheetAlternative[] = [];
  for (const { chromosome: c } of feasibleCandidates) {
    if (distinct.length >= 3) break;
    
    let isDistinct = true;
    for (const d of distinct) {
      const diff = 
        Math.abs(c.cash - d.cashPercentage) +
        Math.abs(c.equity - d.equityPercentage) +
        Math.abs(c.earnOut - d.earnOutPercentage) +
        Math.abs(c.escrow - d.escrowPercentage);
      
      if (diff < 0.1) {
        isDistinct = false;
        break;
      }
    }
    
    if (isDistinct) {
      distinct.push({
        valuation: c.valuation,
        cashPercentage: c.cash,
        equityPercentage: c.equity,
        earnOutPercentage: c.earnOut,
        escrowPercentage: c.escrow,
        fitness: c.fitness || 0,
      });
    }
  }

  let idx = 0;
  while (distinct.length < 3 && idx < feasibleCandidates.length) {
    const { chromosome: c } = feasibleCandidates[idx++];
    const included = distinct.some(d => d.cashPercentage === c.cash && d.valuation === c.valuation);
    if (!included) {
      distinct.push({
        valuation: c.valuation,
        cashPercentage: c.cash,
        equityPercentage: c.equity,
        earnOutPercentage: c.earnOut,
        escrowPercentage: c.escrow,
        fitness: c.fitness || 0,
      });
    }
  }

  return distinct;
}
