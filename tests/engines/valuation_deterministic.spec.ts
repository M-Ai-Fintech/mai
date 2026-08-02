import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertNotEquals,
} from "@std/assert";
import {
  type BookValueInput,
  calculateBookValue,
  calculateDiscountedCashFlow,
  calculateEbitdaMultiple,
  calculateEnterpriseValue,
  calculateInterestCoverage,
  calculateLeverage,
  calculateMarketCapitalization,
  calculateSynergyPrice,
  calculateTerminalValue,
  calculateValuation,
  type CashFlow,
  type DiscountedCashFlowInput,
  type EbitdaMultipleInput,
  type EnterpriseValueInput,
  evaluateValuationFloor,
  type InterestCoverageInput,
  type LeverageInput,
  type MarketCapitalizationInput,
  type SynergyInput,
  type TerminalValueInput,
  type ValuationFloorInput,
} from "../../src/engines/valuation/index.ts";

const ROUNDING = {
  rounding: { moneyScale: 2, ratioScale: 6, mode: "half-up" as const },
};

const SYNERGY_ROUNDING = {
  rounding: { moneyScale: 3, ratioScale: 6, mode: "half-up" as const },
};

function cashFlow(amount: number, period: number) {
  return {
    period: { value: period, unit: "years" as const },
    amount: { amount, currency: "BRL" as const },
  };
}

Deno.test("calculateBookValue returns typed money and provenance", () => {
  const input: BookValueInput = {
    totalAssets: { amount: 10_000_000, currency: "BRL" },
    intangibleAssets: { amount: 1_000_000, currency: "BRL" },
    totalLiabilities: { amount: 4_000_000, currency: "BRL" },
    options: ROUNDING,
  };

  const outcome = calculateBookValue(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.value, { amount: 5_000_000, currency: "BRL" });
  assertEquals(outcome.provenance.formulaId, "valuation.book-value");
  assertEquals(outcome.provenance.rounding, ROUNDING.rounding);
});

Deno.test("calculateDiscountedCashFlow discounts period-labelled cash flows", () => {
  const input: DiscountedCashFlowInput = {
    cashFlows: [
      {
        period: { value: 1, unit: "years" },
        amount: { amount: 100_000, currency: "BRL" },
      },
      {
        period: { value: 2, unit: "years" },
        amount: { amount: 150_000, currency: "BRL" },
      },
    ],
    discountRate: { decimal: 0.10 },
    options: ROUNDING,
  };

  const outcome = calculateDiscountedCashFlow(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.value, { amount: 214_876.03, currency: "BRL" });
  assertEquals(outcome.provenance.formulaId, "valuation.discounted-cash-flow");
});

Deno.test("calculateTerminalValue returns discounted Gordon growth value", () => {
  const input: TerminalValueInput = {
    lastCashFlow: { amount: 100_000, currency: "BRL" },
    growthRate: { decimal: 0.02 },
    discountRate: { decimal: 0.10 },
    projectionYears: { value: 5, unit: "years" },
    options: ROUNDING,
  };

  const outcome = calculateTerminalValue(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.value, { amount: 791_674.69, currency: "BRL" });
});

Deno.test("calculateMarketCapitalization multiplies typed price and shares", () => {
  const input: MarketCapitalizationInput = {
    sharePrice: { amount: 50, currency: "BRL" },
    outstandingShares: { value: 1_000_000, unit: "shares" },
    options: ROUNDING,
  };

  const outcome = calculateMarketCapitalization(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.value, { amount: 50_000_000, currency: "BRL" });
});

Deno.test("calculateEnterpriseValue preserves negative result as an explicit flag", () => {
  const input: EnterpriseValueInput = {
    marketCapitalization: { amount: 10_000_000, currency: "BRL" },
    totalDebt: { amount: 0, currency: "BRL" },
    cashAndEquivalents: { amount: 20_000_000, currency: "BRL" },
    options: ROUNDING,
  };

  const outcome = calculateEnterpriseValue(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.value, { amount: -10_000_000, currency: "BRL" });
  assertEquals(outcome.value.flags, ["NEGATIVE_ENTERPRISE_VALUE"]);
});

