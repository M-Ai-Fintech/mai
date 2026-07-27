import {
  TermSheetOptimizerParams,
  TermSheetOptimizerResult,
  TermSheetProposal,
} from "../types.ts";

type Preference = NonNullable<TermSheetOptimizerParams["preference"]>;
interface Candidate {
  c: TermSheetProposal;
  f: number;
}

export class TermSheetOptimizer {
  public static async run(
    params: TermSheetOptimizerParams,
  ): Promise<TermSheetOptimizerResult> {
    const preference = params.preference ?? "balanced";
    const fitness = fitnessFunction(params, preference);
    let population = initialPopulation(params.populationSize, fitness);
    for (let generation = 0; generation < params.generations; generation++) {
      if (generation % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      population = evolvePopulation(population, params, fitness);
    }
    return optimizerResult(bestCandidate(population), preference);
  }

  public static evaluate(
    solution: TermSheetProposal,
    preference: Preference = "balanced",
  ) {
    const { buyer, seller } = calculateUtilities(solution, preference);
    return { buyerUtility: buyer, sellerUtility: seller };
  }
}

function fitnessFunction(
  params: TermSheetOptimizerParams,
  preference: Preference,
) {
  return (proposal: TermSheetProposal): number => {
    const utility = calculateUtilities(proposal, preference);
    if (
      utility.seller < params.minSellerReservationUtility ||
      utility.buyer < params.minBuyerReservationUtility
    ) return 0;
    return (utility.seller - params.minSellerReservationUtility) *
      (utility.buyer - params.minBuyerReservationUtility);
  };
}

function calculateUtilities(
  proposal: TermSheetProposal,
  preference: Preference,
) {
  const factors = utilityFactors(proposal);
  const weights = utilityWeights(preference);
  return {
    seller: weightedUtility(factors.seller, weights.seller),
    buyer: weightedUtility(factors.buyer, weights.buyer),
  };
}

function utilityFactors(proposal: TermSheetProposal) {
  return {
    seller: [
      proposal.cashPercentage,
      1 - proposal.buyerEquityShare,
      (5 - proposal.earnOutTargetYears) / 4,
      (60 - proposal.nonCompeteMonths) / 48,
    ],
    buyer: [
      1 - proposal.cashPercentage,
      proposal.buyerEquityShare,
      (proposal.earnOutTargetYears - 1) / 4,
      (proposal.nonCompeteMonths - 12) / 48,
    ],
  };
}

function utilityWeights(preference: Preference) {
  if (preference === "liquidity") {
    return { seller: [0.7, 0.1, 0.1, 0.1], buyer: [0.5, 0.3, 0.1, 0.1] };
  }
  if (preference === "retention") {
    return {
      seller: [0.2, 0.3, 0.25, 0.25],
      buyer: [0.2, 0.2, 0.3, 0.3],
    };
  }
  return { seller: [0.4, 0.3, 0.15, 0.15], buyer: [0.35, 0.35, 0.15, 0.15] };
}

function weightedUtility(values: number[], weights: number[]): number {
  return values.reduce(
    (total, value, index) => total + value * weights[index],
    0,
  );
}

function initialPopulation(
  size: number,
  fitness: (proposal: TermSheetProposal) => number,
): Candidate[] {
  return Array.from({ length: size }, () => {
    const proposal = randomProposal();
    return { c: proposal, f: fitness(proposal) };
  });
}

function randomProposal(): TermSheetProposal {
  return {
    cashPercentage: 0.1 + Math.random() * 0.9,
    buyerEquityShare: 0.1 + Math.random() * 0.9,
    earnOutTargetYears: 1 + Math.random() * 4,
    nonCompeteMonths: Math.floor(12 + Math.random() * 49),
  };
}

function evolvePopulation(
  population: Candidate[],
  params: TermSheetOptimizerParams,
  fitness: (proposal: TermSheetProposal) => number,
): Candidate[] {
  population.sort((left, right) => right.f - left.f);
  const eliteCount = Math.floor(params.populationSize * 0.2);
  const next = population.slice(0, eliteCount);
  while (next.length < params.populationSize) {
    const child = breed(selectParent(population), selectParent(population));
    mutate(child, params.mutationRate);
    next.push({ c: child, f: fitness(child) });
  }
  return next;
}

function selectParent(population: Candidate[]): TermSheetProposal {
  const index = Math.floor(Math.random() * population.length * 0.5);
  return population[index].c;
}

function breed(
  left: TermSheetProposal,
  right: TermSheetProposal,
): TermSheetProposal {
  return {
    cashPercentage: (left.cashPercentage + right.cashPercentage) / 2,
    buyerEquityShare: (left.buyerEquityShare + right.buyerEquityShare) / 2,
    earnOutTargetYears: (left.earnOutTargetYears + right.earnOutTargetYears) /
      2,
    nonCompeteMonths: Math.round(
      (left.nonCompeteMonths + right.nonCompeteMonths) / 2,
    ),
  };
}

function mutate(proposal: TermSheetProposal, rate: number): void {
  mutateOwnership(proposal, rate);
  mutateTiming(proposal, rate);
}

function mutateOwnership(proposal: TermSheetProposal, rate: number): void {
  proposal.cashPercentage = mutateValue(
    proposal.cashPercentage,
    rate,
    0.1,
    1,
    0.2,
  );
  proposal.buyerEquityShare = mutateValue(
    proposal.buyerEquityShare,
    rate,
    0.1,
    1,
    0.2,
  );
}

function mutateTiming(proposal: TermSheetProposal, rate: number): void {
  proposal.earnOutTargetYears = mutateValue(
    proposal.earnOutTargetYears,
    rate,
    1,
    5,
    1,
  );
  proposal.nonCompeteMonths = Math.round(
    mutateValue(proposal.nonCompeteMonths, rate, 12, 60, 12),
  );
}

function mutateValue(
  value: number,
  rate: number,
  minimum: number,
  maximum: number,
  range: number,
): number {
  if (Math.random() >= rate) return value;
  return Math.min(
    maximum,
    Math.max(minimum, value + (Math.random() - 0.5) * range),
  );
}

function bestCandidate(population: Candidate[]): Candidate {
  return population.sort((left, right) => right.f - left.f)[0];
}

function optimizerResult(
  best: Candidate,
  preference: Preference,
): TermSheetOptimizerResult {
  const utility = calculateUtilities(best.c, preference);
  return {
    bestProposal: {
      cashPercentage: Number(best.c.cashPercentage.toFixed(2)),
      buyerEquityShare: Number(best.c.buyerEquityShare.toFixed(2)),
      earnOutTargetYears: Number(best.c.earnOutTargetYears.toFixed(1)),
      nonCompeteMonths: best.c.nonCompeteMonths,
    },
    buyerUtility: Number(utility.buyer.toFixed(3)),
    sellerUtility: Number(utility.seller.toFixed(3)),
    fitness: Number(best.f.toFixed(4)),
  };
}
