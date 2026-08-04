import type { DealScope } from "./contracts.ts";
import {
  type LegacyDealRecord,
  type LegacyMappingIssue,
  type LegacyMappingResult,
} from "./legacy_contracts.ts";
import { boundedIssueEvidence } from "./issue_evidence.ts";

type LegacyErrorKind = Exclude<LegacyMappingResult["kind"], "mapped">;
type LegacyMappingFailure = Exclude<
  LegacyMappingResult,
  { readonly kind: "mapped" }
>;

/**
 * Validates legacy scope and required scalar fields before mapping.
 *
 * @example const issue = validateRecord(record, scope)
 */
export function validateRecord(
  record: LegacyDealRecord,
  scope: DealScope,
):
  | { readonly kind: LegacyErrorKind; readonly issue: LegacyMappingIssue }
  | undefined {
  const scopeIssue = validateScope(record, scope);
  if (scopeIssue !== undefined) return scopeIssue;
  const requiredIssue = validateRequiredFields(record);
  if (requiredIssue !== undefined) return requiredIssue;
  return validateCurrency(record);
}

function validateScope(record: LegacyDealRecord, scope: DealScope) {
  if (
    record.tenantId === scope.tenantId &&
    record.workspaceId === scope.workspaceId
  ) return;
  return issueResult(
    "conflict",
    issue(
      "SCOPE_MISMATCH",
      record,
      `${record.tenantId ?? "undefined"}/${record.workspaceId ?? "undefined"}`,
      `${scope.tenantId}/${scope.workspaceId}`,
      "Legacy record scope does not match the operator-provided trusted scope.",
    ),
  );
}

function validateRequiredFields(record: LegacyDealRecord) {
  for (const [field, value, expected] of requiredFields(record)) {
    if (value !== undefined && value.trim().length > 0) continue;
    return missingField(record, field, value, expected);
  }
}

function requiredFields(record: LegacyDealRecord) {
  return [
    ["name", record.name, "a non-empty Deal name"],
    ["dealType", record.dealType, "a supported legacy Deal type"],
    [
      "confidentiality",
      record.confidentiality,
      "an explicit Deal confidentiality",
    ],
    ["currency", record.currency, "an uppercase ISO-style 3-letter currency"],
  ] as const;
}

function missingField(
  record: LegacyDealRecord,
  field: string,
  value: string | undefined,
  expected: string,
) {
  return issueResult(
    "invalid_legacy_record",
    issue(
      "MISSING_REQUIRED_FIELD",
      record,
      value ?? "undefined",
      `${field}: ${expected}`,
      `Legacy Deal field "${field}" is missing or empty.`,
    ),
  );
}

function validateCurrency(record: LegacyDealRecord) {
  if (/^[A-Z]{3}$/.test(record.currency!)) return;
  return issueResult(
    "invalid_legacy_record",
    issue(
      "INVALID_CURRENCY",
      record,
      record.currency!,
      "an uppercase ISO-style 3-letter currency",
      "Legacy currency is not safe to use as the authoritative Deal currency.",
    ),
  );
}

/**
 * Converts an authoritative invariant failure into an explicit mapping issue.
 *
 * @example const outcome = invariantIssue(record, error)
 */
export function invariantIssue(
  record: LegacyDealRecord,
  error: unknown,
): LegacyMappingResult {
  const message = error instanceof Error ? error.message : String(error);
  return issueResult(
    "invalid_legacy_record",
    issue(
      "UNSUPPORTED_LEGACY_SHAPE",
      record,
      message,
      "a Deal aggregate satisfying all owned invariants",
      "Legacy values failed authoritative Deal validation.",
    ),
  );
}

/**
 * Keeps a typed mapping issue associated with its explicit outcome kind.
 *
 * @example return issueResult("conflict", problem)
 */
export function issueResult(
  kind: LegacyErrorKind,
  problem: LegacyMappingIssue,
): LegacyMappingFailure {
  if (
    kind !== "invalid_legacy_record" && kind !== "missing_required_reference" &&
    kind !== "unsupported_legacy_shape" && kind !== "conflict"
  ) return { kind: "invalid_legacy_record", issue: problem };
  return { kind, issue: problem };
}

/**
 * Creates safe operator-facing mapping evidence with retry guidance.
 *
 * @example const problem = issue("INVALID_CURRENCY", record, value, expected, explanation)
 */
export function issue(
  code: LegacyMappingIssue["code"],
  record: LegacyDealRecord,
  received: string,
  expected: string,
  explanation: string,
): LegacyMappingIssue {
  return boundedIssueEvidence({
    code,
    legacyDealId: record.legacyDealId,
    received,
    expected,
    explanation,
    operatorInterventionRequired: true,
    retrySafe: code !== "SCOPE_MISMATCH" && code !== "RECONCILIATION_DRIFT",
  });
}
