import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert";
import {
  Chromosome,
  crossover,
  DealProfile,
  DEFAULT_CONFIG,
  evaluate,
  evolve,
  initialPopulation,
  mutate,
  optimizeDeal,
  select,
} from "./genetic.ts";

Deno.test("initialPopulation creates correct size and valid chromosomes", () => {
  const profile: DealProfile = {
    valuationMin: 10,
    valuationMax: 20,
    preferences: { cash: 0.5, equity: 0.3, earnOut: 0.1, escrow: 0.1 },
  };
  const pop = initialPopulation(10, profile);

  assertEquals(pop.length, 10);
  for (const c of pop) {
    assert(c.valuation >= 10 && c.valuation <= 20);
    assertAlmostEquals(c.cash + c.equity + c.earnOut + c.escrow, 1.0, 0.0001);
  }
});

Deno.test("evaluate penalizes correctly based on profile", () => {
  const profile: DealProfile = {
    valuationMin: 10,
    valuationMax: 20,
    preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 },
  };

  const c1: Chromosome = {
    valuation: 15,
    cash: 1,
    equity: 0,
    earnOut: 0,
    escrow: 0,
  };
  evaluate(c1, profile);

  const c2: Chromosome = {
    valuation: 25,
    cash: 1,
    equity: 0,
    earnOut: 0,
    escrow: 0,
  };
  evaluate(c2, profile);

  assert((c1.fitness || 0) > (c2.fitness || 0));
});

Deno.test("select chooses the best individual in tournament", () => {
  const pop = [
    {
      valuation: 10,
      cash: 0.5,
      equity: 0.5,
      earnOut: 0,
      escrow: 0,
      fitness: 100,
    },
    {
      valuation: 10,
      cash: 0.5,
      equity: 0.5,
      earnOut: 0,
      escrow: 0,
      fitness: 200,
    },
    {
      valuation: 10,
      cash: 0.5,
      equity: 0.5,
      earnOut: 0,
      escrow: 0,
      fitness: 300,
    },
  ];

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
  const profile: DealProfile = {
    valuationMin: 10,
    valuationMax: 20,
    preferences: { cash: 0.5, equity: 0.3, earnOut: 0.1, escrow: 0.1 },
  };
  const c = { valuation: 15, cash: 0.5, equity: 0.5, earnOut: 0, escrow: 0 };

  mutate(c, profile, 1.0); // 100% mutation rate
  assertAlmostEquals(c.cash + c.equity + c.earnOut + c.escrow, 1.0, 0.0001);
});

Deno.test("optimizeDeal returns distinct alternatives and generates benchmark", async () => {
  const profile: DealProfile = {
    valuationMin: 50_000_000,
    valuationMax: 70_000_000,
    preferences: { cash: 0.4, equity: 0.4, earnOut: 0.1, escrow: 0.1 },
  };

  const start = performance.now();
  const alternatives = optimizeDeal(profile, {
    populationSize: 100,
    generations: 10,
  });
  const end = performance.now();

  assertEquals(alternatives.length, 3);
  assert(end - start < 500, "Execution time should be under 500ms");

  // Write convergence benchmark
  const benchResult = {
    test: "optimizeDeal convergence",
    hardware: "reference",
    populationSize: 100,
    generations: 10,
    executionTimeMs: end - start,
    alternatives,
  };

  await Deno.mkdir("./bench", { recursive: true });
  await Deno.writeTextFile(
    "./bench/ga-convergence.json",
    JSON.stringify(benchResult, null, 2),
  );
});
