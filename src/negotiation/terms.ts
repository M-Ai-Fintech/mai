import type {
  NegotiationProposal as OptimizerProposal,
} from "../engines/optimization/negotiation/types.ts";
import {
  type DisputeResolution,
  parseDisputeResolution,
  serializeDisputeResolution,
  type VersionedDisputeResolution,
} from "../shared/schemas/dispute-resolution.ts";

export const NEGOTIATION_TERMS_SCHEMA_VERSION = 1 as const;

export interface NegotiationMoney {
  readonly minorUnits: number;
  readonly currency: string;
}

export type NormalizedTermKey =
  | "valuation"
  | "cash_percentage"
  | "equity_percentage"
  | "earn_out_percentage"
  | "escrow_percentage"
  | "earn_out_target_months"
  | "non_compete_months"
  | "payment_timing_days";

export type NormalizedTermUnit =
  | "minor_units"
  | "basis_points"
  | "months"
  | "days";

export interface NormalizedTerm {
  readonly key: NormalizedTermKey;
  readonly value: number;
  readonly unit: NormalizedTermUnit;
  readonly currency?: string;
}

/**
 * Negotiation's intentionally finite term vocabulary. It is not a universal
 * term schema: other contexts own their own terms and only exchange this
 * versioned proposal representation at an explicit boundary.
 */
export interface NormalizedTerms {
  readonly schemaVersion: typeof NEGOTIATION_TERMS_SCHEMA_VERSION;
  readonly currency: string;
  readonly valuation?: NegotiationMoney;
  readonly cashPercentageBps?: number;
  readonly equityPercentageBps?: number;
  readonly earnOutPercentageBps?: number;
  readonly escrowPercentageBps?: number;
  readonly earnOutTargetMonths?: number;
  readonly nonCompeteMonths?: number;
  readonly paymentTimingDays?: number;
  readonly disputeResolution?: VersionedDisputeResolution;
  readonly terms: readonly NormalizedTerm[];
}

export interface NormalizedTermsInput {
  readonly schemaVersion?: typeof NEGOTIATION_TERMS_SCHEMA_VERSION;
  readonly currency: string;
  readonly valuation?: NegotiationMoney;
  readonly cashPercentageBps?: number;
  readonly equityPercentageBps?: number;
  readonly earnOutPercentageBps?: number;
  readonly escrowPercentageBps?: number;
  readonly earnOutTargetMonths?: number;
  readonly nonCompeteMonths?: number;
  readonly paymentTimingDays?: number;
  readonly disputeResolution?: DisputeResolution | VersionedDisputeResolution;
  readonly terms?: readonly NormalizedTerm[];
}

export interface NormalizedTermDifference {
  readonly key: NormalizedTermKey;
  readonly expected: NormalizedTerm | undefined;
  readonly actual: NormalizedTerm | undefined;
}

export {
  parseNormalizedTerms,
  parseNormalizedTermsInput,
} from "./terms_parsing.ts";

