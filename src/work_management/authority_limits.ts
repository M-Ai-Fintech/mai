import type { WorkScope } from "./ids.ts";
import type { AuthorityFacts } from "./authority_facts.ts";
import {
  assertScope,
  type AuthorityLimit,
  WorkManagementError,
} from "./model.ts";

export type TypedAuthorityLimit =
  | { readonly kind: "amount_minor_ceiling"; readonly minorUnits: number }
  | { readonly kind: "currency"; readonly currency: string }
  | { readonly kind: "percentage_bps_ceiling"; readonly basisPoints: number }
  | { readonly kind: "mandate_required"; readonly required: true }
  | { readonly kind: "mandate_id"; readonly mandateId: string }
  | { readonly kind: "mandate_version"; readonly version: string }
  | { readonly kind: "category"; readonly category: string }
  | { readonly kind: "deal_scope"; readonly dealId: string };

export type AuthorityEvaluationReason =
  | "AUTHORITY_ALLOWED"
  | "AUTHORITY_WINDOW_INACTIVE"
  | "AMOUNT_FACT_MISSING"
  | "AMOUNT_CEILING_EXCEEDED"
  | "CURRENCY_FACT_MISSING"
  | "CURRENCY_MISMATCH"
  | "PERCENTAGE_FACT_MISSING"
  | "PERCENTAGE_CEILING_EXCEEDED"
  | "MANDATE_FACT_MISSING"
  | "MANDATE_INACTIVE"
  | "MANDATE_ID_MISMATCH"
  | "MANDATE_VERSION_MISMATCH"
  | "CATEGORY_FACT_MISSING"
  | "CATEGORY_MISMATCH"
  | "DEAL_SCOPE_MISMATCH";

export interface AuthorityLimitResult {
  readonly limit: TypedAuthorityLimit;
  readonly satisfied: boolean;
  readonly reason: AuthorityEvaluationReason;
}

/** Converts legacy name/value limits into a closed typed policy vocabulary. */
export function parseTypedAuthorityLimits(
  values: readonly AuthorityLimit[],
): readonly TypedAuthorityLimit[] {
  const limits = values.map(parseTypedAuthorityLimit);
  const duplicate = limits.find((limit, index) =>
    limits.findIndex((candidate) => candidate.kind === limit.kind) !== index
  );
  if (duplicate !== undefined) {
    throw invalidLimit(duplicate.kind, "a unique authority limit kind");
  }
  return Object.freeze(limits);
}

/** Evaluates every applicable limit and returns one result per limit. */
export function evaluateAuthorityLimits(
  limits: readonly TypedAuthorityLimit[],
  facts: AuthorityFacts,
): readonly AuthorityLimitResult[] {
  return Object.freeze(limits.map((limit) => evaluateLimit(limit, facts)));
}

function parseTypedAuthorityLimit(value: AuthorityLimit): TypedAuthorityLimit {
  switch (value.name) {
    case "amount_minor_ceiling":
      return {
        kind: value.name,
        minorUnits: integer(value, 0, Number.MAX_SAFE_INTEGER),
      };
    case "currency":
      return { kind: value.name, currency: currency(value) };
    case "percentage_bps_ceiling":
      return { kind: value.name, basisPoints: integer(value, 0, 10_000) };
    case "mandate_required":
      if (value.value === true) return { kind: value.name, required: true };
      throw invalidLimit(value.name, "the boolean true");
    case "mandate_id":
      return { kind: value.name, mandateId: text(value) };
    case "mandate_version":
      return { kind: value.name, version: text(value) };
    case "category":
      return { kind: value.name, category: text(value) };
    case "deal_scope":
      return { kind: value.name, dealId: text(value) };
    default:
      throw invalidLimit(value.name, "a supported typed authority limit");
  }
}

function evaluateLimit(
  limit: TypedAuthorityLimit,
  facts: AuthorityFacts,
): AuthorityLimitResult {
  switch (limit.kind) {
    case "amount_minor_ceiling":
      return amountResult(limit, facts);
    case "currency":
      return currencyResult(limit, facts);
    case "percentage_bps_ceiling":
      return percentageResult(limit, facts);
    case "mandate_required":
      return mandateRequiredResult(limit, facts);
    case "mandate_id":
      return mandateIdResult(limit, facts);
    case "mandate_version":
      return mandateVersionResult(limit, facts);
    case "category":
      return categoryResult(limit, facts);
    case "deal_scope":
      return result(
        limit,
        facts.scope.dealId === limit.dealId,
        "DEAL_SCOPE_MISMATCH",
      );
  }
}

