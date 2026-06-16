// src/engines/optimization/genetic_search.ts

export interface TermSheetProposal {
  cashPercentage: number;       // 0 to 1 (fraction of deal paid in cash)
  buyerEquityShare: number;     // 0 to 1 (fraction of equity owned by buyer post-deal)
  earnOutTargetYears: number;   // 1 to 5 (years of earn-out milestones)
  nonCompeteMonths: number;     // 12 to 60 (months of non-compete)
}

export interface GeneticOptimizerConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  minBuyerReservationUtility: number;
  minSellerReservationUtility: number;
}

export class TermSheetGeneticOptimizer {
  /**
   * Calculates the Buyer Utility (0 to 1) for a proposal.
   */
  public static calculateBuyerUtility(proposal: TermSheetProposal): number {
    // Buyers prefer:
    // - Less upfront cash payment (more leverage/retention) -> (1 - cashPercentage)
    // - High equity control -> buyerEquityShare
    // - Longer non-compete periods -> nonCompeteMonths / 60
    // - Longer earn-out targets (shifts risk to seller performance) -> earnOutTargetYears / 5
    const cashFactor = 1 - proposal.cashPercentage;
    const equityFactor = proposal.buyerEquityShare;
    const nonCompeteFactor = proposal.nonCompeteMonths / 60;
    const earnOutFactor = proposal.earnOutTargetYears / 5;

    // Weighted sum of factors
    return 0.35 * equityFactor + 0.25 * cashFactor + 0.20 * nonCompeteFactor + 0.20 * earnOutFactor;
  }

  /**
   * Calculates the Seller Utility (0 to 1) for a proposal.
   */
  public static calculateSellerUtility(proposal: TermSheetProposal): number {
    // Sellers prefer:
    // - More upfront cash payment -> cashPercentage
    // - Retaining more equity (lower buyerEquityShare) -> (1 - buyerEquityShare)
    // - Shorter non-compete periods -> 1 - (nonCompeteMonths / 60)
    // - Shorter earn-out targets (earlier payout) -> 1 - (earnOutTargetYears / 5)
    const cashFactor = proposal.cashPercentage;
    const equityFactor = 1 - proposal.buyerEquityShare;
    const nonCompeteFactor = 1 - (proposal.nonCompeteMonths / 60);
    const earnOutFactor = 1 - (proposal.earnOutTargetYears / 5);

    // Weighted sum of factors
    return 0.40 * cashFactor + 0.30 * equityFactor + 0.15 * nonCompeteFactor + 0.15 * earnOutFactor;
  }

  /**
   * Evaluates the fitness of a proposal.
   * Promotes win-win terms and penalizes proposals below either party's reservation utility.
   */
  public static evaluateFitness(
    proposal: TermSheetProposal,
    minBuyerUtil: number,
    minSellerUtil: number
  ): number {
    const buyerUtil = this.calculateBuyerUtility(proposal);
    const sellerUtil = this.calculateSellerUtility(proposal);

    // If either party rejects the deal outright (below reservation utility), fitness is zero
    if (buyerUtil < minBuyerUtil || sellerUtil < minSellerUtil) {
      return 0;
    }

    // Nash bargaining solution: maximize product of utilities (win-win)
    return (buyerUtil - minBuyerUtil) * (sellerUtil - minSellerUtil);
  }

