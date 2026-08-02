import {
  calculateBookValue,
  calculateDiscountedCashFlow,
  calculateEbitdaMultiple,
  calculateEnterpriseValue,
  calculateInterestCoverage,
  calculateLeverage,
  calculateMarketCapitalization,
  calculateTerminalValue,
  evaluateValuationFloor,
} from "./value_calculations.ts";
import { calculateSynergyPrice } from "./synergy_calculation.ts";
import type {
  BookValueInput,
  CalculationOutcome,
  DiscountedCashFlowInput,
  EbitdaMultipleInput,
  EnterpriseValueInput,
  InterestCoverageInput,
  LeverageInput,
  MarketCapitalizationInput,
  SynergyInput,
  TerminalValueInput,
  ValuationCalculation,
  ValuationFloorInput,
  ValuationRequest,
} from "./types.ts";
import { failure, invalid, record, unsupportedMethod } from "./support.ts";

export {
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
};

export function calculateValuation(
  request: ValuationRequest,
): CalculationOutcome<ValuationCalculation> {
  const source = record(request);
  if (!source || typeof source.method !== "string") {
    return failure(invalid(
      "method",
      source?.method,
      "a supported valuation method name",
    ));
  }
  return dispatch(source.method, source.input);
}

function dispatch(
  method: string,
  input: unknown,
): CalculationOutcome<ValuationCalculation> {
  switch (method) {
    case "book-value":
      return calculateBookValue(input as BookValueInput);
    case "discounted-cash-flow":
      return calculateDiscountedCashFlow(input as DiscountedCashFlowInput);
    case "terminal-value":
      return calculateTerminalValue(input as TerminalValueInput);
    case "market-capitalization":
      return calculateMarketCapitalization(input as MarketCapitalizationInput);
    case "enterprise-value":
      return calculateEnterpriseValue(input as EnterpriseValueInput);
    case "ebitda-multiple":
      return calculateEbitdaMultiple(input as EbitdaMultipleInput);
    case "leverage":
      return calculateLeverage(input as LeverageInput);
    case "interest-coverage":
      return calculateInterestCoverage(input as InterestCoverageInput);
    case "valuation-floor":
      return evaluateValuationFloor(input as ValuationFloorInput);
    case "synergy-pricing":
      return calculateSynergyPrice(input as SynergyInput);
    default:
      return failure(unsupportedMethod(method));
  }
}