Deno.test("calculateEbitdaMultiple calculates an implied enterprise value", () => {
  const input: EbitdaMultipleInput = {
    ebitda: { amount: 5_000_000, currency: "BRL" },
    evEbitdaMultiple: { value: 8, unit: "multiple" },
    options: ROUNDING,
  };

  const outcome = calculateEbitdaMultiple(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.value, { amount: 40_000_000, currency: "BRL" });
});

Deno.test("calculateLeverage returns a typed multiple without owning a threshold", () => {
  const input: LeverageInput = {
    debt: { amount: 50_000_000, currency: "BRL" },
    ebitda: { amount: 10_000_000, currency: "BRL" },
    options: ROUNDING,
  };

  const outcome = calculateLeverage(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.ratio, { value: 5, unit: "multiple" });
  assertEquals(outcome.provenance.formulaId, "valuation.leverage");
});

Deno.test("calculateInterestCoverage returns EBITDA divided by interest expense", () => {
  const input: InterestCoverageInput = {
    ebitda: { amount: 10_000_000, currency: "BRL" },
    interestExpense: { amount: 5_000_000, currency: "BRL" },
    options: ROUNDING,
  };

  const outcome = calculateInterestCoverage(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.ratio, { value: 2, unit: "multiple" });
});

Deno.test("evaluateValuationFloor compares explicit scenario inputs", () => {
  const input: ValuationFloorInput = {
    valuation: { amount: 105, currency: "BRL" },
    minimumValuation: { amount: 100, currency: "BRL" },
    options: ROUNDING,
  };

  const outcome = evaluateValuationFloor(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.meetsFloor, true);
  assertEquals(outcome.value.gap, { amount: 5, currency: "BRL" });
});

Deno.test("ratio calculations reject zero and negative denominators explicitly", () => {
  const zeroInterest = calculateInterestCoverage({
    ebitda: { amount: 10, currency: "BRL" },
    interestExpense: { amount: 0, currency: "BRL" },
    options: ROUNDING,
  });
  const negativeEbitda = calculateLeverage({
    debt: { amount: 10, currency: "BRL" },
    ebitda: { amount: -1, currency: "BRL" },
    options: ROUNDING,
  });

  assertEquals(zeroInterest.ok, false);
  assertEquals(negativeEbitda.ok, false);
  if (zeroInterest.ok || negativeEbitda.ok) return;
  assertEquals(zeroInterest.error.code, "MATHEMATICALLY_UNDEFINED");
  assertEquals(negativeEbitda.error.code, "MATHEMATICALLY_UNDEFINED");
  assertEquals(negativeEbitda.error.received, "-1");
});

Deno.test("calculateSynergyPrice returns golden PV, premium, and purchase price", () => {
  const input: SynergyInput = {
    standaloneValue: { amount: 100, currency: "BRL" },
    costSynergies: [cashFlow(5, 1), cashFlow(5, 2), cashFlow(5, 3)],
    revenueSynergies: [cashFlow(10, 1), cashFlow(10, 2), cashFlow(10, 3)],
    integrationCosts: [cashFlow(2, 1), cashFlow(2, 2), cashFlow(2, 3)],
    discountRate: { decimal: 0.10 },
    taxRate: { decimal: 0.34 },
    revenueHaircut: { decimal: 0.40 },
    sharingCoefficient: { decimal: 0.30 },
    options: SYNERGY_ROUNDING,
  };

  const outcome = calculateSynergyPrice(input);

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.netSynergyValue, {
    amount: 14.772,
    currency: "BRL",
  });
  assertEquals(outcome.value.sellerPremium, { amount: 4.432, currency: "BRL" });
  assertEquals(outcome.value.recommendedPurchasePrice, {
    amount: 104.432,
    currency: "BRL",
  });
  assertEquals(outcome.provenance.formulaId, "valuation.synergy-pricing");
});