export function createNormalizedTerms(
  input: NormalizedTermsInput,
): NormalizedTerms {
  assertExactKeys(
    input,
    [
      "schemaVersion",
      "currency",
      "valuation",
      "cashPercentageBps",
      "equityPercentageBps",
      "earnOutPercentageBps",
      "escrowPercentageBps",
      "earnOutTargetMonths",
      "nonCompeteMonths",
      "paymentTimingDays",
      "disputeResolution",
      "terms",
    ],
    "normalized negotiation term input",
  );
  if (
    input.schemaVersion !== undefined &&
    input.schemaVersion !== NEGOTIATION_TERMS_SCHEMA_VERSION
  ) {
    throw new Error(
      `Negotiation terms schema version "${input.schemaVersion}" is unsupported; expected version 1.`,
    );
  }
  assertCurrency(input.currency);
  if (input.valuation !== undefined) {
    assertExactKeys(
      input.valuation,
      ["minorUnits", "currency"],
      "negotiation money",
    );
    assertMoney(input.valuation);
  }
  assertBasisPoints(input.cashPercentageBps, "cash percentage");
  assertBasisPoints(input.equityPercentageBps, "equity percentage");
  assertBasisPoints(input.earnOutPercentageBps, "earn-out percentage");
  assertBasisPoints(input.escrowPercentageBps, "escrow percentage");
  assertNonNegativeInteger(input.earnOutTargetMonths, "earn-out target months");
  assertNonNegativeInteger(input.nonCompeteMonths, "non-compete months");
  assertNonNegativeInteger(input.paymentTimingDays, "payment timing days");
  const terms = [
    ...(input.terms ?? []),
    ...(input.valuation === undefined ? [] : [
      term(
        "valuation",
        input.valuation.minorUnits,
        "minor_units",
        input.currency,
      ),
    ]),
    ...optionalTerm(
      "cash_percentage",
      input.cashPercentageBps,
      "basis_points",
    ),
    ...optionalTerm(
      "equity_percentage",
      input.equityPercentageBps,
      "basis_points",
    ),
    ...optionalTerm(
      "earn_out_percentage",
      input.earnOutPercentageBps,
      "basis_points",
    ),
    ...optionalTerm(
      "escrow_percentage",
      input.escrowPercentageBps,
      "basis_points",
    ),
    ...optionalTerm(
      "earn_out_target_months",
      input.earnOutTargetMonths,
      "months",
    ),
    ...optionalTerm("non_compete_months", input.nonCompeteMonths, "months"),
    ...optionalTerm("payment_timing_days", input.paymentTimingDays, "days"),
  ];
  const normalizedTerms = deduplicateTerms(
    terms.map((value) => normalizeTerm(value, input.currency)),
  );
  const disputeResolution = input.disputeResolution === undefined
    ? undefined
    : isVersionedDisputeResolution(input.disputeResolution)
    ? serializeDisputeResolution(
      parseDisputeResolution(input.disputeResolution),
    )
    : serializeDisputeResolution(input.disputeResolution);
  const result: NormalizedTerms = {
    schemaVersion: NEGOTIATION_TERMS_SCHEMA_VERSION,
    currency: input.currency,
    ...(input.valuation === undefined ? {} : {
      valuation: Object.freeze({
        minorUnits: input.valuation.minorUnits,
        currency: input.valuation.currency,
      }),
    }),
    ...(input.cashPercentageBps === undefined
      ? {}
      : { cashPercentageBps: input.cashPercentageBps }),
    ...(input.equityPercentageBps === undefined
      ? {}
      : { equityPercentageBps: input.equityPercentageBps }),
    ...(input.earnOutPercentageBps === undefined
      ? {}
      : { earnOutPercentageBps: input.earnOutPercentageBps }),
    ...(input.escrowPercentageBps === undefined
      ? {}
      : { escrowPercentageBps: input.escrowPercentageBps }),
    ...(input.earnOutTargetMonths === undefined
      ? {}
      : { earnOutTargetMonths: input.earnOutTargetMonths }),
    ...(input.nonCompeteMonths === undefined
      ? {}
      : { nonCompeteMonths: input.nonCompeteMonths }),
    ...(input.paymentTimingDays === undefined
      ? {}
      : { paymentTimingDays: input.paymentTimingDays }),
    ...(disputeResolution === undefined ? {} : { disputeResolution }),
    terms: Object.freeze(normalizedTerms),
  };
  if (result.terms.length === 0) {
    throw new Error(
      "Normalized negotiation terms are empty; expected at least one owned term.",
    );
  }
  return Object.freeze(result);
}

export function normalizedTermsFromOptimizerProposal(
  proposal: OptimizerProposal,
  currency: string,
): NormalizedTerms {
  if (!Number.isFinite(proposal.valuation) || proposal.valuation < 0) {
    throw new Error(
      `Optimizer valuation "${proposal.valuation}" is invalid; expected a non-negative finite amount.`,
    );
  }
  return createNormalizedTerms({
    currency,
    // MAI-20 produces a continuous optimization amount; negotiation persists
    // its explicit conversion to the currency's smallest unit.
    valuation: { minorUnits: Math.round(proposal.valuation), currency },
    cashPercentageBps: fractionToBasisPoints(proposal.cashPercentage),
    equityPercentageBps: fractionToBasisPoints(proposal.equityPercentage),
    earnOutPercentageBps: fractionToBasisPoints(proposal.earnOutPercentage),
    escrowPercentageBps: fractionToBasisPoints(proposal.escrowPercentage),
    earnOutTargetMonths: Math.round(proposal.earnOutTargetYears * 12),
    nonCompeteMonths: proposal.nonCompeteMonths,
  });
}

export function compareNormalizedTerms(
  expected: NormalizedTerms,
  actual: NormalizedTerms,
): readonly NormalizedTermDifference[] {
  const keys = new Set<NormalizedTermKey>([
    ...expected.terms.map((value) => value.key),
    ...actual.terms.map((value) => value.key),
  ]);
  return [...keys].sort().flatMap((key) => {
    const left = expected.terms.find((value) => value.key === key);
    const right = actual.terms.find((value) => value.key === key);
    if (
      left?.value === right?.value && left?.unit === right?.unit &&
      left?.currency === right?.currency
    ) return [];
    return [{ key, expected: left, actual: right }];
  });
}

export function termValue(
  terms: NormalizedTerms,
  key: NormalizedTermKey,
): NormalizedTerm | undefined {
  return terms.terms.find((termValue) => termValue.key === key);
}

export function serializeNormalizedTerms(
  terms: NormalizedTerms,
): Readonly<Record<string, unknown>> {
  return {
    schemaVersion: terms.schemaVersion,
    currency: terms.currency,
    ...(terms.valuation === undefined ? {} : { valuation: terms.valuation }),
    ...(terms.cashPercentageBps === undefined
      ? {}
      : { cashPercentageBps: terms.cashPercentageBps }),
    ...(terms.equityPercentageBps === undefined
      ? {}
      : { equityPercentageBps: terms.equityPercentageBps }),
    ...(terms.earnOutPercentageBps === undefined
      ? {}
      : { earnOutPercentageBps: terms.earnOutPercentageBps }),
    ...(terms.escrowPercentageBps === undefined
      ? {}
      : { escrowPercentageBps: terms.escrowPercentageBps }),
    ...(terms.earnOutTargetMonths === undefined
      ? {}
      : { earnOutTargetMonths: terms.earnOutTargetMonths }),
    ...(terms.nonCompeteMonths === undefined
      ? {}
      : { nonCompeteMonths: terms.nonCompeteMonths }),
    ...(terms.paymentTimingDays === undefined
      ? {}
      : { paymentTimingDays: terms.paymentTimingDays }),
    ...(terms.disputeResolution === undefined
      ? {}
      : { disputeResolution: terms.disputeResolution }),
    terms: terms.terms,
  };
}

