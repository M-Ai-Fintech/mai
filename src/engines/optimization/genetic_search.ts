// src/engines/optimization/genetic_search.ts

export interface TermSheetProposal {
  cashPercentage: number;
  buyerEquityShare: number;
  earnOutTargetYears: number;
  nonCompeteMonths: number;
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
  public static calculateBuyerUtility(proposal: TermSheetProposal): number {
    const cashFactor = 1 - proposal.cashPercentage;
    const equityFactor = proposal.buyerEquityShare;
    const nonCompeteFactor = proposal.nonCompeteMonths / 60;
    const earnOutFactor = proposal.earnOutTargetYears / 5;
    return 0.35 * equityFactor + 0.25 * cashFactor + 0.20 * nonCompeteFactor + 0.20 * earnOutFactor;
  }

  public static calculateSellerUtility(proposal: TermSheetProposal): number {
    const cashFactor = proposal.cashPercentage;
    const equityFactor = 1 - proposal.buyerEquityShare;
    const nonCompeteFactor = 1 - (proposal.nonCompeteMonths / 60);
    const earnOutFactor = 1 - (proposal.earnOutTargetYears / 5);
    return 0.40 * cashFactor + 0.30 * equityFactor + 0.15 * nonCompeteFactor + 0.15 * earnOutFactor;
  }

  public static evaluateFitness(
    proposal: TermSheetProposal,
    minBuyerUtil: number,
    minSellerUtil: number
  ): number {
    const buyerUtil = this.calculateBuyerUtility(proposal);
    const sellerUtil = this.calculateSellerUtility(proposal);
    if (buyerUtil < minBuyerUtil || sellerUtil < minSellerUtil) {
      return 0;
    }
    return (buyerUtil - minBuyerUtil) * (sellerUtil - minSellerUtil);
  }

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
    let population: TermSheetProposal[] = [];
    for (let i = 0; i < config.populationSize; i++) {
      population.push(this.generateRandomProposal());
    }

    let bestProposal = population[0];
    let maxFitness = -1;

    for (let g = 0; g < config.generations; g++) {
      const fitnessScores = population.map(p => 
        this.evaluateFitness(p, config.minBuyerReservationUtility, config.minSellerReservationUtility)
      );

      for (let i = 0; i < population.length; i++) {
        if (fitnessScores[i] > maxFitness) {
          maxFitness = fitnessScores[i];
          bestProposal = { ...population[i] };
        }
      }

      const sumFitness = fitnessScores.reduce((a, b) => a + b, 0);
      const nextGen: TermSheetProposal[] = [];

      const sortedIndices = fitnessScores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score);
      
      for (let i = 0; i < Math.max(1, Math.floor(config.populationSize * 0.05)); i++) {
        nextGen.push({ ...population[sortedIndices[i].index] });
      }

      while (nextGen.length < config.populationSize) {
        const parentA = this.selectParent(population, fitnessScores, sumFitness);
        const parentB = this.selectParent(population, fitnessScores, sumFitness);

        let offspring = { ...parentA };
        if (Math.random() < config.crossoverRate) {
          offspring = this.crossover(parentA, parentB);
        }
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
      buyerEquityShare: 0.5 + Math.random() * 0.5,
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
    return {
      cashPercentage: Math.random() < 0.5 ? p1.cashPercentage : p2.cashPercentage,
      buyerEquityShare: (p1.buyerEquityShare + p2.buyerEquityShare) / 2,
      earnOutTargetYears: Math.random() < 0.5 ? p1.earnOutTargetYears : p2.earnOutTargetYears,
      nonCompeteMonths: Math.random() < 0.5 ? p1.nonCompeteMonths : p2.nonCompeteMonths,
    };
  }

  private static mutate(p: TermSheetProposal): TermSheetProposal {
    const mutated = { ...p };
    const param = Math.floor(Math.random() * 4);
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