Deno.test("calculation errors distinguish unsupported, missing, invalid, and undefined cases", () => {
  const delegated = calculateValuation({
    method: "leverage",
    input: {
      debt: { amount: 50, currency: "BRL" },
      ebitda: { amount: 10, currency: "BRL" },
      options: ROUNDING,
    },
  });
  const unsupported = calculateValuation({ method: "heuristic", input: {} });
  const missing = calculateValuation({ method: "book-value", input: {} });
  const invalid = calculateDiscountedCashFlow({
    cashFlows: [cashFlow(100, 1)],
    discountRate: { decimal: 1 },
    options: ROUNDING,
  });
  const undefinedResult = calculateTerminalValue({
    lastCashFlow: { amount: 100, currency: "BRL" },
    growthRate: { decimal: 0.10 },
    discountRate: { decimal: 0.10 },
    projectionYears: { value: 5, unit: "years" },
    options: ROUNDING,
  });

  assertEquals(delegated.ok, true);
  assertEquals(unsupported.ok, false);
  assertEquals(missing.ok, false);
  assertEquals(invalid.ok, false);
  assertEquals(undefinedResult.ok, false);
  if (
    !delegated.ok || unsupported.ok || missing.ok || invalid.ok ||
    undefinedResult.ok
  ) return;
  assertEquals(unsupported.error.code, "UNSUPPORTED_METHOD");
  assertEquals(missing.error.code, "REQUIRED_DATA_UNAVAILABLE");
  assertEquals(invalid.error.code, "INVALID_INPUT");
  assertEquals(undefinedResult.error.code, "MATHEMATICALLY_UNDEFINED");
  assertNotEquals(undefinedResult.error.message.includes("0.1"), false);
});

Deno.test("synergy calculations reject missing aligned cash-flow data", () => {
  const outcome = calculateSynergyPrice({
    standaloneValue: { amount: 100, currency: "BRL" },
    costSynergies: [cashFlow(5, 1)],
    revenueSynergies: [],
    integrationCosts: [cashFlow(2, 1)],
    discountRate: { decimal: 0.10 },
    taxRate: { decimal: 0.34 },
    revenueHaircut: { decimal: 0.40 },
    sharingCoefficient: { decimal: 0.30 },
    options: SYNERGY_ROUNDING,
  });

  assertEquals(outcome.ok, false);
  if (outcome.ok) return;
  assertEquals(outcome.error.code, "REQUIRED_DATA_UNAVAILABLE");
  assertEquals(outcome.error.field, "revenueSynergies");
});

Deno.test("synergy pricing rejects rates outside percentage semantics", () => {
  const outcome = calculateSynergyPrice({
    standaloneValue: { amount: 100, currency: "BRL" },
    costSynergies: [cashFlow(5, 1)],
    revenueSynergies: [cashFlow(10, 1)],
    integrationCosts: [cashFlow(2, 1)],
    discountRate: { decimal: 0.10 },
    taxRate: { decimal: 0.34 },
    revenueHaircut: { decimal: 0.40 },
    sharingCoefficient: { decimal: 1.01 },
    options: SYNERGY_ROUNDING,
  });

  assertEquals(outcome.ok, false);
  if (outcome.ok) return;
  assertEquals(outcome.error.code, "INVALID_INPUT");
  assertEquals(outcome.error.field, "sharingCoefficient");
});

Deno.test("identical typed inputs produce identical deterministic output", () => {
  const input: SynergyInput = {
    standaloneValue: { amount: 100, currency: "BRL" },
    costSynergies: [cashFlow(5, 1), cashFlow(5, 2)],
    revenueSynergies: [cashFlow(10, 1), cashFlow(10, 2)],
    integrationCosts: [cashFlow(2, 1), cashFlow(2, 2)],
    discountRate: { decimal: 0.10 },
    taxRate: { decimal: 0.34 },
    revenueHaircut: { decimal: 0.40 },
    sharingCoefficient: { decimal: 0.30 },
    options: SYNERGY_ROUNDING,
  };

  assertEquals(calculateSynergyPrice(input), calculateSynergyPrice(input));
});

