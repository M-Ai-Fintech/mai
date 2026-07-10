import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { 
  KycConstraint, 
  LeverageConstraint, 
  CoverageConstraint, 
  ValuationFloorConstraint,
  filterFeasible,
  EvaluationContext
} from "./constraints.ts";
import { optimizeWithConstraints } from "./index.ts";
import { DealProfile } from "./genetic.ts";
import { defaultConfig } from "./config.ts";

Deno.test("KycConstraint rejects blocked deals", () => {
  const constraint = new KycConstraint();
  const context: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: { valuationMin: 90, valuationMax: 110, preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 } },
    kyc: { kycBlocked: true, sanctionMatch: false, pepExposure: false },
  };
  const result = constraint.evaluate(context);
  assertEquals(result.feasible, false);
});

Deno.test("KycConstraint accepts clean deals", () => {
  const constraint = new KycConstraint();
  const context: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: { valuationMin: 90, valuationMax: 110, preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 } },
    kyc: { kycBlocked: false, sanctionMatch: false, pepExposure: false },
  };
  const result = constraint.evaluate(context);
  assertEquals(result.feasible, true);
});

Deno.test("LeverageConstraint checks debt/EBITDA", () => {
  const constraint = new LeverageConstraint(6.0);
  const goodContext: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: { valuationMin: 90, valuationMax: 110, preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 } },
    financial: { ebitda: 10, debt: 50, interestExpense: 2 },
  };
  const badContext: EvaluationContext = {
    ...goodContext,
    financial: { ebitda: 10, debt: 70, interestExpense: 2 },
  };
  assertEquals(constraint.evaluate(goodContext).feasible, true);
  assertEquals(constraint.evaluate(badContext).feasible, false);
});

Deno.test("CoverageConstraint checks EBITDA/Interest", () => {
  const constraint = new CoverageConstraint(1.5);
  const goodContext: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: { valuationMin: 90, valuationMax: 110, preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 } },
    financial: { ebitda: 10, debt: 50, interestExpense: 5 },
  };
  const badContext: EvaluationContext = {
    ...goodContext,
    financial: { ebitda: 10, debt: 50, interestExpense: 10 },
  };
  assertEquals(constraint.evaluate(goodContext).feasible, true);
  assertEquals(constraint.evaluate(badContext).feasible, false);
});

Deno.test("ValuationFloorConstraint checks minimum valuation", () => {
  const constraint = new ValuationFloorConstraint(100);
  const goodContext: EvaluationContext = {
    chromosome: { valuation: 105, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: { valuationMin: 90, valuationMax: 110, preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 } },
  };
  const badContext: EvaluationContext = {
    chromosome: { valuation: 95, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: { valuationMin: 90, valuationMax: 110, preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 } },
  };
  assertEquals(constraint.evaluate(goodContext).feasible, true);
  assertEquals(constraint.evaluate(badContext).feasible, false);
});

Deno.test("Integration test: optimizeWithConstraints drops unfeasible deals", () => {
  const profile: DealProfile = {
    valuationMin: 50,
    valuationMax: 150,
    preferences: { cash: 0.5, equity: 0.5, earnOut: 0, escrow: 0 }
  };
  
  const constraints = [
    new KycConstraint(),
    new LeverageConstraint(defaultConfig.maxLeverage)
  ];
  
  // Case 1: KYC Blocked
  const resultBlocked = optimizeWithConstraints({
    profile,
    constraints,
    kyc: { kycBlocked: true, sanctionMatch: false, pepExposure: false },
    financial: { ebitda: 10, debt: 50, interestExpense: 2 }
  });
  assertEquals(resultBlocked.length, 0); // No deal should be feasible
  
  // Case 2: Clean, feasible deals
  const resultClean = optimizeWithConstraints({
    profile,
    constraints,
    kyc: { kycBlocked: false, sanctionMatch: false, pepExposure: false },
    financial: { ebitda: 10, debt: 50, interestExpense: 2 }
  });
  assertEquals(resultClean.length > 0, true);
  
  // Case 3: Bad leverage
  const resultBadLeverage = optimizeWithConstraints({
    profile,
    constraints,
    kyc: { kycBlocked: false, sanctionMatch: false, pepExposure: false },
    financial: { ebitda: 10, debt: 80, interestExpense: 2 }
  });
  assertEquals(resultBadLeverage.length, 0);
});