function amountResult(
  limit: Extract<TypedAuthorityLimit, { kind: "amount_minor_ceiling" }>,
  facts: AuthorityFacts,
) {
  if (facts.amount === undefined) {
    return result(limit, false, "AMOUNT_FACT_MISSING");
  }
  return result(
    limit,
    facts.amount.minorUnits <= limit.minorUnits,
    "AMOUNT_CEILING_EXCEEDED",
  );
}

function currencyResult(
  limit: Extract<TypedAuthorityLimit, { kind: "currency" }>,
  facts: AuthorityFacts,
) {
  if (facts.amount === undefined) {
    return result(limit, false, "CURRENCY_FACT_MISSING");
  }
  return result(
    limit,
    facts.amount.currency === limit.currency,
    "CURRENCY_MISMATCH",
  );
}

function percentageResult(
  limit: Extract<TypedAuthorityLimit, { kind: "percentage_bps_ceiling" }>,
  facts: AuthorityFacts,
) {
  if (facts.percentageBasisPoints === undefined) {
    return result(limit, false, "PERCENTAGE_FACT_MISSING");
  }
  return result(
    limit,
    facts.percentageBasisPoints <= limit.basisPoints,
    "PERCENTAGE_CEILING_EXCEEDED",
  );
}

function mandateRequiredResult(
  limit: Extract<TypedAuthorityLimit, { kind: "mandate_required" }>,
  facts: AuthorityFacts,
) {
  if (facts.mandate === undefined) {
    return result(limit, false, "MANDATE_FACT_MISSING");
  }
  return result(limit, facts.mandate.active, "MANDATE_INACTIVE");
}

function mandateIdResult(
  limit: Extract<TypedAuthorityLimit, { kind: "mandate_id" }>,
  facts: AuthorityFacts,
) {
  if (facts.mandate === undefined) {
    return result(limit, false, "MANDATE_FACT_MISSING");
  }
  return result(
    limit,
    facts.mandate.mandateId === limit.mandateId,
    "MANDATE_ID_MISMATCH",
  );
}

function mandateVersionResult(
  limit: Extract<TypedAuthorityLimit, { kind: "mandate_version" }>,
  facts: AuthorityFacts,
) {
  if (facts.mandate === undefined) {
    return result(limit, false, "MANDATE_FACT_MISSING");
  }
  return result(
    limit,
    facts.mandate.version === limit.version,
    "MANDATE_VERSION_MISMATCH",
  );
}

function categoryResult(
  limit: Extract<TypedAuthorityLimit, { kind: "category" }>,
  facts: AuthorityFacts,
) {
  if (facts.category === undefined) {
    return result(limit, false, "CATEGORY_FACT_MISSING");
  }
  return result(limit, facts.category === limit.category, "CATEGORY_MISMATCH");
}

function result(
  limit: TypedAuthorityLimit,
  satisfied: boolean,
  deniedReason: AuthorityEvaluationReason,
): AuthorityLimitResult {
  return Object.freeze({
    limit: Object.freeze({ ...limit }),
    satisfied,
    reason: satisfied ? "AUTHORITY_ALLOWED" : deniedReason,
  });
}

function integer(
  limit: AuthorityLimit,
  minimum: number,
  maximum: number,
): number {
  if (
    Number.isSafeInteger(limit.value) && Number(limit.value) >= minimum &&
    Number(limit.value) <= maximum
  ) {
    return Number(limit.value);
  }
  throw invalidLimit(
    limit.name,
    `an integer from ${minimum} through ${maximum}`,
  );
}

function currency(limit: AuthorityLimit): string {
  const value = text(limit);
  if (/^[A-Z]{3}$/.test(value)) return value;
  throw invalidLimit(limit.name, "an uppercase ISO-4217 currency code");
}

function text(limit: AuthorityLimit): string {
  if (
    typeof limit.value === "string" && limit.value.trim().length > 0 &&
    limit.value.length <= 128
  ) return limit.value;
  throw invalidLimit(limit.name, "1-128 non-whitespace characters");
}

function invalidLimit(name: string, expected: string): WorkManagementError {
  return new WorkManagementError(
    "INVALID_INPUT",
    `Authority limit "${name}" is invalid; expected ${expected}.`,
  );
}

export function assertAuthorityFactScope(
  scope: WorkScope,
  facts: AuthorityFacts,
): void {
  assertScope(scope, facts.scope, "Authority evaluation facts");
}
