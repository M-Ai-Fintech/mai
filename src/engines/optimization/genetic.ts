import { z } from "zod";
import { selectTermSheetAlternatives } from "./alternatives.ts";

export const TermSheetAlternativeSchema = z.object({
  valuation: z.number(),
  cashPercentage: z.number(),
  equityPercentage: z.number(),
  earnOutPercentage: z.number(),
  escrowPercentage: z.number(),
  fitness: z.number(),
});

export type TermSheetAlternative = z.infer<typeof TermSheetAlternativeSchema>;

export const DealProfileSchema = z.object({
  valuationMin: z.number(),
  valuationMax: z.number(),
  preferences: z.object({
    cash: z.number(),
    equity: z.number(),
    earnOut: z.number(),
    escrow: z.number(),
  }),
});

export type DealProfile = z.infer<typeof DealProfileSchema>;

export interface Chromosome {
  valuation: number;
  cash: number;
  equity: number;
  earnOut: number;
  escrow: number;
  fitness?: number;
}

export interface GeneticConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  tournamentSize: number;
}

export const DEFAULT_CONFIG: GeneticConfig = {
  populationSize: 100,
  generations: 10,
  mutationRate: 0.1,
  tournamentSize: 3,
};

export function gaussianRandom(mean = 0, stdev = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export function normalizePercentages(c: Chromosome): void {
  c.cash = Math.max(0, c.cash);
  c.equity = Math.max(0, c.equity);
  c.earnOut = Math.max(0, c.earnOut);
  c.escrow = Math.max(0, c.escrow);

  const sum = c.cash + c.equity + c.earnOut + c.escrow;
  if (sum === 0) {
    c.cash = 1;
    c.equity = 0;
    c.earnOut = 0;
    c.escrow = 0;
  } else {
    c.cash /= sum;
    c.equity /= sum;
    c.earnOut /= sum;
    c.escrow /= sum;
  }
}

export function initialPopulation(
  size: number,
  profile: DealProfile,
): Chromosome[] {
  const pop: Chromosome[] = [];
  for (let i = 0; i < size; i++) {
    const valuation = profile.valuationMin +
      Math.random() * (profile.valuationMax - profile.valuationMin);
    const c: Chromosome = {
      valuation,
      cash: Math.random(),
      equity: Math.random(),
      earnOut: Math.random(),
      escrow: Math.random(),
    };
    normalizePercentages(c);
    pop.push(c);
  }
  return pop;
}

export function evaluate(chromosome: Chromosome, profile: DealProfile): void {
  chromosome.fitness = 1000 -
    valuationPenalty(chromosome.valuation, profile) -
    preferencePenalty(chromosome, profile);
}

function valuationPenalty(valuation: number, profile: DealProfile): number {
  if (valuation < profile.valuationMin) {
    return (profile.valuationMin - valuation) * 10;
  }
  if (valuation > profile.valuationMax) {
    return (valuation - profile.valuationMax) * 10;
  }
  return 0;
}

function preferencePenalty(
  chromosome: Chromosome,
  profile: DealProfile,
): number {
  return (
    Math.abs(chromosome.cash - profile.preferences.cash) +
    Math.abs(chromosome.equity - profile.preferences.equity) +
    Math.abs(chromosome.earnOut - profile.preferences.earnOut) +
    Math.abs(chromosome.escrow - profile.preferences.escrow)
  ) * 100;
}

export function select(
  population: Chromosome[],
  tournamentSize: number,
): Chromosome {
  let best = population[Math.floor(Math.random() * population.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const contender = population[Math.floor(Math.random() * population.length)];
    if ((contender.fitness || 0) > (best.fitness || 0)) {
      best = contender;
    }
  }
  return best;
}

export function crossover(
  parentA: Chromosome,
  parentB: Chromosome,
): Chromosome {
  const alpha = Math.random();
  const child: Chromosome = {
    valuation: parentA.valuation * alpha + parentB.valuation * (1 - alpha),
    cash: parentA.cash * alpha + parentB.cash * (1 - alpha),
    equity: parentA.equity * alpha + parentB.equity * (1 - alpha),
    earnOut: parentA.earnOut * alpha + parentB.earnOut * (1 - alpha),
    escrow: parentA.escrow * alpha + parentB.escrow * (1 - alpha),
  };
  normalizePercentages(child);
  return child;
}

export function mutate(
  chromosome: Chromosome,
  profile: DealProfile,
  rate: number,
): void {
  const valRange = Math.max(1, profile.valuationMax - profile.valuationMin);
  if (Math.random() < rate) {
    chromosome.valuation += gaussianRandom(0, valRange * 0.1);
  }
  if (Math.random() < rate) chromosome.cash += gaussianRandom(0, 0.1);
  if (Math.random() < rate) chromosome.equity += gaussianRandom(0, 0.1);
  if (Math.random() < rate) chromosome.earnOut += gaussianRandom(0, 0.1);
  if (Math.random() < rate) chromosome.escrow += gaussianRandom(0, 0.1);

  normalizePercentages(chromosome);
}

export function evolve(
  population: Chromosome[],
  profile: DealProfile,
  config: GeneticConfig,
): Chromosome[] {
  let currentPop = population;

  for (const c of currentPop) evaluate(c, profile);
  for (let g = 0; g < config.generations; g++) {
    currentPop = evolveGeneration(currentPop, profile, config);
  }
  currentPop.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
  return currentPop;
}

function evolveGeneration(
  population: Chromosome[],
  profile: DealProfile,
  config: GeneticConfig,
): Chromosome[] {
  population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
  const next = [{ ...population[0] }];
  while (next.length < config.populationSize) {
    next.push(breedGenerationChild(population, profile, config));
  }
  return next;
}

function breedGenerationChild(
  population: Chromosome[],
  profile: DealProfile,
  config: GeneticConfig,
): Chromosome {
  const parentA = select(population, config.tournamentSize);
  const parentB = select(population, config.tournamentSize);
  const child = crossover(parentA, parentB);
  mutate(child, profile, config.mutationRate);
  evaluate(child, profile);
  return child;
}

export function optimizeDeal(
  profile: DealProfile,
  config: Partial<GeneticConfig> = {},
): TermSheetAlternative[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const initialPop = initialPopulation(finalConfig.populationSize, profile);
  const finalPop = evolve(initialPop, profile, finalConfig);
  return selectTermSheetAlternatives(finalPop);
}
