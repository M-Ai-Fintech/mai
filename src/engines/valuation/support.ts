import type {
  CalculationError,
  CalculationOptions,
  CalculationOutcome,
  CalculationProvenance,
  CalculationSuccess,
  CashFlow,
  Money,
  Multiple,
  Percentage,
} from "./types.ts";

const ALGORITHM = "mai.deterministic-valuation" as const;
const ALGORITHM_VERSION = "1.0.0" as const;
const CURRENCIES = ["BRL", "USD", "EUR"] as const;

export function success<Value>(
  value: Value,
  formulaId: string,
  inputFields: readonly string[],
  options: CalculationOptions,
): CalculationSuccess<Value> {
  return {
    ok: true,
    value,
    provenance: provenance(formulaId, inputFields, options),
  };
}

export function failure<Value>(
  error: CalculationError,
): CalculationOutcome<Value> {
  return { ok: false, error };
}

export function finiteValue<Value>(
  value: number,
  field: string,
  build: () => CalculationSuccess<Value>,
): CalculationOutcome<Value> {
  const error = finiteErrorFor(value, field);
  return error ? failure(error) : build();
}

export function finiteErrorFor(
  value: number,
  field: string,
): CalculationError | undefined {
  return Number.isFinite(value)
    ? undefined
    : undefinedResult(field, value, "a finite result");
}

export function roundMoney(
  amount: number,
  currency: Money["currency"],
  options: CalculationOptions,
): Money {
  return { amount: round(amount, options.rounding.moneyScale), currency };
}

export function roundRatio(
  value: number,
  options: CalculationOptions,
): Multiple {
  return { value: round(value, options.rounding.ratioScale), unit: "multiple" };
}

export function discounted(flow: CashFlow, discountRate: number): number {
  return flow.amount.amount / (1 + discountRate) ** flow.period.value;
}

export function presentValue(
  flows: readonly CashFlow[],
  discountRate: Percentage,
  factor: number,
): number {
  return flows.reduce(
    (total, flow) =>
      total +
      factor * flow.amount.amount /
        (1 + discountRate.decimal) ** flow.period.value,
    0,
  );
}

export function firstError(
  ...errors: readonly (CalculationError | undefined)[]
): CalculationError | undefined {
  return errors.find((error) => error !== undefined);
}

export function missing(field: string, expected: string): CalculationError {
  return error("REQUIRED_DATA_UNAVAILABLE", field, undefined, expected);
}

export function unavailable(field: string, expected: string): CalculationError {
  return error("REQUIRED_DATA_UNAVAILABLE", field, "empty", expected);
}

export function invalid(
  field: string,
  received: unknown,
  expected: string,
): CalculationError {
  return error("INVALID_INPUT", field, received, expected);
}

export function undefinedResult(
  field: string,
  received: unknown,
  expected: string,
): CalculationError {
  return error("MATHEMATICALLY_UNDEFINED", field, received, expected);
}

export function unsupportedMethod(method: string): CalculationError {
  return error(
    "UNSUPPORTED_METHOD",
    "method",
    method,
    "one of the supported deterministic valuation methods",
  );
}

export function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : undefined;
}

export function isCurrency(value: unknown): value is Money["currency"] {
  return typeof value === "string" &&
    CURRENCIES.includes(value as Money["currency"]);
}

export function validScale(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 &&
    value <= 12;
}

function provenance(
  formulaId: string,
  inputFields: readonly string[],
  options: CalculationOptions,
): CalculationProvenance {
  return {
    algorithm: ALGORITHM,
    algorithmVersion: ALGORITHM_VERSION,
    formulaId,
    inputFields,
    rounding: { ...options.rounding },
  };
}

function round(value: number, scale: number): number {
  if (Number.isInteger(value)) return value;
  const factor = 10 ** scale;
  const sign = value < 0 ? -1 : 1;
  const scaled = Math.abs(value) * factor;
  const adjusted = scaled + Number.EPSILON * Math.max(1, scaled) * 4;
  return sign * Math.round(adjusted) / factor;
}

function error(
  code: CalculationError["code"],
  field: string,
  received: unknown,
  expected: string,
): CalculationError {
  const receivedText = stringify(received);
  return {
    code,
    field,
    received: receivedText,
    expected,
    message:
      `${code} for ${field}: received ${receivedText}; expected ${expected}.`,
  };
}

function stringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "number") return String(value);
  const serialized = JSON.stringify(value);
  return serialized ?? String(value);
}
