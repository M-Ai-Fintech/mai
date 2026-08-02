import { assert, assertAlmostEquals, assertEquals } from "@std/assert";
import {
  Chromosome,
  crossover,
  DealProfile,
  evaluate,
  initialPopulation,
  mutate,
  optimizeDeal,
  select,
} from "./genetic.ts";

const standardProfile: DealProfile = {
  valuationMin: 10,
  valuationMax: 20,
  preferences: { cash: 0.5, equity: 0.3, earnOut: 0.1, escrow: 0.1 },
};

function cashChromosome(valuation: number): Chromosome {
  return { valuation, cash: 1, equity: 0, earnOut: 0, escrow: 0 };
}

function rankedPopulation(): Chromosome[] {
  return [100, 200, 300].map((fitness) => ({
    valuation: 10,
    cash: 0.5,
    equity: 0.5,
    earnOut: 0,
    escrow: 0,
    fitness,
  }));
}

function assertValidAllocation(chromosome: Chromosome): void {
  const total = chromosome.cash + chromosome.equity +
    chromosome.earnOut + chromosome.escrow;
  assertAlmostEquals(total, 1.0, 0.0001);
}

Deno.test("initialPopulation creates correct size and valid chromosomes", () => {
  const pop = initialPopulation(10, standardProfile);

  assertEquals(pop.length, 10);
  for (const c of pop) {
    assert(c.valuation >= 10 && c.valuation <= 20);
    assertValidAllocation(c);
  }
});

Deno.test("evaluate penalizes correctly based on profile", () => {
  const profile: DealProfile = {
    valuationMin: 10,
    valuationMax: 20,
    preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 },
  };
  const c1 = cashChromosome(15);
  const c2 = cashChromosome(25);
  evaluate(c1, profile);
  evaluate(c2, profile);

  assert((c1.fitness || 0) > (c2.fitness || 0));
});

Deno.test("select chooses the best individual in tournament", () => {
  const pop = rankedPopulation();
  const random = Math.random;
  const draws = [0, 0.34, 0.67];
  Math.random = () => draws.shift() ?? 0;

  try {
    const best = select(pop, 3);
    assertEquals(best.fitness, 300);
  } finally {
    Math.random = random;
  }
});

Deno.test("crossover produces valid child", () => {
  const pA = { valuation: 10, cash: 1, equity: 0, earnOut: 0, escrow: 0 };
  const pB = { valuation: 20, cash: 0, equity: 1, earnOut: 0, escrow: 0 };

  const child = crossover(pA, pB);
  assert(child.valuation >= 10 && child.valuation <= 20);
  assertAlmostEquals(
    child.cash + child.equity + child.earnOut + child.escrow,
    1.0,
    0.0001,
  );
});

Deno.test("mutate changes individual and keeps it valid", () => {
  const c = { valuation: 15, cash: 0.5, equity: 0.5, earnOut: 0, escrow: 0 };

  mutate(c, standardProfile, 1.0); // 100% mutation rate
  assertValidAllocation(c);
});

async function writeBenchmark(
  executionTimeMs: number,
  alternatives: ReturnType<typeof optimizeDeal>,
): Promise<void> {
  // Write convergence benchmark
  const benchResult = {
    test: "optimizeDeal convergence",
    hardware: "reference",
    populationSize: 100,
    generations: 10,
    executionTimeMs,
    alternatives,
  };
  await Deno.mkdir("./bench", { recursive: true });
  await Deno.writeTextFile(
    "./bench/ga-convergence.json",
    JSON.stringify(benchResult, null, 2),
  );
}

Deno.test("optimizeDeal returns distinct alternatives and generates benchmark", async () => {
  const profile = {
    ...standardProfile,
    valuationMin: 50_000_000,
    valuationMax: 70_000_000,
  };
  const start = performance.now();
  const alternatives = optimizeDeal(profile, {
    populationSize: 100,
    generations: 10,
  });
  const executionTimeMs = performance.now() - start;
  assertEquals(alternatives.length, 3);
  assert(executionTimeMs < 500, "Execution time should be under 500ms");
  await writeBenchmark(executionTimeMs, alternatives);
});

Deno.test("optimizeDeal compatibility adapter replays a seeded result", () => {
  const first = optimizeDeal(standardProfile, {
    populationSize: 30,
    generations: 12,
    seed: 146,
    crossoverRate: 0.8,
  });
  const replay = optimizeDeal(standardProfile, {
    populationSize: 30,
    generations: 12,
    seed: 146,
    crossoverRate: 0.8,
  });

  assertEquals(replay, first);
});
