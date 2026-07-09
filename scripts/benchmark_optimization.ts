// scripts/benchmark_optimization.ts
import { TermSheetOptimizer } from "../src/engines/optimization/matching/index.ts";
import { PortfolioSolver } from "../src/engines/optimization/kyc/index.ts";
import { TargetRawInput } from "../src/engines/optimization/types.ts";

async function benchmark() {
  console.log("=== Optimization Engine Benchmark ===\n");

  // 1. Term Sheet Optimizer Benchmark
  console.log("[1/2] Benchmarking TermSheetOptimizer...");
  const gaStart = performance.now();
  await TermSheetOptimizer.run({
    populationSize: 100,
    generations: 200, // Configure limit
    mutationRate: 0.1,
    crossoverRate: 0.8,
    minBuyerReservationUtility: 0.2,
    minSellerReservationUtility: 0.2,
  });
  const gaEnd = performance.now();
  const gaTime = gaEnd - gaStart;
  console.log(`✅ TermSheetOptimizer completed 200 generations in ${gaTime.toFixed(2)} ms.
`);

  // 2. Portfolio Solver Benchmark
  console.log("[2/2] Benchmarking PortfolioSolver (MILP)...");
  // Generate a typical portfolio size of 100 targets
  const targets: TargetRawInput[] = Array.from({ length: 100 }, (_, i) => ({
    id: `T${i}`,
    name: `Company ${i}`,
    synergyValue: 30 + (i % 50),
    acquisitionCost: 10 + (i % 30),
    ebitda: 2,
    revenue: 10,
    totalAssets: 15,
    totalLiabilities: 5,
    operatingCashFlow: 3,
    historicalVolatility: 0.1 + ((i % 10) * 0.05),
    businessSector: i % 2 === 0 ? "SaaS" : "Fintech",
    taxDebtsAmount: i % 10,
  }));

  const milpStart = performance.now();
  const result = await PortfolioSolver.evaluateAndOptimize(targets, {
    budgetLimit: 500,
    riskToleranceLimit: 0.4,
    taxDebtCap: 500,
    sectorAllocationCaps: { "SaaS": 300, "Fintech": 300 },
  });
  const milpEnd = performance.now();
  const milpTime = milpEnd - milpStart;

  if (milpTime > 2000) {
    console.error(`❌ PortfolioSolver took ${milpTime.toFixed(2)} ms (Limit: 2000 ms).`);
  } else {
    console.log(`✅ PortfolioSolver optimized 100 targets in ${milpTime.toFixed(2)} ms.`);
  }
  
  console.log(`   Status: ${result.optimization.status}`);
  console.log(`   Selected Targets: ${result.optimization.selectedTargetIds.length}`);
  console.log(`   Total Cost: ${result.totalCost}`);
}

if (import.meta.main) {
  benchmark();
}
