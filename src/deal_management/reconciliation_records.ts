import type { Deal, DealScope } from "./contracts.ts";
import type {
  DealReconciliationRecord,
  LegacyDealRecord,
  LegacyMappingIssue,
  LegacyMappingResult,
  ReconciliationOutcome,
  ReconciliationStatus,
} from "./legacy_contracts.ts";
import { reconciliationRecordId } from "./migration_identity.ts";
import { boundedIssueEvidence } from "./issue_evidence.ts";

/**
 * Builds persisted reconciliation state for one mapped legacy Deal.
 *
 * @example reconciliationRecord(record, scope, mapping, "pending", now)
 */
export async function reconciliationRecord(
  legacyRecord: LegacyDealRecord,
  scope: DealScope,
  mapping: Extract<LegacyMappingResult, { readonly kind: "mapped" }>,
  status: ReconciliationStatus,
  updatedAt: string,
): Promise<DealReconciliationRecord> {
  return {
    recordId: await recordIdFor(legacyRecord),
    scope,
    legacySource: legacyRecord.source,
    legacyDealId: legacyRecord.legacyDealId,
    authoritativeDealId: mapping.authoritativeDealId,
    sourceFingerprint: mapping.sourceFingerprint,
    intendedDeal: mapping.deal,
    status,
    routingMode: status === "verified" ? "authoritative" : "legacy",
    updatedAt,
  };
}

/**
 * Detects source-content drift against persisted reconciliation evidence.
 *
 * @example const issue = sourceConflict(previous, mapping)
 */
export function sourceConflict(
  previous: DealReconciliationRecord | undefined,
  mapping: LegacyMappingResult,
): LegacyMappingIssue | undefined {
  if (
    previous === undefined || mapping.kind !== "mapped" ||
    previous.sourceFingerprint === undefined
  ) return undefined;
  if (previous.sourceFingerprint === mapping.sourceFingerprint) {
    return undefined;
  }
  return {
    ...boundedIssueEvidence({
      code: "RECONCILIATION_DRIFT",
      legacyDealId: mapping.legacyDealId,
      received: "source fingerprint differs",
      expected: "persisted source fingerprint",
      receivedContent: mapping.sourceFingerprint,
      expectedContent: previous.sourceFingerprint,
      explanation:
        "Legacy content changed after reconciliation; operator review is required before retry.",
      retrySafe: false,
    }),
  };
}

/**
 * Classifies whether a mapping issue requires conflict intervention.
 *
 * @example const status = statusForIssue(issue)
 */
export function statusForIssue(
  issue: LegacyMappingIssue,
): "conflict" | "rejected" {
  return issue.code === "SCOPE_MISMATCH" || issue.code === "DUPLICATE_PARTY" ||
      issue.code === "AUTHORITY_EXCEEDS_MANDATE" ||
      issue.code === "RECONCILIATION_DRIFT"
    ? "conflict"
    : "rejected";
}

/**
 * Creates a non-persisted dry-run issue report.
 *
 * @example const outcome = dryRunIssue(record, issue, undefined, scope, now)
 */
export async function dryRunIssue(
  legacyRecord: LegacyDealRecord,
  issue: LegacyMappingIssue,
  previous: DealReconciliationRecord | undefined,
  scope: DealScope,
  updatedAt: string,
): Promise<ReconciliationOutcome> {
  const record = previous ?? {
    recordId: await recordIdFor(legacyRecord),
    scope,
    legacySource: legacyRecord.source,
    legacyDealId: legacyRecord.legacyDealId,
    status: statusForIssue(issue),
    routingMode: "legacy" as const,
    issue,
    updatedAt,
  };
  const diagnostic = previous === undefined ? record : { ...previous, issue };
  return {
    kind: statusForIssue(issue) === "conflict" ? "conflict" : "rejected",
    record: diagnostic,
  };
}

/**
 * Converts an apply exception into persisted operator evidence.
 *
 * @example const issue = applyIssue(record, error)
 */
export function applyIssue(
  record: LegacyDealRecord,
  error: unknown,
): LegacyMappingIssue {
  if (isAuthoritativeCollision(error)) return collisionIssue(record, error);
  return boundedIssueEvidence({
    code: "UNSUPPORTED_LEGACY_SHAPE",
    legacyDealId: record.legacyDealId,
    received: "provider or validation failure",
    expected: "a transactionally persisted, invariant-valid authoritative Deal",
    receivedContent: error instanceof Error ? error.message : String(error),
    explanation:
      "Apply failed; the stored status is retryable only after the operator reviews the recorded error.",
    operatorInterventionRequired: true,
    retrySafe: true,
  });
}

function isAuthoritativeCollision(error: unknown): error is Error {
  return error instanceof Error &&
    error.message.startsWith("Authoritative Deal");
}

function collisionIssue(
  record: LegacyDealRecord,
  error: Error,
): LegacyMappingIssue {
  return boundedIssueEvidence({
    code: "RECONCILIATION_DRIFT",
    legacyDealId: record.legacyDealId,
    received: "authoritative identity collision",
    expected:
      "an absent authoritative Deal or an exact persisted reconciliation claim",
    receivedContent: error.message,
    explanation:
      "The deterministic authoritative identity is already bound to incompatible state; no migration command was issued.",
    operatorInterventionRequired: true,
    retrySafe: false,
  });
}

/**
 * Creates drift evidence when persisted authoritative state differs.
 *
 * @example const issue = verificationIssue(record, persisted, intended)
 */
export function verificationIssue(
  record: LegacyDealRecord,
  applied: Deal | undefined,
  intended: Deal,
): LegacyMappingIssue {
  return boundedIssueEvidence({
    code: "RECONCILIATION_DRIFT",
    legacyDealId: record.legacyDealId,
    received: "persisted authoritative document",
    expected: "mapped source candidate",
    receivedContent: applied ?? "undefined",
    expectedContent: intended,
    explanation:
      "Persisted authoritative state differs from the mapped source candidate.",
    operatorInterventionRequired: true,
    retrySafe: false,
  });
}

/** Creates bounded operator evidence from exact atomic mismatch codes. */
export function verificationEvidenceIssue(
  record: LegacyDealRecord,
  mismatchCodes: readonly string[],
): LegacyMappingIssue {
  return boundedIssueEvidence({
    code: "RECONCILIATION_DRIFT",
    legacyDealId: record.legacyDealId,
    received: "durable evidence mismatch",
    expected: "exact reconciliation operation manifest",
    mismatchPaths: mismatchCodes,
    explanation: "Atomic verification found mismatched durable evidence.",
    operatorInterventionRequired: true,
    retrySafe: false,
  });
}

/**
 * Creates evidence when verification has no completed reconciliation record.
 *
 * @example const issue = missingVerificationIssue(record)
 */
export function missingVerificationIssue(
  record: LegacyDealRecord,
): LegacyMappingIssue {
  return boundedIssueEvidence({
    code: "MISSING_REQUIRED_FIELD",
    legacyDealId: record.legacyDealId,
    received: "undefined",
    expected: "a persisted verified reconciliation record",
    explanation:
      "Verification cannot confirm a Deal that has not completed reconciliation.",
    retrySafe: true,
  });
}

/**
 * Derives a bounded stable reconciliation record identifier.
 *
 * @example const id = recordIdFor(legacyRecord)
 */
export function recordIdFor(record: LegacyDealRecord): Promise<string> {
  return reconciliationRecordId(record);
}
