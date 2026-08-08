import type { AggregateVersion } from "../platform/api/v1.ts";
import {
  assertNegotiationScope,
  type MandateId,
  mandateId,
  type NegotiationScope,
} from "./ids.ts";
import {
  type NormalizedTermKey,
  type NormalizedTerms,
  termValue,
} from "./terms.ts";

export type MandateConstraintOperator =
  | "minimum"
  | "maximum"
  | "equals"
  | "allowed_values";

export interface MandateConstraint {
  readonly id: string;
  readonly key: NormalizedTermKey;
  readonly operator: MandateConstraintOperator;
  readonly value: number | readonly number[];
  readonly unit: "minor_units" | "basis_points" | "months" | "days";
  readonly mandatory: boolean;
  readonly source: string;
}

export interface NegotiationMandate {
  readonly mandateId: MandateId;
  readonly scope: NegotiationScope;
  readonly version: AggregateVersion;
  readonly status: "draft" | "active" | "expired" | "superseded";
  readonly constraints: readonly MandateConstraint[];
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly createdAt: string;
}

export type MandateViolationCode =
  | "MISSING_TERM"
  | "BELOW_MINIMUM"
  | "ABOVE_MAXIMUM"
  | "NOT_EQUAL"
  | "NOT_ALLOWED"
  | "UNIT_MISMATCH";

export interface MandateViolation {
  readonly constraintId: string;
  readonly key: NormalizedTermKey;
  readonly code: MandateViolationCode;
  readonly mandatory: boolean;
  readonly expected: number | readonly number[] | string;
  readonly actual?: number;
  readonly unit: MandateConstraint["unit"];
}

export interface MandateComparison {
  readonly comparisonId: string;
  readonly mandateId: MandateId;
  readonly mandateVersion: AggregateVersion;
  readonly proposalVersionId: string;
  readonly outcome: "within_mandate" | "outside_mandate" | "indeterminate";
  readonly violations: readonly MandateViolation[];
  readonly comparedAt: string;
}

export function createMandate(input: {
  readonly mandateId: string;
  readonly scope: NegotiationScope;
  readonly constraints: readonly MandateConstraint[];
  readonly now: string;
  readonly status?: NegotiationMandate["status"];
}): NegotiationMandate {
  assertNegotiationScope(input.scope);
  assertInstant(input.now, "mandate creation time");
  if (input.constraints.length === 0) {
    throw new Error(
      `Mandate "${input.mandateId}" has no constraints; expected at least one explicit mandate rule.`,
    );
  }
  const constraints = input.constraints.map(validateConstraint);
  return Object.freeze({
    mandateId: mandateId(input.mandateId),
    scope: Object.freeze({ ...input.scope }),
    version: 1 as AggregateVersion,
    status: input.status ?? "draft",
    constraints: Object.freeze(constraints),
    createdAt: input.now,
  });
}

export function compareProposalToMandate(input: {
  readonly mandate: NegotiationMandate;
  readonly proposalVersionId: string;
  readonly terms: NormalizedTerms;
  readonly comparedAt: string;
}): MandateComparison {
  assertInstant(input.comparedAt, "mandate comparison time");
  if (input.mandate.status !== "active") {
    throw new Error(
      `Mandate "${input.mandate.mandateId}" is "${input.mandate.status}"; expected an active mandate for comparison.`,
    );
  }
  const violations = input.mandate.constraints.flatMap((constraint) => {
    const actual = termValue(input.terms, constraint.key);
    return actual === undefined
      ? [{
        constraintId: constraint.id,
        key: constraint.key,
        code: "MISSING_TERM" as const,
        mandatory: constraint.mandatory,
        expected: constraint.value,
        unit: constraint.unit,
      }]
      : actual.unit !== constraint.unit
      ? [{
        constraintId: constraint.id,
        key: constraint.key,
        code: "UNIT_MISMATCH" as const,
        mandatory: constraint.mandatory,
        expected: constraint.unit,
        actual: actual.value,
        unit: constraint.unit,
      }]
      : compareValue(constraint, actual.value);
  });
  const mandatoryViolations = violations.filter((violation) =>
    violation.mandatory
  );
  const outcome =
    mandatoryViolations.some((violation) => violation.code === "MISSING_TERM")
      ? "indeterminate"
      : mandatoryViolations.length > 0
      ? "outside_mandate"
      : "within_mandate";
  return Object.freeze({
    comparisonId: `mandate_comparison_${
      input.mandate.mandateId.slice("mandate_".length)
    }_${input.proposalVersionId}`,
    mandateId: input.mandate.mandateId,
    mandateVersion: input.mandate.version,
    proposalVersionId: input.proposalVersionId,
    outcome,
    violations: Object.freeze(violations),
    comparedAt: input.comparedAt,
  });
}

function compareValue(
  constraint: MandateConstraint,
  actual: number,
): readonly MandateViolation[] {
  const expected = constraint.value;
  if (
    constraint.operator === "minimum" && typeof expected === "number" &&
    actual < expected
  ) {
    return [violation(constraint, "BELOW_MINIMUM", actual)];
  }
  if (
    constraint.operator === "maximum" && typeof expected === "number" &&
    actual > expected
  ) {
    return [violation(constraint, "ABOVE_MAXIMUM", actual)];
  }
  if (constraint.operator === "equals" && actual !== expected) {
    return [violation(constraint, "NOT_EQUAL", actual)];
  }
  if (
    constraint.operator === "allowed_values" &&
    Array.isArray(expected) &&
    !expected.includes(actual)
  ) return [violation(constraint, "NOT_ALLOWED", actual)];
  return [];
}

function violation(
  constraint: MandateConstraint,
  code: Exclude<MandateViolationCode, "MISSING_TERM" | "UNIT_MISMATCH">,
  actual: number,
): MandateViolation {
  return {
    constraintId: constraint.id,
    key: constraint.key,
    code,
    mandatory: constraint.mandatory,
    expected: constraint.value,
    actual,
    unit: constraint.unit,
  };
}

function validateConstraint(constraint: MandateConstraint): MandateConstraint {
  if (!/^[a-z][a-z0-9_-]{0,127}$/.test(constraint.id)) {
    throw new Error(`Mandate constraint ID "${constraint.id}" is invalid.`);
  }
  if (!constraint.source.trim() || constraint.source.length > 256) {
    throw new Error(`Mandate constraint "${constraint.id}" source is invalid.`);
  }
  if (
    constraint.operator === "allowed_values" &&
    (!Array.isArray(constraint.value) || constraint.value.length === 0)
  ) {
    throw new Error(
      `Mandate constraint "${constraint.id}" requires allowed values.`,
    );
  }
  if (
    constraint.operator !== "allowed_values" &&
    (Array.isArray(constraint.value) || !Number.isSafeInteger(constraint.value))
  ) {
    throw new Error(
      `Mandate constraint "${constraint.id}" requires one safe integer value.`,
    );
  }
  if (
    Array.isArray(constraint.value) &&
    !constraint.value.every((value) => Number.isSafeInteger(value))
  ) {
    throw new Error(
      `Mandate constraint "${constraint.id}" allowed values are invalid.`,
    );
  }
  return Object.freeze({
    ...constraint,
    ...(Array.isArray(constraint.value)
      ? { value: Object.freeze([...constraint.value]) }
      : {}),
  });
}

function assertInstant(value: string, label: string): void {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && new Date(parsed).toISOString() === value) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected canonical UTC ISO-8601.`,
  );
}
