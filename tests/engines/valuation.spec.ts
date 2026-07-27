import { assertAlmostEquals, assertEquals, assertThrows } from "@std/assert";
import {
  computeBookValue,
  computeDCF,
  computeEbitdaMultiple,
  computeEnterpriseValue,
  computeMarketCap,
  computeTerminalValue,
  ValuationEngine,
} from "../../src/engines/optimization/valuation/index.ts";
import type { ValuationInput } from "../../src/shared/types.ts";

const SAMPLE_VALUATION_INPUT: ValuationInput = {
  companyId: "COMP-123",
  balanceSheet: {
    totalAssets: 10_000_000,
    intangibleAssets: 1_000_000,
    totalLiabilities: 4_000_000,
  },
  cashFlowProjection: {
    cashFlows: [500_000, 600_000, 700_000],
    wacc: 0.12,
  },
  terminalValue: {
    lastCashFlow: 700_000,
    growthRate: 0.02,
    wacc: 0.12,
    projectionYears: 3,
  },
  marketData: {
    sharePrice: 25,
    outstandingShares: 2_000_000,
  },
  enterpriseValue: {
    marketCap: 50_000_000,
    totalDebt: 5_000_000,
    cashAndEquivalents: 10_000_000,
  },
  ebitdaMultiple: {
    ebitda: 2_000_000,
    evEbitdaMultiple: 12,
    totalDebt: 5_000_000,
    cashAndEquivalents: 10_000_000,
  },
};

// ─── Individual Method Unit Tests & Edge Cases ───────────────────────────────

Deno.test("computeBookValue – calculates correctly", () => {
  const result = computeBookValue({
    totalAssets: 5_000_000,
    intangibleAssets: 500_000,
    totalLiabilities: 2_000_000,
  });
  assertEquals(result.value, 2_500_000);
  assertEquals(result.flags.length, 0);
});

Deno.test("computeBookValue – throws on negative inputs", () => {
  assertThrows(
    () =>
      computeBookValue({
        totalAssets: -100,
        intangibleAssets: 0,
        totalLiabilities: 0,
      }),
    RangeError,
  );
});

Deno.test("computeBookValue – flags negative book value", () => {
  const result = computeBookValue({
    totalAssets: 1_000_000,
    intangibleAssets: 200_000,
    totalLiabilities: 2_000_000,
  });
  assertEquals(result.value, -1_200_000);
  assertEquals(result.flags, ["NEGATIVE_BOOK_VALUE"]);
});

Deno.test("computeDCF – calculates correctly", () => {
  const result = computeDCF({
    cashFlows: [100_000, 150_000],
    wacc: 0.1,
  });
  // Year 1: 100000 / 1.1 = 90909.0909...
  // Year 2: 150000 / 1.21 = 123966.9421...
  // Total ~ 214876.033
  const expected = 100_000 / 1.1 + 150_000 / 1.21;
  assertAlmostEquals(result.value, expected, 1e-5);
  assertEquals(result.flags.length, 0);
});

Deno.test("computeDCF – returns 0 on empty projections", () => {
  const result = computeDCF({ cashFlows: [], wacc: 0.1 });
  assertEquals(result.value, 0);
  assertEquals(result.flags.length, 0);
});

Deno.test("computeDCF – flags negative cash flow", () => {
  const result = computeDCF({ cashFlows: [-50_000, 100_000], wacc: 0.1 });
  assertEquals(result.flags, ["NEGATIVE_CASH_FLOW_DETECTED"]);
});

Deno.test("computeDCF – throws on out of bounds WACC", () => {
  assertThrows(() => computeDCF({ cashFlows: [100], wacc: 0 }), RangeError);
  assertThrows(() => computeDCF({ cashFlows: [100], wacc: 1.2 }), RangeError);
});

Deno.test("computeTerminalValue – calculates correctly", () => {
  const result = computeTerminalValue({
    lastCashFlow: 100_000,
    growthRate: 0.02,
    wacc: 0.1,
    projectionYears: 5,
  });
  // TV = 100000 * 1.02 / 0.08 = 1,275,000
  // PV_TV = 1275000 / (1.1^5) = 791671.04...
  const expected = 1_275_000 / Math.pow(1.1, 5);
  assertAlmostEquals(result.value, expected, 1e-5);
  assertEquals(result.flags.length, 0);
});

Deno.test("computeTerminalValue – flags growth exceeding WACC", () => {
  const result = computeTerminalValue({
    lastCashFlow: 100_000,
    growthRate: 0.12,
    wacc: 0.1,
    projectionYears: 5,
  });
  assertEquals(result.value, Infinity);
  assertEquals(result.flags.includes("GROWTH_EXCEEDS_WACC"), true);
});

Deno.test("computeMarketCap – calculates correctly", () => {
  const result = computeMarketCap({
    sharePrice: 50,
    outstandingShares: 1_000_000,
  });
  assertEquals(result.value, 50_000_000);
});

Deno.test("computeMarketCap – throws on fractional shares or non-positive values", () => {
  assertThrows(
    () => computeMarketCap({ sharePrice: -10, outstandingShares: 100 }),
    RangeError,
  );
  assertThrows(
    () => computeMarketCap({ sharePrice: 50, outstandingShares: 100.5 }),
    RangeError,
  );
});

Deno.test("computeEnterpriseValue – calculates correctly", () => {
  const result = computeEnterpriseValue({
    marketCap: 50_000_000,
    totalDebt: 10_000_000,
    cashAndEquivalents: 5_000_000,
  });
  assertEquals(result.value, 55_000_000);
  assertEquals(result.flags.length, 0);
});

Deno.test("computeEnterpriseValue – flags negative EV", () => {
  const result = computeEnterpriseValue({
    marketCap: 10_000_000,
    totalDebt: 0,
    cashAndEquivalents: 20_000_000,
  });
  assertEquals(result.value, -10_000_000);
  assertEquals(result.flags, ["NEGATIVE_ENTERPRISE_VALUE"]);
});

Deno.test("computeEbitdaMultiple – calculates correctly", () => {
  const result = computeEbitdaMultiple({
    ebitda: 5_000_000,
    evEbitdaMultiple: 8,
    totalDebt: 10_000_000,
    cashAndEquivalents: 2_000_000,
  });
  assertEquals(result.value, 40_000_000);
  assertEquals(result.flags.length, 0);
});

Deno.test("computeEbitdaMultiple – flags non-positive EBITDA", () => {
  const result = computeEbitdaMultiple({
    ebitda: -1_000_000,
    evEbitdaMultiple: 8,
    totalDebt: 10_000_000,
    cashAndEquivalents: 2_000_000,
  });
  assertEquals(Number.isNaN(result.value), true);
  assertEquals(result.flags, ["NON_POSITIVE_EBITDA"]);
});

// ─── Engine Facade Integration Test ──────────────────────────────────────────

Deno.test("ValuationEngine – evaluate end-to-end", () => {
  const engine = new ValuationEngine();
  const report = engine.evaluate(SAMPLE_VALUATION_INPUT);

  assertEquals(report.companyId, "COMP-123");
  assertEquals(typeof report.timestamp, "string");
  assertEquals(report.engineVersion, ValuationEngine.VERSION);
  assertEquals(report.bookValue.value, 5_000_000);
  assertEquals(report.marketCap.value, 50_000_000);
  assertEquals(report.enterpriseValue.value, 45_000_000);
  assertEquals(report.ebitdaValuation.value, 24_000_000);
  assertEquals(report.allFlags.length, 0);
});
