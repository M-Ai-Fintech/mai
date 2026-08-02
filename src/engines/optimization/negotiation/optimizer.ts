import {
  evaluateConstraintViolations,
  hasMandatoryViolations,
} from "./constraints.ts";
import { createSeededRandom, RandomSource } from "./random.ts";
import {
  DEFAULT_NEGOTIATION_OPTIMIZER_CONFIG,
  NEGOTIATION_OPTIMIZER_ALGORITHM_VERSION,
  NEGOTIATION_OPTIMIZER_CONTRACT_VERSION,
  NegotiationOptimizerInput,
  negotiationOptimizerInputSchema,
  NegotiationOptimizerResult,
  NegotiationProposal,
  OptimizerConfig,
  optimizerConfigSchema,
  ProposalBounds,
  RankedAlternative,
} from "./types.ts";
import { evaluateUtilities } from "./utility.ts";
import type { ConstraintViolation, UtilityEvaluation } from "./types.ts";

const percentageDimensions = [
  "cashPercentage",
  "equityPercentage",
  "earnOutPercentage",
  "escrowPercentage",
] as const;
type PercentageDimension = typeof percentageDimensions[number];

interface EvaluatedCandidate {
  proposal: NegotiationProposal;
  utilities: UtilityEvaluation;
  violations: ConstraintViolation[];
  feasible: boolean;
  fitness: number;
}

export function optimizeNegotiationProposal(
  input: NegotiationOptimizerInput,
): NegotiationOptimizerResult {
  const validated = negotiationOptimizerInputSchema.parse(input);
  const config = resolveConfig(validated.config);
  const random = createSeededRandom(validated.seed);
  let population = createPopulation(
    config.populationSize,
    validated.bounds,
    random,
  );
  let evaluated: EvaluatedCandidate[] = [];
  let evaluations = 0;
  let stagnantGenerations = 0;
  let bestFitness = Number.NEGATIVE_INFINITY;
  let generations = 0;
  let reason: "converged" | "max-generations" = "max-generations";

  for (let generation = 1; generation <= config.maxGenerations; generation++) {
    generations = generation;
    evaluated = evaluatePopulation(population, validated);
    evaluations += evaluated.length;
    evaluated.sort(compareCandidates);
    const currentBest = evaluated[0];
    if (currentBest.fitness > bestFitness + config.minimumImprovement) {
      bestFitness = currentBest.fitness;
      stagnantGenerations = 0;
    } else {
      stagnantGenerations++;
    }
    if (stagnantGenerations >= config.stagnationGenerations) {
      reason = "converged";
      break;
    }
    population = evolvePopulation(evaluated, validated.bounds, config, random);
  }

  return buildResult(evaluated, validated, config, {
    evaluations,
    generations,
    stagnantGenerations,
    bestFitness,
    reason,
  });
}

function resolveConfig(
  partial: Partial<OptimizerConfig> | undefined,
): OptimizerConfig {
  const config = optimizerConfig({
    ...DEFAULT_NEGOTIATION_OPTIMIZER_CONFIG,
    ...partial,
  });
  if (config.tournamentSize > config.populationSize) {
    throw new Error(
      `Invalid tournament size ${config.tournamentSize}; expected at most population size ${config.populationSize}.`,
    );
  }
  if (config.alternativeCount > config.populationSize) {
    throw new Error(
      `Invalid alternative count ${config.alternativeCount}; expected at most population size ${config.populationSize}.`,
    );
  }
  return config;
}

function optimizerConfig(config: OptimizerConfig): OptimizerConfig {
  return optimizerConfigSchema.parse(config);
}

function createPopulation(
  size: number,
  bounds: ProposalBounds,
  random: RandomSource,
): NegotiationProposal[] {
  return Array.from({ length: size }, () => randomProposal(bounds, random));
}

function randomProposal(
  bounds: ProposalBounds,
  random: RandomSource,
): NegotiationProposal {
  return {
    valuation: sampleBound(bounds.valuation, random),
    ...sampleAllocation(bounds, random),
    earnOutTargetYears: sampleBound(bounds.earnOutTargetYears, random),
    nonCompeteMonths: Math.round(sampleBound(bounds.nonCompeteMonths, random)),
  };
}