function optionalTerm(
  key: NormalizedTermKey,
  value: number | undefined,
  unit: NormalizedTermUnit,
): readonly NormalizedTerm[] {
  return value === undefined ? [] : [term(key, value, unit)];
}

function term(
  key: NormalizedTermKey,
  value: number,
  unit: NormalizedTermUnit,
  currency?: string,
): NormalizedTerm {
  return { key, value, unit, ...(currency === undefined ? {} : { currency }) };
}

function normalizeTerm(
  value: NormalizedTerm,
  currency: string,
): NormalizedTerm {
  if (
    !Object.hasOwn(TERM_UNITS, value.key) ||
    TERM_UNITS[value.key] !== value.unit
  ) {
    throw new Error(
      `Normalized term "${value.key}" uses unit "${value.unit}"; expected "${
        TERM_UNITS[value.key]
      }".`,
    );
  }
  if (!Number.isSafeInteger(value.value) || value.value < 0) {
    throw new Error(
      `Normalized term "${value.key}" value "${value.value}" is invalid; expected a non-negative safe integer.`,
    );
  }
  if (value.unit === "minor_units" && value.currency !== currency) {
    throw new Error(
      `Normalized valuation currency "${value.currency}" does not match terms currency "${currency}".`,
    );
  }
  assertExactKeys(
    value,
    ["key", "value", "unit", "currency"],
    `normalized term "${value.key}"`,
  );
  return Object.freeze({
    key: value.key,
    value: value.value,
    unit: value.unit,
    ...(value.currency === undefined ? {} : { currency: value.currency }),
  });
}

function deduplicateTerms(
  terms: readonly NormalizedTerm[],
): readonly NormalizedTerm[] {
  const byKey = new Map<NormalizedTermKey, NormalizedTerm>();
  for (const value of terms) {
    const existing = byKey.get(value.key);
    if (
      existing !== undefined &&
      (existing.value !== value.value || existing.unit !== value.unit ||
        existing.currency !== value.currency)
    ) {
      throw new Error(
        `Normalized term "${value.key}" was supplied more than once with different values; expected one canonical value.`,
      );
    }
    if (existing === undefined) byKey.set(value.key, value);
  }
  return Object.freeze([...byKey.values()]);
}

const TERM_UNITS: Readonly<Record<NormalizedTermKey, NormalizedTermUnit>> = {
  valuation: "minor_units",
  cash_percentage: "basis_points",
  equity_percentage: "basis_points",
  earn_out_percentage: "basis_points",
  escrow_percentage: "basis_points",
  earn_out_target_months: "months",
  non_compete_months: "months",
  payment_timing_days: "days",
};

function assertCurrency(value: string): void {
  if (/^[A-Z]{3}$/.test(value)) return;
  throw new Error(
    `Negotiation currency "${value}" is invalid; expected ISO-4217 uppercase code.`,
  );
}

function assertMoney(value: NegotiationMoney): void {
  assertCurrency(value.currency);
  if (Number.isSafeInteger(value.minorUnits) && value.minorUnits >= 0) return;
  throw new Error(
    `Negotiation money "${value.minorUnits}" is invalid; expected a non-negative safe integer.`,
  );
}

function assertBasisPoints(value: number | undefined, label: string): void {
  if (value === undefined) return;
  if (Number.isSafeInteger(value) && value >= 0 && value <= 10_000) return;
  throw new Error(
    `${label} "${value}" is invalid; expected basis points from 0 through 10000.`,
  );
}

function assertNonNegativeInteger(
  value: number | undefined,
  label: string,
): void {
  if (value === undefined) return;
  if (Number.isSafeInteger(value) && value >= 0) return;
  throw new Error(
    `${label} "${value}" is invalid; expected a non-negative safe integer.`,
  );
}

function fractionToBasisPoints(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(
      `Optimizer percentage "${value}" is invalid; expected a fraction from 0 through 1.`,
    );
  }
  return Math.round(value * 10_000);
}

function isVersionedDisputeResolution(
  value: DisputeResolution | VersionedDisputeResolution,
): value is VersionedDisputeResolution {
  return typeof value === "object" && value !== null &&
    "schemaVersion" in value && "mechanism" in value;
}

function assertExactKeys(
  value: object,
  allowed: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (keys.every((key) => allowed.includes(key))) return;
  const unknown = keys.find((key) => !allowed.includes(key));
  throw new Error(
    `Invalid ${label}; unknown field "${
      unknown ?? "<unknown>"
    }" is not permitted.`,
  );
}
