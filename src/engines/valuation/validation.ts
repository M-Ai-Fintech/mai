import type {
  BookValueInput,
  CalculationError,
  CashFlow,
  DiscountedCashFlowInput,
  EbitdaMultipleInput,
  EnterpriseValueInput,
  InterestCoverageInput,
  LeverageInput,
  MarketCapitalizationInput,
  Money,
  Multiple,
  Percentage,
  SynergyInput,
  TerminalValueInput,
  UnitName,
  ValuationFloorInput,
} from "./types.ts";
import {
  firstError,
  invalid,
  isCurrency,
  missing,
  record,
  unavailable,
  validScale,
} from "./support.ts";

export function validateBookValueInput(
  input: BookValueInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) {
    return invalid("input", input, "an object with typed money fields");
  }
  const error = firstError(
    validateMoney(source.totalAssets, "totalAssets"),
    validateMoney(source.intangibleAssets, "intangibleAssets"),
    validateMoney(source.totalLiabilities, "totalLiabilities"),
    validateOptions(source.options),
  );
  if (error) return error;
  const currencyError = sameCurrency(source, [
    "totalAssets",
    "intangibleAssets",
    "totalLiabilities",
  ]);
  return currencyError ?? firstError(
    nonNegativeMoney(source.totalAssets, "totalAssets"),
    nonNegativeMoney(source.intangibleAssets, "intangibleAssets"),
    nonNegativeMoney(source.totalLiabilities, "totalLiabilities"),
  );
}

export function validateDiscountedCashFlowInput(
  input: DiscountedCashFlowInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) {
    return invalid("input", input, "a typed discounted cash-flow input");
  }
  const error = firstError(
    validateCashFlows(source.cashFlows, "cashFlows"),
    validateRate(source.discountRate, "discountRate", 0, 1, false, false),
    validateOptions(source.options),
  );
  return error ?? sameFlowCurrency(source.cashFlows);
}

export function validateTerminalValueInput(
  input: TerminalValueInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) return invalid("input", input, "a typed terminal-value input");
  const error = firstError(
    validateMoney(source.lastCashFlow, "lastCashFlow"),
    validatePercentage(source.growthRate, "growthRate"),
    validateRate(source.discountRate, "discountRate", 0, 1, false, false),
    validateUnit(source.projectionYears, "years", "projectionYears"),
    validateOptions(source.options),
  );
  return error ?? validateProjectionYears(source.projectionYears);
}

export function validateMarketCapitalizationInput(
  input: MarketCapitalizationInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) {
    return invalid("input", input, "a typed market-capitalization input");
  }
  const error = firstError(
    validateMoney(source.sharePrice, "sharePrice"),
    validateUnit(source.outstandingShares, "shares", "outstandingShares"),
    validateOptions(source.options),
  );
  return error ?? firstError(
    positiveMoney(source.sharePrice, "sharePrice"),
    positiveIntegerUnit(source.outstandingShares, "outstandingShares"),
  );
}

export function validateEnterpriseValueInput(
  input: EnterpriseValueInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) return invalid("input", input, "a typed enterprise-value input");
  const error = firstError(
    validateMoney(source.marketCapitalization, "marketCapitalization"),
    validateMoney(source.totalDebt, "totalDebt"),
    validateMoney(source.cashAndEquivalents, "cashAndEquivalents"),
    validateOptions(source.options),
  );
  if (error) return error;
  const currencyError = sameCurrency(source, [
    "marketCapitalization",
    "totalDebt",
    "cashAndEquivalents",
  ]);
  return currencyError ?? firstError(
    nonNegativeMoney(source.marketCapitalization, "marketCapitalization"),
    nonNegativeMoney(source.totalDebt, "totalDebt"),
    nonNegativeMoney(source.cashAndEquivalents, "cashAndEquivalents"),
  );
}

export function validateEbitdaMultipleInput(
  input: EbitdaMultipleInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) return invalid("input", input, "a typed EBITDA multiple input");
  const error = firstError(
    validateMoney(source.ebitda, "ebitda"),
    validateUnit(source.evEbitdaMultiple, "multiple", "evEbitdaMultiple"),
    validateOptions(source.options),
  );
  return error ?? positiveUnit(source.evEbitdaMultiple, "evEbitdaMultiple");
}

export function validateLeverageInput(
  input: LeverageInput,
): CalculationError | undefined {
  return validateRatioInput(input, "debt", "ebitda", "leverage input");
}

export function validateInterestCoverageInput(
  input: InterestCoverageInput,
): CalculationError | undefined {
  return validateRatioInput(
    input,
    "ebitda",
    "interestExpense",
    "interest-coverage input",
  );
}

