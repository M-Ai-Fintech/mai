// tests/engines/optimization.spec.ts
import { assertAlmostEquals, assertEquals, assertNotEquals } from "@std/assert";
import { TermSheetOptimizer } from "../../src/engines/optimization/matching/index.ts";
import { PortfolioSolver } from "../../src/engines/optimization/kyc/index.ts";
import type { TermSheetProposal } from "../../src/engines/optimization/types.ts";
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
    taxDebtsAmount: 5,
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
    taxDebtsAmount: 50,
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
    taxDebtsAmount: 10,
  },
];

// --- 1. PORTFOLIO SOLVER (MILP) TESTS ---

Deno.test("PortfolioSolver - Maximizes synergy under budget constraint", async () => {
  const result = await PortfolioSolver.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 40,
    riskToleranceLimit: 0.5,
    taxDebtCap: 100, // relaxed
  });

  assertEquals(result.optimization.status, "optimal");
  assertEquals(result.optimization.selectedTargetIds, ["target_2"]);
  assertEquals(result.totalSynergy, 80);
  assertEquals(result.totalCost, 35);
});

Deno.test("PortfolioSolver - Filters high risk targets", async () => {
  const result = await PortfolioSolver.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.25, // target_3 is 0.4 so it's filtered out
    taxDebtCap: 100,
  });

  assertEquals(
    result.optimization.selectedTargetIds.includes("target_3"),
    false,
  );
  assertEquals(
    result.optimization.selectedTargetIds.sort(),
    ["target_1", "target_2"].sort(),
  );
  assertEquals(result.totalSynergy, 130);
  assertEquals(result.totalCost, 55);
});

Deno.test("PortfolioSolver - Respects mutual exclusion constraints", async () => {
  const result = await PortfolioSolver.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.5,
    taxDebtCap: 100,
    mutualExclusions: [["target_1", "target_2"]], // A and B are mutually exclusive
  });

  assertEquals(
    result.optimization.selectedTargetIds.includes("target_1"),
    false,
  );
  assertEquals(
    result.optimization.selectedTargetIds.sort(),
    ["target_2", "target_3"].sort(),
  );
});

Deno.test("PortfolioSolver - Returns infeasible status when no targets match risk criteria", async () => {
  const result = await PortfolioSolver.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.05, // too low, no targets eligible
    taxDebtCap: 100,
  });

  assertEquals(result.optimization.status, "infeasible");
  assertEquals(result.optimization.selectedTargetIds.length, 0);
  assertEquals(result.totalCost, 0);
  assertEquals(result.totalSynergy, 0);
});

Deno.test("PortfolioSolver - Respects tax debt cap", async () => {
  const result = await PortfolioSolver.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.5,
    taxDebtCap: 20, // target_2 has 50, so it will be excluded
  });

  assertEquals(
    result.optimization.selectedTargetIds.includes("target_2"),
    false,
  );
  assertEquals(
    result.optimization.selectedTargetIds.sort(),
    ["target_1", "target_3"].sort(),
  );
});

Deno.test("PortfolioSolver - Respects sector allocation caps", async () => {
  const result = await PortfolioSolver.evaluateAndOptimize(sampleTargets, {
    budgetLimit: 100,
    riskToleranceLimit: 0.5,
    taxDebtCap: 100,
    sectorAllocationCaps: {
      "SaaS": 25, // target_1 is 20, target_3 is 30. can't pick target_3, or both.
    },
  });

  assertEquals(
    result.optimization.selectedTargetIds.includes("target_3"),
    false,
  ); // exceeds SaaS budget 25 alone
  assertEquals(
    result.optimization.selectedTargetIds.sort(),
    ["target_1", "target_2"].sort(),
  );
});

// --- 2. TERM SHEET GENETIC OPTIMIZER TESTS ---

function assertProposalRanges(proposal: TermSheetProposal): void {
  assertEquals(
    proposal.cashPercentage >= 0.1 && proposal.cashPercentage <= 1.0,
    true,
  );
  assertEquals(
    proposal.buyerEquityShare >= 0.1 && proposal.buyerEquityShare <= 1.0,
    true,
  );
  assertEquals(
    proposal.earnOutTargetYears >= 1.0 && proposal.earnOutTargetYears <= 5.0,
    true,
  );
  assertEquals(
    proposal.nonCompeteMonths >= 12 && proposal.nonCompeteMonths <= 60,
    true,
  );
}

Deno.test("TermSheetOptimizer - Converges to valid proposal", async () => {
  const result = await TermSheetOptimizer.run({
    populationSize: 50,
    generations: 20,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    minBuyerReservationUtility: 0.2,
    minSellerReservationUtility: 0.2,
  });

  assertNotEquals(result.bestProposal, null);
  assertProposalRanges(result.bestProposal);
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
  }, {} as Parameters<NonNullable<typeof synergyPricingTool.execute>>[1]);

  assertEquals(executeResult.success, true);
  const data = executeResult;

  assertAlmostEquals(data.netSynergyValue, 14.772, 0.1);
  assertAlmostEquals(data.sellerPremium, 4.431, 0.1);
  assertAlmostEquals(data.recommendedPurchasePrice, 104.431, 0.1);
});
