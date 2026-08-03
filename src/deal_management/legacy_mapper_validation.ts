import type { DealScope } from "./contracts.ts";
import {
  type LegacyDealRecord,
  type LegacyMappingIssue,
  type LegacyMappingResult,
} from "./legacy_contracts.ts";
import { dealId } from "./ids.ts";

type LegacyErrorKind = Exclude<LegacyMappingResult["kind"], "mapped">;

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
  if (
    record.tenantId !== undefined && record.tenantId !== scope.tenantId ||
    record.workspaceId !== undefined && record.workspaceId !== scope.workspaceId
  ) {
    return {
      kind: "conflict",
      issue: issue(
        "SCOPE_MISMATCH",
        record,
        `${record.tenantId ?? "undefined"}/${
          record.workspaceId ?? "undefined"
        }`,
        `${scope.tenantId}/${scope.workspaceId}`,
        "Legacy record scope does not match the operator-provided trusted scope.",
      ),
    };
  }
  const required: readonly [string, string | undefined, string][] = [
    ["name", record.name, "a non-empty Deal name"],
    ["dealType", record.dealType, "a supported legacy Deal type"],
    [
      "confidentiality",
      record.confidentiality,
      "an explicit Deal confidentiality",
    ],
    ["currency", record.currency, "an uppercase ISO-style 3-letter currency"],
  ];
  for (const [field, value, expected] of required) {
    if (value !== undefined && value.trim().length > 0) continue;
    return {
      kind: "invalid_legacy_record",
      issue: issue(
        "MISSING_REQUIRED_FIELD",
        record,
        value ?? "undefined",
        `${field}: ${expected}`,
        `Legacy Deal field "${field}" is missing or empty.`,
      ),
    };
  }
  if (!/^[A-Z]{3}$/.test(record.currency!)) {
    return {
      kind: "invalid_legacy_record",
      issue: issue(
        "INVALID_CURRENCY",
        record,
        record.currency!,
        "an uppercase ISO-style 3-letter currency",
        "Legacy currency is not safe to use as the authoritative Deal currency.",
      ),
    };
  }
  return undefined;
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
): LegacyMappingResult {
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
  return {
    code,
    legacyDealId: record.legacyDealId,
    received,
    expected,
    explanation,
    operatorInterventionRequired: true,
    retrySafe: code !== "SCOPE_MISMATCH" && code !== "RECONCILIATION_DRIFT",
  };
}

/**
 * Derives a stable authoritative Deal identity from legacy source identity.
 *
 * @example const id = await stableDealIdentity(record)
 */
export async function stableDealIdentity(
  record: LegacyDealRecord,
): Promise<ReturnType<typeof dealId>> {
  const bytes = new TextEncoder().encode(
    `${record.source}\u0000${record.legacyDealId}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
  return dealId(`deal_legacy-${hex.slice(0, 48)}`);
}

/**
 * Hashes the complete legacy record for drift detection on retry.
 *
 * @example const fingerprint = await sourceFingerprint(record)
 */
export async function sourceFingerprint(
  record: LegacyDealRecord,
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Produces a bounded slug for deterministic IDs and reconciliation keys.
 *
 * @example const slug = shortSlug("legacy deal/1")
 */
export function shortSlug(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized.slice(0, 36) || "record";
}
