import { assertEquals } from "@std/assert";
import {
  CoverageConstraint,
  EvaluationContext,
  KycConstraint,
  LeverageConstraint,
  ValuationFloorConstraint,
} from "./constraints.ts";
import { optimizeWithConstraints } from "./index.ts";
import { DealProfile } from "./genetic.ts";

function valuationContext(valuation: number): EvaluationContext {
  return {
    chromosome: { valuation, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: {
      valuationMin: 90,
      valuationMax: 110,
      preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    },
  };
}

const integrationProfile: DealProfile = {
  valuationMin: 50,
  valuationMax: 150,
  preferences: { cash: 0.5, equity: 0.5, earnOut: 0, escrow: 0 },
};

const integrationConstraints = [
  new KycConstraint(),
  new LeverageConstraint(6.0),
];

function constrainedDealCount(kycBlocked: boolean, debt: number): number {
  return optimizeWithConstraints({
    profile: integrationProfile,
    constraints: integrationConstraints,
    kyc: { kycBlocked, sanctionMatch: false, pepExposure: false },
    financial: { ebitda: 10, debt, interestExpense: 2 },
  }).length;
}

Deno.test("KycConstraint rejects blocked deals", () => {
  const constraint = new KycConstraint();
  const context: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: {
      valuationMin: 90,
      valuationMax: 110,
      preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    },
    kyc: { kycBlocked: true, sanctionMatch: false, pepExposure: false },
  };
  const result = constraint.evaluate(context);
  assertEquals(result.feasible, false);
});

Deno.test("KycConstraint accepts clean deals", () => {
  const constraint = new KycConstraint();
  const context: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: {
      valuationMin: 90,
      valuationMax: 110,
      preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    },
    kyc: { kycBlocked: false, sanctionMatch: false, pepExposure: false },
  };
  const result = constraint.evaluate(context);
  assertEquals(result.feasible, true);
});

Deno.test("LeverageConstraint checks debt/EBITDA", () => {
  const constraint = new LeverageConstraint(6.0);
  const goodContext: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: {
      valuationMin: 90,
      valuationMax: 110,
      preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    },
    financial: { ebitda: 10, debt: 50, interestExpense: 2 },
  };
  const badContext: EvaluationContext = {
    ...goodContext,
    financial: { ebitda: 10, debt: 70, interestExpense: 2 },
  };
  assertEquals(constraint.evaluate(goodContext).feasible, true);
  assertEquals(constraint.evaluate(badContext).feasible, false);
});

Deno.test("LeverageConstraint exposes missing and undefined typed failures", () => {
  const constraint = new LeverageConstraint(4.0);
  const missing = constraint.evaluate(valuationContext(100));
  const undefinedResult = constraint.evaluate({
    ...valuationContext(100),
    financial: { ebitda: 0, debt: 10, interestExpense: 1 },
  });

  assertEquals(missing.feasible, false);
  assertEquals(missing.error?.code, "REQUIRED_DATA_UNAVAILABLE");
  assertEquals(undefinedResult.feasible, false);
  assertEquals(undefinedResult.error?.code, "MATHEMATICALLY_UNDEFINED");
});

Deno.test("CoverageConstraint checks EBITDA/Interest", () => {
  const constraint = new CoverageConstraint(1.5);
  const goodContext: EvaluationContext = {
    chromosome: { valuation: 100, cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    profile: {
      valuationMin: 90,
      valuationMax: 110,
      preferences: { cash: 1, equity: 0, earnOut: 0, escrow: 0 },
    },
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
  const goodContext = valuationContext(105);
  const badContext = valuationContext(95);
  assertEquals(constraint.evaluate(goodContext).feasible, true);
  assertEquals(constraint.evaluate(badContext).feasible, false);
});

Deno.test("Integration test: optimizeWithConstraints drops unfeasible deals", () => {
  assertEquals(constrainedDealCount(true, 50), 0);
  assertEquals(constrainedDealCount(false, 50) > 0, true);
  assertEquals(constrainedDealCount(false, 80), 0);
});