function sampleAllocation(
  bounds: ProposalBounds,
  random: RandomSource,
): Pick<NegotiationProposal, PercentageDimension> {
  const allocation = {} as Pick<
    NegotiationProposal,
    PercentageDimension
  >;
  let remaining = 1;
  for (const [index, dimension] of percentageDimensions.entries()) {
    const laterCapacity = percentageDimensions.slice(index + 1).reduce(
      (sum, laterDimension) => sum + bounds[laterDimension].maximum,
      0,
    );
    const laterMinimumSum = percentageDimensions.slice(index + 1).reduce(
      (sum, laterDimension) => sum + bounds[laterDimension].minimum,
      0,
    );
    const bound = bounds[dimension];
    const minimum = Math.max(bound.minimum, remaining - laterCapacity);
    const maximum = Math.min(bound.maximum, remaining - laterMinimumSum);
    if (minimum > maximum) {
      throw new Error(
        `Invalid allocation bounds for ${dimension}: computed minimum ${minimum} ` +
          `exceeds computed maximum ${maximum}; expected minimum <= maximum ` +
          `after reserving later minimum ${laterMinimumSum} and maximum ` +
          `${laterCapacity} from remaining ${remaining}.`,
      );
    }
    const value = index === percentageDimensions.length - 1
      ? remaining
      : minimum + random.next() * (maximum - minimum);
    allocation[dimension] = value;
    remaining -= value;
  }
  return allocation;
}

function sampleBound(
  bound: ProposalBounds[keyof ProposalBounds],
  random: RandomSource,
): number {
  return bound.minimum + random.next() * (bound.maximum - bound.minimum);
}

function evaluatePopulation(
  population: NegotiationProposal[],
  input: NegotiationOptimizerInput,
): EvaluatedCandidate[] {
  return population.map((proposal) => evaluateCandidate(proposal, input));
}

function evaluateCandidate(
  proposal: NegotiationProposal,
  input: NegotiationOptimizerInput,
): EvaluatedCandidate {
  const utilities = evaluateUtilities(proposal, input.bounds, input.utilities);
  const violations = evaluateConstraintViolations(
    proposal,
    input.bounds,
    utilities,
    input.utilities,
    input.constraints ?? [],
  );
  return {
    proposal,
    utilities,
    violations,
    feasible: !hasMandatoryViolations(violations),
    fitness: calculateFitness(utilities, violations),
  };
}

function calculateFitness(
  utilities: UtilityEvaluation,
  violations: ConstraintViolation[],
): number {
  const utilityProduct = utilities.buyer.total * utilities.seller.total;
  const mandatoryPenalty =
    violations.filter((violation) => violation.enforcement === "mandatory")
      .length;
  const advisoryPenalty =
    violations.filter((violation) => violation.enforcement === "advisory")
      .length;
  return utilityProduct - mandatoryPenalty - advisoryPenalty * 0.01;
}

function compareCandidates(
  left: EvaluatedCandidate,
  right: EvaluatedCandidate,
): number {
  if (left.feasible !== right.feasible) return left.feasible ? -1 : 1;
  if (left.violations.length !== right.violations.length) {
    return left.violations.length - right.violations.length;
  }
  if (left.fitness !== right.fitness) return right.fitness - left.fitness;
  return proposalKey(left.proposal).localeCompare(proposalKey(right.proposal));
}

function evolvePopulation(
  population: EvaluatedCandidate[],
  bounds: ProposalBounds,
  config: OptimizerConfig,
  random: RandomSource,
): NegotiationProposal[] {
  const eliteCount = Math.max(1, Math.floor(config.populationSize * 0.2));
  const next = population.slice(0, eliteCount).map((candidate) => ({
    ...candidate.proposal,
  }));
  while (next.length < config.populationSize) {
    const left = selectParent(population, config.tournamentSize, random);
    const right = selectParent(population, config.tournamentSize, random);
    const child = crossover(left, right, bounds, config.crossoverRate, random);
    next.push(mutate(child, bounds, config.mutationRate, random));
  }
  return next;
}

function selectParent(
  population: EvaluatedCandidate[],
  tournamentSize: number,
  random: RandomSource,
): NegotiationProposal {
  let winner = population[random.nextInt(population.length)];
  for (let index = 1; index < tournamentSize; index++) {
    const contender = population[random.nextInt(population.length)];
    if (compareCandidates(contender, winner) < 0) winner = contender;
  }
  return { ...winner.proposal };
}

function crossover(
  left: NegotiationProposal,
  right: NegotiationProposal,
  bounds: ProposalBounds,
  crossoverRate: number,
  random: RandomSource,
): NegotiationProposal {
  if (random.next() >= crossoverRate) return { ...left };
  const alpha = random.next();
  const allocation = blendAllocation(left, right, bounds, alpha, random);
  return {
    valuation: blend(left.valuation, right.valuation, alpha),
    ...allocation,
    earnOutTargetYears: blend(
      left.earnOutTargetYears,
      right.earnOutTargetYears,
      alpha,
    ),
    nonCompeteMonths: Math.round(
      blend(left.nonCompeteMonths, right.nonCompeteMonths, alpha),
    ),
  };
}

