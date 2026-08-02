import {
  calculateBookValue,
  calculateDiscountedCashFlow,
  calculateEbitdaMultiple,
  calculateEnterpriseValue,
  calculateMarketCapitalization,
  calculateTerminalValue,
} from "../../valuation/index.ts";
import type {
  BalanceSheetData,
  CashFlowProjection,
  EbitdaMultipleInput as LegacyEbitdaInput,
  EnterpriseValueInput as LegacyEnterpriseValueInput,
  MarketData,
  MethodResult,
  TerminalValueInput as LegacyTerminalValueInput,
  ValuationFlag,
} from "../../../shared/types.ts";
import type {
  CalculationOptions,
  CalculationOutcome,
  Money,
  ValuationResult,
} from "../../valuation/types.ts";

const LEGACY_OPTIONS: CalculationOptions = {
  rounding: { moneyScale: 6, ratioScale: 12, mode: "half-up" },
};

export function legacyBookValue(data: BalanceSheetData): MethodResult {
  return legacyValue(calculateBookValue({
    totalAssets: brl(data.totalAssets),
    intangibleAssets: brl(data.intangibleAssets),
    totalLiabilities: brl(data.totalLiabilities),
    options: LEGACY_OPTIONS,
  }));
}

export function legacyDiscountedCashFlow(
  data: CashFlowProjection,
): MethodResult {
  const outcome = calculateDiscountedCashFlow({
    cashFlows: data.cashFlows.map((amount, index) => ({
      period: { value: index + 1, unit: "years" },
      amount: brl(amount),
    })),
    discountRate: { decimal: data.wacc },
    options: LEGACY_OPTIONS,
  });
  if (!outcome.ok && outcome.error.field === "cashFlows") {
    return { method: "Discounted Cash Flow (DCF)", value: 0, flags: [] };
  }
  return legacyValue(outcome);
}

export function legacyTerminalValue(
  data: LegacyTerminalValueInput,
): MethodResult {
  const outcome = calculateTerminalValue({
    lastCashFlow: brl(data.lastCashFlow),
    growthRate: { decimal: data.growthRate },
    discountRate: { decimal: data.wacc },
    projectionYears: { value: data.projectionYears, unit: "years" },
    options: LEGACY_OPTIONS,
  });
  if (
    !outcome.ok &&
    outcome.error.code === "MATHEMATICALLY_UNDEFINED" &&
    outcome.error.field === "growthRate"
  ) {
    return {
      method: "Growing Perpetuity (Terminal Value)",
      value: Infinity,
      flags: ["GROWTH_EXCEEDS_WACC"],
    };
  }
  const result = legacyValue(outcome);
  return data.growthRate < 0 || data.growthRate > 0.04
    ? { ...result, flags: [...result.flags, "UNREALISTIC_GROWTH_RATE"] }
    : result;
}

export function legacyMarketCapitalization(data: MarketData): MethodResult {
  return legacyValue(calculateMarketCapitalization({
    sharePrice: brl(data.sharePrice),
    outstandingShares: { value: data.outstandingShares, unit: "shares" },
    options: LEGACY_OPTIONS,
  }));
}

export function legacyEnterpriseValue(
  data: LegacyEnterpriseValueInput,
): MethodResult {
  return legacyValue(calculateEnterpriseValue({
    marketCapitalization: brl(data.marketCap),
    totalDebt: brl(data.totalDebt),
    cashAndEquivalents: brl(data.cashAndEquivalents),
    options: LEGACY_OPTIONS,
  }));
}

export function legacyEbitdaMultiple(data: LegacyEbitdaInput): MethodResult {
  if (data.totalDebt < 0 || data.cashAndEquivalents < 0) {
    throw new RangeError(
      `[ValuationEngine:EBITDA] debt/cash was ${data.totalDebt}/${data.cashAndEquivalents}; expected non-negative values.`,
    );
  }
  const outcome = calculateEbitdaMultiple({
    ebitda: brl(data.ebitda),
    evEbitdaMultiple: { value: data.evEbitdaMultiple, unit: "multiple" },
    options: LEGACY_OPTIONS,
  });
  if (!outcome.ok && outcome.error.field === "ebitda") {
    return {
      method: "EBITDA Multiple Valuation",
      value: NaN,
      flags: ["NON_POSITIVE_EBITDA"],
    };
  }
  return legacyValue(outcome);
}

function legacyValue(
  outcome: CalculationOutcome<ValuationResult>,
): MethodResult {
  if (!outcome.ok) throw new RangeError(outcome.error.message);
  return {
    method: outcome.value.method,
    value: outcome.value.value.amount,
    flags: outcome.value.flags.map((flag) => flag as ValuationFlag),
  };
}

function brl(amount: number): Money {
  return { amount, currency: "BRL" };
}
