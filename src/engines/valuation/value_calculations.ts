import type {
  BookValueInput,
  CalculationOutcome,
  DiscountedCashFlowInput,
  EbitdaMultipleInput,
  EnterpriseValueInput,
  InterestCoverageInput,
  LeverageInput,
  MarketCapitalizationInput,
  RatioResult,
  TerminalValueInput,
  ValuationFloorInput,
  ValuationFloorResult,
  ValuationResult,
} from "./types.ts";
import {
  discounted,
  failure,
  finiteValue,
  roundMoney,
  roundRatio,
  success,
  undefinedResult,
} from "./support.ts";
import {
  validateBookValueInput,
  validateDiscountedCashFlowInput,
  validateEbitdaMultipleInput,
  validateEnterpriseValueInput,
  validateInterestCoverageInput,
  validateLeverageInput,
  validateMarketCapitalizationInput,
  validateTerminalValueInput,
  validateValuationFloorInput,
} from "./validation.ts";

export function calculateBookValue(
  input: BookValueInput,
): CalculationOutcome<ValuationResult> {
  const error = validateBookValueInput(input);
  if (error) return failure(error);
  const value = input.totalAssets.amount - input.intangibleAssets.amount -
    input.totalLiabilities.amount;
  return finiteValue(value, "bookValue", () =>
    success(
      {
        method: "Book Value",
        value: roundMoney(value, input.totalAssets.currency, input.options),
        flags: value < 0 ? ["NEGATIVE_BOOK_VALUE"] : [],
      },
      "valuation.book-value",
      ["totalAssets", "intangibleAssets", "totalLiabilities"],
      input.options,
    ));
}

export function calculateDiscountedCashFlow(
  input: DiscountedCashFlowInput,
): CalculationOutcome<ValuationResult> {
  const error = validateDiscountedCashFlowInput(input);
  if (error) return failure(error);
  const value = input.cashFlows.reduce(
    (total, flow) => total + discounted(flow, input.discountRate.decimal),
    0,
  );
  return finiteValue(value, "discountedCashFlow", () =>
    success(
      {
        method: "Discounted Cash Flow (DCF)",
        value: roundMoney(
          value,
          input.cashFlows[0].amount.currency,
          input.options,
        ),
        flags: input.cashFlows.some((flow) => flow.amount.amount < 0)
          ? ["NEGATIVE_CASH_FLOW_DETECTED"]
          : [],
      },
      "valuation.discounted-cash-flow",
      ["cashFlows", "discountRate"],
      input.options,
    ));
}

export function calculateTerminalValue(
  input: TerminalValueInput,
): CalculationOutcome<ValuationResult> {
  const error = validateTerminalValueInput(input);
  if (error) return failure(error);
  if (input.growthRate.decimal >= input.discountRate.decimal) {
    return failure(undefinedResult(
      "growthRate",
      input.growthRate.decimal,
      "less than discountRate",
    ));
  }
  const denominator = input.discountRate.decimal - input.growthRate.decimal;
  const terminalValue = input.lastCashFlow.amount *
    (1 + input.growthRate.decimal) / denominator;
  const value = terminalValue /
    (1 + input.discountRate.decimal) ** input.projectionYears.value;
  return finiteValue(value, "terminalValue", () =>
    success(
      {
        method: "Growing Perpetuity (Terminal Value)",
        value: roundMoney(value, input.lastCashFlow.currency, input.options),
        flags: input.lastCashFlow.amount < 0
          ? ["NEGATIVE_CASH_FLOW_DETECTED"]
          : [],
      },
      "valuation.terminal-value",
      ["lastCashFlow", "growthRate", "discountRate", "projectionYears"],
      input.options,
    ));
}

export function calculateMarketCapitalization(
  input: MarketCapitalizationInput,
): CalculationOutcome<ValuationResult> {
  const error = validateMarketCapitalizationInput(input);
  if (error) return failure(error);
  const value = input.sharePrice.amount * input.outstandingShares.value;
  return finiteValue(value, "marketCapitalization", () =>
    success(
      {
        method: "Market Capitalization",
        value: roundMoney(value, input.sharePrice.currency, input.options),
        flags: [],
      },
      "valuation.market-capitalization",
      ["sharePrice", "outstandingShares"],
      input.options,
    ));
}