Deno.test("discounted cash flow remains linear for scaled cash flows", () => {
  const baseFlows = [cashFlow(10, 1), cashFlow(20, 2)];
  const doubledFlows = [cashFlow(20, 1), cashFlow(40, 2)];
  const options = {
    rounding: { moneyScale: 6, ratioScale: 6, mode: "half-up" as const },
  };
  const base = calculateDiscountedCashFlow({
    cashFlows: baseFlows,
    discountRate: { decimal: 0.10 },
    options,
  });
  const doubled = calculateDiscountedCashFlow({
    cashFlows: doubledFlows,
    discountRate: { decimal: 0.10 },
    options,
  });

  assertEquals(base.ok, true);
  assertEquals(doubled.ok, true);
  if (!base.ok || !doubled.ok) return;
  assertAlmostEquals(
    doubled.value.value.amount,
    base.value.value.amount * 2,
    0.000001,
  );
});

Deno.test("rounding, currency, and negative-value behavior are explicit", () => {
  const rounded = calculateBookValue({
    totalAssets: { amount: 1.005, currency: "BRL" },
    intangibleAssets: { amount: 0, currency: "BRL" },
    totalLiabilities: { amount: 0, currency: "BRL" },
    options: ROUNDING,
  });
  const currencyMismatch = calculateEnterpriseValue({
    marketCapitalization: { amount: 10, currency: "BRL" },
    totalDebt: { amount: 2, currency: "USD" },
    cashAndEquivalents: { amount: 1, currency: "BRL" },
    options: ROUNDING,
  });
  const negativeCashFlow = calculateDiscountedCashFlow({
    cashFlows: [cashFlow(-10, 1)],
    discountRate: { decimal: 0.10 },
    options: ROUNDING,
  });

  assertEquals(rounded.ok, true);
  assertEquals(currencyMismatch.ok, false);
  assertEquals(negativeCashFlow.ok, true);
  if (!rounded.ok || currencyMismatch.ok || !negativeCashFlow.ok) return;
  assertEquals(rounded.value.value, { amount: 1.01, currency: "BRL" });
  assertEquals(currencyMismatch.error.code, "INVALID_INPUT");
  assertEquals(negativeCashFlow.value.flags, ["NEGATIVE_CASH_FLOW_DETECTED"]);
});

Deno.test("extreme finite financial values remain valid when arithmetic stays finite", () => {
  const outcome = calculateEnterpriseValue({
    marketCapitalization: { amount: 1e12, currency: "BRL" },
    totalDebt: { amount: 2e12, currency: "BRL" },
    cashAndEquivalents: { amount: 5e11, currency: "BRL" },
    options: ROUNDING,
  });

  assertEquals(outcome.ok, true);
  if (!outcome.ok) return;
  assertEquals(outcome.value.value, { amount: 2.5e12, currency: "BRL" });
});

Deno.test("representative 1,000-period valuation completes within the local budget", () => {
  const flows = representativeFlows(1_000);
  const started = performance.now();
  const outcome = calculateDiscountedCashFlow({
    cashFlows: flows,
    discountRate: { decimal: 0.01 },
    options: ROUNDING,
  });
  const elapsedMilliseconds = performance.now() - started;

  assertEquals(outcome.ok, true);
  assert(elapsedMilliseconds < 250);
  console.log(JSON.stringify({
    calculation: "discounted-cash-flow",
    periods: flows.length,
    elapsedMilliseconds: Number(elapsedMilliseconds.toFixed(3)),
  }));
});

function representativeFlows(count: number): CashFlow[] {
  return Array.from(
    { length: count },
    (_, index) => cashFlow(1_000, index + 1),
  );
}