function blendAllocation(
  left: NegotiationProposal,
  right: NegotiationProposal,
  bounds: ProposalBounds,
  alpha: number,
  random: RandomSource,
): Pick<NegotiationProposal, PercentageDimension> {
  const allocation = {} as Pick<
    NegotiationProposal,
    PercentageDimension
  >;
  let total = 0;
  for (const dimension of percentageDimensions) {
    const value = blend(left[dimension], right[dimension], alpha);
    allocation[dimension] = value;
    total += value;
  }
  const last = percentageDimensions[percentageDimensions.length - 1];
  allocation[last] += 1 - total;
  if (withinBound(allocation[last], bounds[last])) return allocation;
  return sampleAllocation(bounds, random);
}

function mutate(
  proposal: NegotiationProposal,
  bounds: ProposalBounds,
  mutationRate: number,
  random: RandomSource,
): NegotiationProposal {
  const mutated = { ...proposal };
  if (random.next() < mutationRate) {
    mutated.valuation = mutateBounded(
      mutated.valuation,
      bounds.valuation,
      random,
    );
  }
  if (random.next() < mutationRate) {
    mutated.earnOutTargetYears = mutateBounded(
      mutated.earnOutTargetYears,
      bounds.earnOutTargetYears,
      random,
    );
  }
  if (random.next() < mutationRate) {
    mutated.nonCompeteMonths = Math.round(
      mutateBounded(mutated.nonCompeteMonths, bounds.nonCompeteMonths, random),
    );
  }
  if (random.next() < mutationRate) {
    Object.assign(mutated, sampleAllocation(bounds, random));
  }
  return mutated;
}

function mutateBounded(
  value: number,
  bound: ProposalBounds[keyof ProposalBounds],
  random: RandomSource,
): number {
  const deviation = Math.max(0.000001, (bound.maximum - bound.minimum) * 0.1);
  return clamp(
    value + random.nextGaussian(0, deviation),
    bound.minimum,
    bound.maximum,
  );
}

function buildResult(
  population: EvaluatedCandidate[],
  input: NegotiationOptimizerInput,
  config: OptimizerConfig,
  termination: {
    evaluations: number;
    generations: number;
    stagnantGenerations: number;
    bestFitness: number;
    reason: "converged" | "max-generations";
  },
): NegotiationOptimizerResult {
  const alternatives = rankAlternatives(population, config.alternativeCount);
  const best = alternatives.find((alternative) => alternative.feasible) ?? null;
  const reason = best === null ? "infeasible" : termination.reason;
  return {
    status: best === null ? "infeasible" : "feasible",
    best,
    alternatives,
    violations: best?.violations ?? alternatives[0]?.violations ?? [],
    replay: {
      seed: input.seed,
      contractVersion: NEGOTIATION_OPTIMIZER_CONTRACT_VERSION,
      algorithmVersion: NEGOTIATION_OPTIMIZER_ALGORITHM_VERSION,
      config,
    },
    termination: {
      reason,
      generations: termination.generations,
      evaluations: termination.evaluations,
      bestFitness: termination.bestFitness,
      stagnantGenerations: termination.stagnantGenerations,
    },
  };
}

function rankAlternatives(
  population: EvaluatedCandidate[],
  count: number,
): RankedAlternative[] {
  const unique = new Map<string, EvaluatedCandidate>();
  for (const candidate of population.sort(compareCandidates)) {
    unique.set(proposalKey(candidate.proposal), candidate);
  }
  return [...unique.values()].slice(0, count).map((candidate, index) => ({
    rank: index + 1,
    proposal: candidate.proposal,
    buyerUtility: candidate.utilities.buyer,
    sellerUtility: candidate.utilities.seller,
    fitness: candidate.fitness,
    feasible: candidate.feasible,
    violations: candidate.violations,
  }));
}

function proposalKey(proposal: NegotiationProposal): string {
  return [
    proposal.valuation,
    proposal.cashPercentage,
    proposal.equityPercentage,
    proposal.earnOutPercentage,
    proposal.escrowPercentage,
    proposal.earnOutTargetYears,
    proposal.nonCompeteMonths,
  ].join("|");
}

function blend(left: number, right: number, alpha: number): number {
  return left * alpha + right * (1 - alpha);
}

function withinBound(
  value: number,
  bound: ProposalBounds[keyof ProposalBounds],
): boolean {
  return value >= bound.minimum && value <= bound.maximum;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
