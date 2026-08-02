export type CurrencyCode = "BRL" | "USD" | "EUR";

export type UnitName = "years" | "shares" | "multiple";

/** Monetary amount in major currency units; output precision is explicit in options. */
export interface Money {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export interface Percentage {
  /** Decimal representation: 0.25 means 25%. */
  readonly decimal: number;
}

export interface UnitValue<Unit extends UnitName> {
  readonly value: number;
  readonly unit: Unit;
}

export type Years = UnitValue<"years">;
export type Shares = UnitValue<"shares">;
export type Multiple = UnitValue<"multiple">;

export interface CashFlow {
  readonly period: Years;
  readonly amount: Money;
}

export interface RoundingPolicy {
  /** Decimal places used for money and ratio outputs. */
  readonly moneyScale: number;
  readonly ratioScale: number;
  readonly mode: "half-up";
}

export interface CalculationOptions {
  readonly rounding: RoundingPolicy;
}

export type CalculationErrorCode =
  | "INVALID_INPUT"
  | "MATHEMATICALLY_UNDEFINED"
  | "UNSUPPORTED_METHOD"
  | "REQUIRED_DATA_UNAVAILABLE";

export interface CalculationError {
  readonly code: CalculationErrorCode;
  readonly field: string;
  readonly received: string;
  readonly expected: string;
  readonly message: string;
}

export interface CalculationProvenance {
  readonly algorithm: "mai.deterministic-valuation";
  readonly algorithmVersion: "1.0.0";
  readonly formulaId: string;
  readonly inputFields: readonly string[];
  readonly rounding: RoundingPolicy;
}

export interface CalculationSuccess<Value> {
  readonly ok: true;
  readonly value: Value;
  readonly provenance: CalculationProvenance;
}

export interface CalculationFailure {
  readonly ok: false;
  readonly error: CalculationError;
}

export type CalculationOutcome<Value> =
  | CalculationSuccess<Value>
  | CalculationFailure;

export type ValuationFlag =
  | "NEGATIVE_BOOK_VALUE"
  | "NEGATIVE_CASH_FLOW_DETECTED"
  | "NEGATIVE_ENTERPRISE_VALUE"
  | "NON_POSITIVE_EBITDA";

export interface ValuationResult {
  readonly method: string;
  readonly value: Money;
  readonly flags: readonly ValuationFlag[];
}

export interface RatioResult {
  readonly method: string;
  readonly ratio: Multiple;
}

export interface ValuationFloorResult {
  readonly method: "valuation-floor";
  readonly valuation: Money;
  readonly minimumValuation: Money;
  readonly meetsFloor: boolean;
  readonly gap: Money;
}

export interface SynergyResult {
  readonly method: "synergy-pricing";
  readonly presentValueCostSynergies: Money;
  readonly presentValueRevenueSynergies: Money;
  readonly presentValueIntegrationCosts: Money;
  readonly netSynergyValue: Money;
  readonly sellerPremium: Money;
  readonly recommendedPurchasePrice: Money;
  readonly sharingCoefficient: Percentage;
}

export type ValuationCalculation =
  | ValuationResult
  | RatioResult
  | ValuationFloorResult
  | SynergyResult;

export type ValuationMethod =
  | "book-value"
  | "discounted-cash-flow"
  | "terminal-value"
  | "market-capitalization"
  | "enterprise-value"
  | "ebitda-multiple"
  | "leverage"
  | "interest-coverage"
  | "valuation-floor"
  | "synergy-pricing";

export interface ValuationRequest {
  readonly method: string;
  readonly input: unknown;
}

export interface BookValueInput {
  readonly totalAssets: Money;
  readonly intangibleAssets: Money;
  readonly totalLiabilities: Money;
  readonly options: CalculationOptions;
}

export interface DiscountedCashFlowInput {
  readonly cashFlows: readonly CashFlow[];
  readonly discountRate: Percentage;
  readonly options: CalculationOptions;
}

export interface TerminalValueInput {
  readonly lastCashFlow: Money;
  readonly growthRate: Percentage;
  readonly discountRate: Percentage;
  readonly projectionYears: Years;
  readonly options: CalculationOptions;
}

export interface MarketCapitalizationInput {
  readonly sharePrice: Money;
  readonly outstandingShares: Shares;
  readonly options: CalculationOptions;
}

export interface EnterpriseValueInput {
  readonly marketCapitalization: Money;
  readonly totalDebt: Money;
  readonly cashAndEquivalents: Money;
  readonly options: CalculationOptions;
}

export interface EbitdaMultipleInput {
  readonly ebitda: Money;
  readonly evEbitdaMultiple: Multiple;
  readonly options: CalculationOptions;
}

export interface LeverageInput {
  readonly debt: Money;
  readonly ebitda: Money;
  readonly options: CalculationOptions;
}

export interface InterestCoverageInput {
  readonly ebitda: Money;
  readonly interestExpense: Money;
  readonly options: CalculationOptions;
}

export interface ValuationFloorInput {
  readonly valuation: Money;
  readonly minimumValuation: Money;
  readonly options: CalculationOptions;
}

export interface SynergyInput {
  readonly standaloneValue: Money;
  readonly costSynergies: readonly CashFlow[];
  readonly revenueSynergies: readonly CashFlow[];
  readonly integrationCosts: readonly CashFlow[];
  readonly discountRate: Percentage;
  readonly taxRate: Percentage;
  readonly revenueHaircut: Percentage;
  readonly sharingCoefficient: Percentage;
  readonly options: CalculationOptions;
}