  /**
   * Optimizes the Term Sheet using a Genetic Algorithm.
   */
  public static optimizeTermSheet(
    config: GeneticOptimizerConfig = {
      populationSize: 100,
      generations: 50,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      minBuyerReservationUtility: 0.3,
      minSellerReservationUtility: 0.3,
    }
  ): { bestProposal: TermSheetProposal; fitness: number; buyerUtility: number; sellerUtility: number } {
    
    // 1. Initialize random population
    let population: TermSheetProposal[] = [];
    for (let i = 0; i < config.populationSize; i++) {
      population.push(this.generateRandomProposal());
    }

    let bestProposal = population[0];
    let maxFitness = -1;

    // 2. Evolution Loop
    for (let g = 0; g < config.generations; g++) {
      const fitnessScores = population.map(p => 
        this.evaluateFitness(p, config.minBuyerReservationUtility, config.minSellerReservationUtility)
      );

      // Track the best individual
      for (let i = 0; i < population.length; i++) {
        if (fitnessScores[i] > maxFitness) {
          maxFitness = fitnessScores[i];
          bestProposal = { ...population[i] };
        }
      }

      // Selection: Roulette Wheel Selection
      const sumFitness = fitnessScores.reduce((a, b) => a + b, 0);
      const nextGen: TermSheetProposal[] = [];

      // Keep elite (top 5%)
      const sortedIndices = fitnessScores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score);
      
      for (let i = 0; i < Math.max(1, Math.floor(config.populationSize * 0.05)); i++) {
        nextGen.push({ ...population[sortedIndices[i].index] });
      }

      // Generate rest of population
      while (nextGen.length < config.populationSize) {
        const parentA = this.selectParent(population, fitnessScores, sumFitness);
        const parentB = this.selectParent(population, fitnessScores, sumFitness);

        let offspring = { ...parentA };

        // Crossover
        if (Math.random() < config.crossoverRate) {
          offspring = this.crossover(parentA, parentB);
        }

        // Mutation
        if (Math.random() < config.mutationRate) {
          offspring = this.mutate(offspring);
        }

        nextGen.push(offspring);
      }

      population = nextGen;
    }

    return {
      bestProposal,
      fitness: maxFitness,
      buyerUtility: this.calculateBuyerUtility(bestProposal),
      sellerUtility: this.calculateSellerUtility(bestProposal),
    };
  }

  private static generateRandomProposal(): TermSheetProposal {
    return {
      cashPercentage: Math.random(),
      buyerEquityShare: 0.5 + Math.random() * 0.5, // Buyers usually want control (>= 50%)
      earnOutTargetYears: 1 + Math.random() * 4,
      nonCompeteMonths: 12 + Math.floor(Math.random() * 48),
    };
  }

  private static selectParent(
    pop: TermSheetProposal[],
    scores: number[],
    sumFitness: number
  ): TermSheetProposal {
    if (sumFitness <= 0) {
      // Uniform random selection if all individuals have zero fitness
      return pop[Math.floor(Math.random() * pop.length)];
    }
    
    let rand = Math.random() * sumFitness;
    for (let i = 0; i < pop.length; i++) {
      rand -= scores[i];
      if (rand <= 0) {
        return pop[i];
      }
    }
    return pop[pop.length - 1];
  }

  private static crossover(p1: TermSheetProposal, p2: TermSheetProposal): TermSheetProposal {
    // Single-point or blended crossover
    return {
      cashPercentage: Math.random() < 0.5 ? p1.cashPercentage : p2.cashPercentage,
      buyerEquityShare: (p1.buyerEquityShare + p2.buyerEquityShare) / 2, // Blended
      earnOutTargetYears: Math.random() < 0.5 ? p1.earnOutTargetYears : p2.earnOutTargetYears,
      nonCompeteMonths: Math.random() < 0.5 ? p1.nonCompeteMonths : p2.nonCompeteMonths,
    };
  }

  private static mutate(p: TermSheetProposal): TermSheetProposal {
    const mutated = { ...p };
    const param = Math.floor(Math.random() * 4);
    
    // Add small random gaussian-like noise
    const noise = (Math.random() - 0.5) * 0.2;
    
    if (param === 0) {
      mutated.cashPercentage = Math.min(Math.max(p.cashPercentage + noise, 0), 1);
    } else if (param === 1) {
      mutated.buyerEquityShare = Math.min(Math.max(p.buyerEquityShare + noise, 0.5), 1);
    } else if (param === 2) {
      mutated.earnOutTargetYears = Math.min(Math.max(p.earnOutTargetYears + noise * 4, 1), 5);
    } else {
      mutated.nonCompeteMonths = Math.min(Math.max(p.nonCompeteMonths + Math.floor(noise * 48), 12), 60);
    }
    
    return mutated;
  }
}
