import { z } from "zod";
import {
  NEGOTIATION_UTILITY_UNITS,
  optimizeNegotiationProposal,
  ProposalBound,
  ProposalBounds,
  UtilityModel,
} from "./negotiation/index.ts";

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
  crossoverRate?: number;
  seed?: number;
  alternativeCount?: number;
  stagnationGenerations?: number;
  minimumImprovement?: number;
}

export const DEFAULT_CONFIG: GeneticConfig = {
  populationSize: 100,
  generations: 10,
  mutationRate: 0.1,
  tournamentSize: 3,
  crossoverRate: 0.8,
  seed: 0,
  alternativeCount: 3,
  stagnationGenerations: 8,
  minimumImprovement: 0.000001,
};

// Legacy chromosome helpers remain for migration compatibility. New proposal
// optimization enters through the seeded negotiation-owned adapter below.

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
  const result = optimizeNegotiationProposal({
    bounds: legacyBounds(profile),
    utilities: legacyUtilities(profile),
    seed: finalConfig.seed ?? 0,
    config: {
      populationSize: finalConfig.populationSize,
      maxGenerations: finalConfig.generations,
      mutationRate: finalConfig.mutationRate,
      crossoverRate: finalConfig.crossoverRate ?? 0.8,
      tournamentSize: finalConfig.tournamentSize,
      alternativeCount: finalConfig.alternativeCount ?? 3,
      stagnationGenerations: finalConfig.stagnationGenerations ?? 8,
      minimumImprovement: finalConfig.minimumImprovement ?? 0.000001,
    },
  });
  return result.alternatives.map(toLegacyAlternative);
}

function legacyBounds(profile: DealProfile): ProposalBounds {
  return {
    valuation: legacyBound(
      "valuation",
      profile.valuationMin,
      profile.valuationMax,
      "valuation-amount",
    ),
    cashPercentage: legacyBound("cash", 0, 1, "fraction"),
    equityPercentage: legacyBound("equity", 0, 1, "fraction"),
    earnOutPercentage: legacyBound("earn-out", 0, 1, "fraction"),
    escrowPercentage: legacyBound("escrow", 0, 1, "fraction"),
    earnOutTargetYears: legacyBound("earn-out-years", 1, 5, "years"),
    nonCompeteMonths: legacyBound("non-compete-months", 12, 60, "months"),
  };
}

function legacyBound(
  id: string,
  minimum: number,
  maximum: number,
  units: string,
): ProposalBound {
  return {
    id,
    minimum,
    maximum,
    metadata: {
      source: "legacy genetic compatibility contract",
      policyVersion: "MAI-146-compatibility-v1",
      units,
      effectiveDate: "2026-08-01",
      evidenceVersion: "genetic-legacy-v1",
      enforcement: "mandatory",
      percentageRepresentation: units === "fraction" ? "fraction" : undefined,
    },
  };
}

function legacyUtilities(profile: DealProfile): UtilityModel {
  const weights = {
    valuation: 0.2,
    cashPercentage: 0.2,
    equityPercentage: 0.2,
    earnOutPercentage: 0.1,
    escrowPercentage: 0.1,
    earnOutTargetYears: 0.1,
    nonCompeteMonths: 0.1,
  };
  const targets = {
    cashPercentage: profile.preferences.cash,
    equityPercentage: profile.preferences.equity,
    earnOutPercentage: profile.preferences.earnOut,
    escrowPercentage: profile.preferences.escrow,
  };
  return {
    buyer: legacyUtility("buyer", "lower", weights, targets),
    seller: legacyUtility("seller", "higher", weights, targets),
    reservation: {
      buyer: legacyReservation("buyer"),
      seller: legacyReservation("seller"),
    },
  };
}

function legacyUtility(
  id: string,
  valuationDirection: "higher" | "lower",
  weights: UtilityModel["buyer"]["weights"],
  targets: UtilityModel["buyer"]["targets"],
): UtilityModel["buyer"] {
  return {
    id: `legacy-${id}`,
    version: "MAI-146-compatibility-v1",
    units: NEGOTIATION_UTILITY_UNITS,
    weights,
    directions: {
      valuation: valuationDirection,
      cashPercentage: "higher",
      equityPercentage: "higher",
      earnOutPercentage: "higher",
      escrowPercentage: "higher",
      earnOutTargetYears: "higher",
      nonCompeteMonths: "higher",
    },
    targets,
  };
}

function legacyReservation(
  side: "buyer" | "seller",
): UtilityModel["reservation"]["buyer"] {
  return {
    minimum: 0.2,
    metadata: {
      source: `legacy ${side} reservation compatibility contract`,
      policyVersion: "MAI-146-compatibility-v1",
      units: NEGOTIATION_UTILITY_UNITS,
      effectiveDate: "2026-08-01",
      evidenceVersion: "genetic-legacy-v1",
      enforcement: "mandatory",
    },
  };
}

function toLegacyAlternative(alternative: {
  proposal: {
    valuation: number;
    cashPercentage: number;
    equityPercentage: number;
    earnOutPercentage: number;
    escrowPercentage: number;
  };
  fitness: number;
}): TermSheetAlternative {
  return {
    valuation: alternative.proposal.valuation,
    cashPercentage: alternative.proposal.cashPercentage,
    equityPercentage: alternative.proposal.equityPercentage,
    earnOutPercentage: alternative.proposal.earnOutPercentage,
    escrowPercentage: alternative.proposal.escrowPercentage,
    fitness: alternative.fitness,
  };
}
