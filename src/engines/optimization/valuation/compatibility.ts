import {
  calculateBookValue,
  calculateDiscountedCashFlow,
  calculateEbitdaMultiple,
  calculateEnterpriseValue,
  calculateInterestCoverage,
  calculateLeverage,
  calculateMarketCapitalization,
  calculateSynergyPrice,
  calculateTerminalValue,
  evaluateValuationFloor,
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
  CalculationError,
  CalculationOptions,
  CalculationOutcome,
  CashFlow,
  Money,
  RatioResult,
  SynergyResult,
  ValuationFloorResult,
  ValuationResult,
} from "../../valuation/types.ts";

const LEGACY_OPTIONS: CalculationOptions = {
  rounding: { moneyScale: 6, ratioScale: 12, mode: "half-up" },
};

const LEGACY_SYNERGY_OPTIONS: CalculationOptions = {
  rounding: { moneyScale: 3, ratioScale: 12, mode: "half-up" },
};

export interface LegacySynergyPricingInput {
  readonly standaloneValue: number;
  readonly costSynergies: readonly number[];
  readonly revenueSynergies: readonly number[];
  readonly integrationCosts: readonly number[];
  readonly wacc: number;
  readonly taxRate: number;
  readonly revenueHaircut: number;
  readonly sharingCoefficient: number;
}

export type LegacySynergyPricingResult =
  | {
    readonly success: true;
    readonly presentValueCostSynergies: number;
    readonly presentValueRevenueSynergies: number;
    readonly presentValueIntegrationCosts: number;
    readonly netSynergyValue: number;
    readonly sellerPremium: number;
    readonly recommendedPurchasePrice: number;
    readonly sharingCoefficient: number;
  }
  | {
    readonly success: false;
    readonly error: CalculationError;
  };

export function legacyLeverageCalculation(
  debt: number,
  ebitda: number,
): CalculationOutcome<RatioResult> {
  return calculateLeverage({
    debt: brl(debt),
    ebitda: brl(ebitda),
    options: LEGACY_OPTIONS,
  });
}

export function legacyInterestCoverageCalculation(
  ebitda: number,
  interestExpense: number,
): CalculationOutcome<RatioResult> {
  return calculateInterestCoverage({
    ebitda: brl(ebitda),
    interestExpense: brl(interestExpense),
    options: LEGACY_OPTIONS,
  });
}

export function legacyValuationFloorCalculation(
  valuation: number,
  minimumValuation: number,
): CalculationOutcome<ValuationFloorResult> {
  return evaluateValuationFloor({
    valuation: brl(valuation),
    minimumValuation: brl(minimumValuation),
    options: LEGACY_OPTIONS,
  });
}

/**
 * Converts the legacy synergy DTO into the typed valuation calculation.
 *
 * @example legacySynergyPricing({ standaloneValue: 100, costSynergies: [5], revenueSynergies: [10], integrationCosts: [2], wacc: 0.1, taxRate: 0.34, revenueHaircut: 0.4, sharingCoefficient: 0.3 })
 */
export function legacySynergyPricing(
  input: LegacySynergyPricingInput,
): LegacySynergyPricingResult {
  const outcome = calculateSynergyPrice({
    standaloneValue: brl(input.standaloneValue),
    costSynergies: legacyCashFlows(input.costSynergies),
    revenueSynergies: legacyCashFlows(input.revenueSynergies),
    integrationCosts: legacyCashFlows(input.integrationCosts),
    discountRate: { decimal: input.wacc },
    taxRate: { decimal: input.taxRate },
    revenueHaircut: { decimal: input.revenueHaircut },
    sharingCoefficient: { decimal: input.sharingCoefficient },
    options: LEGACY_SYNERGY_OPTIONS,
  });
  return outcome.ok
    ? legacySynergySuccess(outcome.value)
    : { success: false, error: outcome.error };
}

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

function legacyCashFlows(amounts: readonly number[]): CashFlow[] {
  return amounts.map((amount, index) => ({
    period: { value: index + 1, unit: "years" },
    amount: brl(amount),
  }));
}

function legacySynergySuccess(
  result: SynergyResult,
): LegacySynergyPricingResult {
  return {
    success: true,
    presentValueCostSynergies: result.presentValueCostSynergies.amount,
    presentValueRevenueSynergies: result.presentValueRevenueSynergies.amount,
    presentValueIntegrationCosts: result.presentValueIntegrationCosts.amount,
    netSynergyValue: result.netSynergyValue.amount,
    sellerPremium: result.sellerPremium.amount,
    recommendedPurchasePrice: result.recommendedPurchasePrice.amount,
    sharingCoefficient: result.sharingCoefficient.decimal,
  };
}

function brl(amount: number): Money {
  return { amount, currency: "BRL" };
}
