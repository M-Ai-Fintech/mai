// tests/engines/optimization.spec.ts
import { assertEquals, assertNotEquals, assertAlmostEquals } from "@std/assert";
import { TermSheetGeneticOptimizer } from "../../src/engines/optimization/genetic.ts";
import { KYCValuationsCoordinator } from "../../src/engines/optimization/kyc/coordinator.ts";
import { synergyPricingTool } from "../../src/agent/actions.ts";

const sampleTargets = [
  {
    id: "target_1",
    name: "SaaS Dev Corp",
    synergyValue: 50,
    acquisitionCost: 20,
    ebitda: 2,
    revenue: 8,
    totalAssets: 10,
    totalLiabilities: 4,
    operatingCashFlow: 3,
    historicalVolatility: 0.1,
    businessSector: "SaaS",
  },
  {
    id: "target_2",
    name: "Fintech Pay Corp",
    synergyValue: 80,
    acquisitionCost: 35,
    ebitda: 3,
    revenue: 12,
    totalAssets: 15,
    totalLiabilities: 8,
    operatingCashFlow: 4,
    historicalVolatility: 0.2,
    businessSector: "Fintech",
  },
  {
    id: "target_3",
    name: "Competitor SaaS Corp",
    synergyValue: 70,
    acquisitionCost: 30,
    ebitda: 2.5,
    revenue: 9,
    totalAssets: 12,
    totalLiabilities: 6,
    operatingCashFlow: 3.5,
    historicalVolatility: 0.4, // High risk target
    businessSector: "SaaS",
  },
];

// --- 1. KYC VALUATIONS COORDINATOR (MILP) TESTS ---

Deno.test("KYCValuationsCoordinator - Maximizes synergy under budget constraint", async () => {
  const result = await KYCValuationsCoordinator.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 40,
    riskToleranceLimit: 0.5,
  });

  assertEquals(result.optimization.status, "optimal");
  // With budget 40, we can buy target_1 (cost 20, syn 50) and target_3 (cost 30, syn 70) -> exceeds budget (50).
  // Or target_2 (cost 35, syn 80) -> total cost 35, total synergy 80.
  // Or target_1 (cost 20, syn 50) -> total cost 20, total synergy 50.
  // The optimal choice is target_2 alone (cost 35, synergy 80) since target_1 + target_3 exceeds 40.
  // Let's verify it chose target_2
  assertEquals(result.optimization.selectedTargetIds, ["target_2"]);
  assertEquals(result.totalSynergy, 80);
  assertEquals(result.totalCost, 35);
});

Deno.test("KYCValuationsCoordinator - Filters high risk targets", async () => {
  const result = await KYCValuationsCoordinator.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.25, // target_3 is 0.4 so it's filtered out
  });

  // target_3 has risk 0.4, which is > 0.25. It shouldn't be selected.
  assertEquals(result.optimization.selectedTargetIds.includes("target_3"), false);
  // Both target_1 (20) and target_2 (35) fit in budget 100 and have risk <= 0.25.
  assertEquals(result.optimization.selectedTargetIds.sort(), ["target_1", "target_2"].sort());
  assertEquals(result.totalSynergy, 130);
  assertEquals(result.totalCost, 55);
});

Deno.test("KYCValuationsCoordinator - Respects mutual exclusion constraints", async () => {
  const result = await KYCValuationsCoordinator.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.5,
    mutualExclusions: [["target_1", "target_2"]], // A and B are mutually exclusive
  });

  // Since A and B are mutually exclusive, the solver must pick between:
  // - target_1 + target_3 (cost 50, synergy 50+70=120)
  // - target_2 + target_3 (cost 65, synergy 80+70=150)
  // Optimal is target_2 + target_3. target_1 should NOT be selected.
  assertEquals(result.optimization.selectedTargetIds.includes("target_1"), false);
  assertEquals(result.optimization.selectedTargetIds.sort(), ["target_2", "target_3"].sort());
});

Deno.test("KYCValuationsCoordinator - Returns infeasible status when no targets match risk criteria", async () => {
  const result = await KYCValuationsCoordinator.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.05, // too low, no targets eligible
  });

  assertEquals(result.optimization.status, "infeasible");
  assertEquals(result.optimization.selectedTargetIds.length, 0);
  assertEquals(result.totalCost, 0);
  assertEquals(result.totalSynergy, 0);
});


// --- 2. TERM SHEET GENETIC OPTIMIZER TESTS ---

Deno.test("TermSheetGeneticOptimizer - Converges to valid proposal", async () => {
  const result = await TermSheetGeneticOptimizer.optimizeTermSheet({
    populationSize: 50,
    generations: 20,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    minBuyerReservationUtility: 0.2,
    minSellerReservationUtility: 0.2,
  });

  assertNotEquals(result.bestProposal, null);
  assertEquals(result.bestProposal.cashPercentage >= 0.1 && result.bestProposal.cashPercentage <= 1.0, true);
  assertEquals(result.bestProposal.buyerEquityShare >= 0.1 && result.bestProposal.buyerEquityShare <= 1.0, true);
  assertEquals(result.bestProposal.earnOutTargetYears >= 1.0 && result.bestProposal.earnOutTargetYears <= 5.0, true);
  assertEquals(result.bestProposal.nonCompeteMonths >= 12 && result.bestProposal.nonCompeteMonths <= 60, true);
  assertEquals(result.buyerUtility >= 0.2, true);
  assertEquals(result.sellerUtility >= 0.2, true);
  assertEquals(result.fitness >= 0, true);
});


// --- 3. SYNERGY PRICING TOOL TESTS ---

Deno.test("synergyPricingTool - Calculates present value and purchase price correctly", async () => {
  const executeResult = await synergyPricingTool.execute!({
    standaloneValue: 100,
    costSynergies: [5, 5, 5],
    revenueSynergies: [10, 10, 10],
    integrationCosts: [2, 2, 2],
    wacc: 0.10,
    taxRate: 0.34,
    revenueHaircut: 0.40,
    sharingCoefficient: 0.30,
  }, {} as any);

  assertEquals(executeResult.success, true);
  const data = executeResult;

  // Let's manually calculate first year discounted net synergies:
  // cost: 5 * (1 - 0.34) = 3.3
  // revenue: 10 * (1 - 0.4) * (1 - 0.34) = 6 * 0.66 = 3.96
  // integration: 2 * (1 - 0.34) = 1.32
  // net first year = 3.3 + 3.96 - 1.32 = 5.94
  // discounted first year = 5.94 / (1.10)^1 = 5.40
  // discounted second year = 5.94 / 1.21 = 4.909
  // discounted third year = 5.94 / 1.331 = 4.4627
  // Total Net Synergy Value ~ 5.4 + 4.909 + 4.4627 = 14.772
  // sellerPremium = 0.30 * 14.772 = 4.4316
  // recommendedPurchasePrice = 100 + 4.4316 = 104.4316

  assertAlmostEquals(data.netSynergyValue, 14.772, 0.1);
  assertAlmostEquals(data.sellerPremium, 4.431, 0.1);
  assertAlmostEquals(data.recommendedPurchasePrice, 104.431, 0.1);
});