export function calculateEnterpriseValue(
  input: EnterpriseValueInput,
): CalculationOutcome<ValuationResult> {
  const error = validateEnterpriseValueInput(input);
  if (error) return failure(error);
  const value = input.marketCapitalization.amount + input.totalDebt.amount -
    input.cashAndEquivalents.amount;
  return finiteValue(value, "enterpriseValue", () =>
    success(
      {
        method: "Enterprise Value (EV)",
        value: roundMoney(
          value,
          input.marketCapitalization.currency,
          input.options,
        ),
        flags: value < 0 ? ["NEGATIVE_ENTERPRISE_VALUE"] : [],
      },
      "valuation.enterprise-value",
      ["marketCapitalization", "totalDebt", "cashAndEquivalents"],
      input.options,
    ));
}

export function calculateEbitdaMultiple(
  input: EbitdaMultipleInput,
): CalculationOutcome<ValuationResult> {
  const error = validateEbitdaMultipleInput(input);
  if (error) return failure(error);
  if (input.ebitda.amount <= 0) {
    return failure(undefinedResult(
      "ebitda",
      input.ebitda.amount,
      "greater than zero for EV/EBITDA valuation",
    ));
  }
  const value = input.ebitda.amount * input.evEbitdaMultiple.value;
  return finiteValue(value, "ebitdaValuation", () =>
    success(
      {
        method: "EBITDA Multiple Valuation",
        value: roundMoney(value, input.ebitda.currency, input.options),
        flags: [],
      },
      "valuation.ebitda-multiple",
      ["ebitda", "evEbitdaMultiple"],
      input.options,
    ));
}

export function calculateLeverage(
  input: LeverageInput,
): CalculationOutcome<RatioResult> {
  const error = validateLeverageInput(input);
  if (error) return failure(error);
  if (input.ebitda.amount <= 0) {
    return failure(undefinedResult(
      "ebitda",
      input.ebitda.amount,
      "greater than zero as leverage denominator",
    ));
  }
  const ratio = input.debt.amount / input.ebitda.amount;
  return finiteValue(ratio, "leverage", () =>
    success(
      {
        method: "Leverage (Debt / EBITDA)",
        ratio: roundRatio(ratio, input.options),
      },
      "valuation.leverage",
      ["debt", "ebitda"],
      input.options,
    ));
}

export function calculateInterestCoverage(
  input: InterestCoverageInput,
): CalculationOutcome<RatioResult> {
  const error = validateInterestCoverageInput(input);
  if (error) return failure(error);
  if (input.interestExpense.amount <= 0) {
    return failure(undefinedResult(
      "interestExpense",
      input.interestExpense.amount,
      "greater than zero as coverage denominator",
    ));
  }
  const ratio = input.ebitda.amount / input.interestExpense.amount;
  return finiteValue(ratio, "interestCoverage", () =>
    success(
      {
        method: "Interest Coverage (EBITDA / Interest Expense)",
        ratio: roundRatio(ratio, input.options),
      },
      "valuation.interest-coverage",
      ["ebitda", "interestExpense"],
      input.options,
    ));
}

export function evaluateValuationFloor(
  input: ValuationFloorInput,
): CalculationOutcome<ValuationFloorResult> {
  const error = validateValuationFloorInput(input);
  if (error) return failure(error);
  const gap = input.valuation.amount - input.minimumValuation.amount;
  return finiteValue(gap, "valuationFloorGap", () =>
    success(
      {
        method: "valuation-floor",
        valuation: roundMoney(
          input.valuation.amount,
          input.valuation.currency,
          input.options,
        ),
        minimumValuation: roundMoney(
          input.minimumValuation.amount,
          input.minimumValuation.currency,
          input.options,
        ),
        meetsFloor: gap >= 0,
        gap: roundMoney(gap, input.valuation.currency, input.options),
      },
      "valuation.floor-comparison",
      ["valuation", "minimumValuation"],
      input.options,
    ));
}