export function validateValuationFloorInput(
  input: ValuationFloorInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) return invalid("input", input, "a typed valuation-floor input");
  const error = firstError(
    validateMoney(source.valuation, "valuation"),
    validateMoney(source.minimumValuation, "minimumValuation"),
    validateOptions(source.options),
  );
  return error ?? sameCurrency(source, ["valuation", "minimumValuation"]);
}

export function validateSynergyInput(
  input: SynergyInput,
): CalculationError | undefined {
  const source = record(input);
  if (!source) return invalid("input", input, "a typed synergy-pricing input");
  const flowError = firstError(
    validateCashFlows(source.costSynergies, "costSynergies"),
    validateCashFlows(source.revenueSynergies, "revenueSynergies"),
    validateCashFlows(source.integrationCosts, "integrationCosts"),
  );
  if (flowError) return flowError;
  const error = firstError(
    validateMoney(source.standaloneValue, "standaloneValue"),
    validateRate(source.discountRate, "discountRate", 0, 1, false, false),
    validateRate(source.taxRate, "taxRate", 0, 1, true, true),
    validateRate(source.revenueHaircut, "revenueHaircut", 0, 1, true, true),
    validateRate(
      source.sharingCoefficient,
      "sharingCoefficient",
      0,
      1,
      true,
      true,
    ),
    validateOptions(source.options),
  );
  if (error) return error;
  return firstError(
    sameFlowCurrency(source.costSynergies),
    sameFlowCurrency(source.revenueSynergies),
    sameFlowCurrency(source.integrationCosts),
    sameSynergyCurrency(source),
    sameSynergyPeriods(source),
  );
}

function validateRatioInput(
  input: LeverageInput | InterestCoverageInput,
  numerator: string,
  denominator: string,
  expected: string,
): CalculationError | undefined {
  const source = record(input);
  if (!source) return invalid("input", input, `a typed ${expected}`);
  const error = firstError(
    validateMoney(source[numerator], numerator),
    validateMoney(source[denominator], denominator),
    validateOptions(source.options),
  );
  return error ?? sameCurrency(source, [numerator, denominator]);
}

function validateCashFlows(
  value: unknown,
  field: string,
): CalculationError | undefined {
  if (value === undefined || value === null) {
    return missing(field, "a non-empty array");
  }
  if (!Array.isArray(value)) return invalid(field, value, "a non-empty array");
  if (value.length === 0) return unavailable(field, "at least one cash flow");
  let previousPeriod = 0;
  for (const [index, item] of value.entries()) {
    const source = record(item);
    if (!source) {
      return invalid(`${field}[${index}]`, item, "a cash flow object");
    }
    const error = firstError(
      validateMoney(source.amount, `${field}[${index}].amount`),
      validateUnit(source.period, "years", `${field}[${index}].period`),
    );
    if (error) return error;
    const period = (source.period as { value: number }).value;
    if (!Number.isInteger(period) || period <= previousPeriod) {
      return invalid(
        `${field}[${index}].period`,
        period,
        "strictly increasing positive integer years",
      );
    }
    previousPeriod = period;
  }
  return undefined;
}

function validateOptions(value: unknown): CalculationError | undefined {
  if (value === undefined || value === null) {
    return missing("options", "calculation options");
  }
  const source = record(value);
  const rounding = source && record(source.rounding);
  if (!rounding) {
    return invalid("options.rounding", source?.rounding, "a rounding policy");
  }
  if (rounding.mode !== "half-up") {
    return invalid("options.rounding.mode", rounding.mode, '"half-up"');
  }
  if (!validScale(rounding.moneyScale) || !validScale(rounding.ratioScale)) {
    return invalid(
      "options.rounding",
      rounding,
      "integer moneyScale and ratioScale from 0 through 12",
    );
  }
  return undefined;
}

function validateMoney(
  value: unknown,
  field: string,
): CalculationError | undefined {
  if (value === undefined || value === null) return missing(field, "money");
  const source = record(value);
  if (
    !source || typeof source.amount !== "number" ||
    !Number.isFinite(source.amount)
  ) {
    return invalid(
      field,
      value,
      "{ amount: finite number, currency: supported code }",
    );
  }
  if (!isCurrency(source.currency)) {
    return invalid(`${field}.currency`, source.currency, "BRL, USD, or EUR");
  }
  return undefined;
}

function validatePercentage(
  value: unknown,
  field: string,
): CalculationError | undefined {
  if (value === undefined || value === null) {
    return missing(field, "percentage");
  }
  const source = record(value);
  if (
    !source || typeof source.decimal !== "number" ||
    !Number.isFinite(source.decimal)
  ) {
    return invalid(field, value, "{ decimal: finite decimal fraction }");
  }
  return undefined;
}

function validateRate(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
  inclusiveMinimum: boolean,
  inclusiveMaximum: boolean,
): CalculationError | undefined {
  const error = validatePercentage(value, field);
  if (error) return error;
  const decimal = (value as Percentage).decimal;
  const aboveMinimum = inclusiveMinimum
    ? decimal >= minimum
    : decimal > minimum;
  const belowMaximum = inclusiveMaximum
    ? decimal <= maximum
    : decimal < maximum;
  if (aboveMinimum && belowMaximum) return undefined;
  return invalid(
    field,
    decimal,
    `${inclusiveMinimum ? "inclusive" : "strict"} range ${minimum}..${maximum}`,
  );
}

function validateUnit(
  value: unknown,
  unit: UnitName,
  field: string,
): CalculationError | undefined {
  if (value === undefined || value === null) {
    return missing(field, `{ value, unit: "${unit}" }`);
  }
  const source = record(value);
  if (
    !source || typeof source.value !== "number" ||
    !Number.isFinite(source.value) || source.unit !== unit
  ) {
    return invalid(field, value, `{ value: finite number, unit: "${unit}" }`);
  }
  return undefined;
}

function validateProjectionYears(value: unknown): CalculationError | undefined {
  const years = (value as { value: number } | undefined)?.value;
  if (typeof years !== "number") return undefined;
  return Number.isInteger(years) && years >= 0
    ? undefined
    : invalid("projectionYears", years, "a non-negative integer years value");
}

function validateSameFlows(
  first: readonly CashFlow[],
  second: readonly CashFlow[],
  field: string,
): CalculationError | undefined {
  if (first.length !== second.length) {
    return unavailable(field, "the same number of period-aligned cash flows");
  }
  for (let index = 0; index < first.length; index++) {
    if (first[index].period.value !== second[index].period.value) {
      return invalid(
        field,
        second[index].period.value,
        "periods aligned with costSynergies",
      );
    }
  }
  return undefined;
}

function sameSynergyPeriods(
  source: Record<string, unknown>,
): CalculationError | undefined {
  const cost = source.costSynergies as readonly CashFlow[];
  const revenue = source.revenueSynergies as readonly CashFlow[];
  const integration = source.integrationCosts as readonly CashFlow[];
  return firstError(
    validateSameFlows(cost, revenue, "revenueSynergies"),
    validateSameFlows(cost, integration, "integrationCosts"),
  );
}

function sameFlowCurrency(value: unknown): CalculationError | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const flows = value as readonly CashFlow[];
  if (!flows[0]?.amount) return undefined;
  const currency = flows[0].amount.currency;
  return flows.slice(1).some((flow) => flow.amount.currency !== currency)
    ? invalid(
      "cashFlows.currency",
      flows.map((flow) => flow.amount.currency),
      "one currency",
    )
    : undefined;
}

function sameSynergyCurrency(
  source: Record<string, unknown>,
): CalculationError | undefined {
  const standalone = source.standaloneValue as Money;
  const flows = [
    source.costSynergies as readonly CashFlow[],
    source.revenueSynergies as readonly CashFlow[],
    source.integrationCosts as readonly CashFlow[],
  ];
  const currency = standalone.currency;
  return flows.some((items) => items[0].amount.currency !== currency)
    ? invalid(
      "synergy.currency",
      flows.map((items) => items[0].amount.currency),
      `currency ${currency}`,
    )
    : undefined;
}

function sameCurrency(
  source: Record<string, unknown>,
  fields: readonly string[],
): CalculationError | undefined {
  if (fields.length < 2) return undefined;
  const first = source[fields[0]] as Money;
  if (!first?.currency) return undefined;
  const currency = first.currency;
  for (const field of fields.slice(1)) {
    const candidate = source[field] as Money;
    if (!candidate?.currency) return undefined;
    if (candidate.currency !== currency) {
      return invalid(
        `${field}.currency`,
        candidate.currency,
        `currency ${currency} matching ${fields[0]}`,
      );
    }
  }
  return undefined;
}

function positiveMoney(
  value: unknown,
  field: string,
): CalculationError | undefined {
  const amount = (value as Money | undefined)?.amount;
  if (typeof amount !== "number") return undefined;
  return amount > 0
    ? undefined
    : invalid(field, amount, "a positive money amount");
}

function nonNegativeMoney(
  value: unknown,
  field: string,
): CalculationError | undefined {
  const amount = (value as Money | undefined)?.amount;
  if (typeof amount !== "number") return undefined;
  return amount >= 0
    ? undefined
    : invalid(field, amount, "a non-negative money amount");
}

function positiveUnit(
  value: unknown,
  field: string,
): CalculationError | undefined {
  const number = (value as Multiple | undefined)?.value;
  if (typeof number !== "number") return undefined;
  return number > 0 ? undefined : invalid(field, number, "a positive multiple");
}

function positiveIntegerUnit(
  value: unknown,
  field: string,
): CalculationError | undefined {
  const number = (value as { value: number } | undefined)?.value;
  if (typeof number !== "number") return undefined;
  return Number.isInteger(number) && number > 0
    ? undefined
    : invalid(field, number, "a positive integer unit value");
}
