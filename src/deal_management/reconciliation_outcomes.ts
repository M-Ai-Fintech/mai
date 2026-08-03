import type { Deal } from "./contracts.ts";
import {
  type DealReconciliationRecord,
  type LegacyDealRecord,
  type LegacyMappingIssue,
  type LegacyMappingResult,
  type ReconciliationMode,
  type ReconciliationOperatorContext,
} from "./legacy_contracts.ts";
import { sameMappedDealIntent } from "./reconciliation_replay.ts";
import {
  missingVerificationIssue,
  reconciliationRecord,
  recordIdFor,
  sourceConflict,
  statusForIssue,
  verificationIssue,
} from "./reconciliation_records.ts";
import { boundedIssueEvidence } from "./issue_evidence.ts";

export type ReconciliationRunInput = {
  readonly mode: ReconciliationMode;
  readonly legacyDealId: string;
  readonly operator: ReconciliationOperatorContext;
};
export type ReconciliationIssueInput = Omit<ReconciliationRunInput, "mode"> & {
  readonly mode?: ReconciliationMode;
};

export function assertLegacySource(
  record: LegacyDealRecord,
  expectedSource: string | undefined,
): void {
  if (expectedSource === undefined || record.source === expectedSource) return;
  throw new Error(
    `Legacy Deal "${record.legacyDealId}" source "${record.source}" does not match selector source "${expectedSource}".`,
  );
}

export type MappedLegacyDeal = Extract<
  LegacyMappingResult,
  { readonly kind: "mapped" }
>;

export async function pendingReconciliation(
  record: LegacyDealRecord,
  input: ReconciliationRunInput,
  mapping: MappedLegacyDeal,
): Promise<DealReconciliationRecord> {
  return await reconciliationRecord(
    record,
    input.operator.scope,
    mapping,
    "pending",
    input.operator.now,
  );
}

export function appliedReconciliation(
  pending: DealReconciliationRecord,
  now: string,
): DealReconciliationRecord {
  return { ...pending, status: "applied", updatedAt: now };
}

export function verifiedReconciliation(
  applied: DealReconciliationRecord,
  now: string,
): DealReconciliationRecord {
  return {
    ...applied,
    status: "verified",
    routingMode: "authoritative",
    updatedAt: now,
  };
}

export function verificationPrecondition(
  record: LegacyDealRecord,
  mapping: MappedLegacyDeal,
  previous: DealReconciliationRecord | undefined,
): LegacyMappingIssue | undefined {
  const conflict = sourceConflict(previous, mapping);
  if (conflict !== undefined) return conflict;
  if (previous?.authoritativeDealId === undefined) {
    return missingVerificationIssue(record);
  }
  if (
    previous.intendedDeal !== undefined &&
    sameMappedDealIntent(previous.intendedDeal, mapping.deal)
  ) return;
  return verificationIssue(
    record,
    previous.intendedDeal ?? mapping.deal,
    mapping.deal,
  );
}

export async function issueRecord(
  legacyRecord: LegacyDealRecord,
  input: ReconciliationIssueInput,
  issue: LegacyMappingIssue,
  previous?: DealReconciliationRecord,
): Promise<DealReconciliationRecord> {
  return {
    recordId: previous?.recordId ?? await recordIdFor(legacyRecord),
    scope: input.operator.scope,
    legacySource: legacyRecord.source,
    legacyDealId: legacyRecord.legacyDealId,
    ...priorIdentity(previous),
    status: statusForIssue(issue),
    routingMode: previous?.routingMode ?? "legacy",
    issue,
    updatedAt: input.operator.now,
  };
}

function priorIdentity(
  previous?: DealReconciliationRecord,
): Partial<DealReconciliationRecord> {
  if (previous === undefined) return {};
  return {
    ...(previous.authoritativeDealId === undefined
      ? {}
      : { authoritativeDealId: previous.authoritativeDealId }),
    ...(previous.sourceFingerprint === undefined
      ? {}
      : { sourceFingerprint: previous.sourceFingerprint }),
    ...(previous.intendedDeal === undefined
      ? {}
      : { intendedDeal: previous.intendedDeal }),
  };
}

export function resumableClaim(
  previous: DealReconciliationRecord | undefined,
  mapping: MappedLegacyDeal,
): boolean {
  return previous?.authoritativeDealId === mapping.authoritativeDealId &&
    previous.sourceFingerprint === mapping.sourceFingerprint &&
    previous.status !== "dry_run_valid";
}

export function missingLegacyRecord(legacyDealId: string): LegacyDealRecord {
  return { source: "unknown", legacyDealId, parties: [], team: [] };
}

export function missingLegacyIssue(legacyDealId: string): LegacyMappingIssue {
  return boundedIssueEvidence({
    code: "MISSING_REQUIRED_FIELD",
    legacyDealId,
    received: "undefined",
    expected: "an existing legacy Deal record",
    explanation:
      "The legacy source returned no Deal for the requested identifier.",
    retrySafe: true,
  });
}

export function assertRoutable(
  record: DealReconciliationRecord | undefined,
  legacyDealId: string,
): asserts record is DealReconciliationRecord & {
  authoritativeDealId: Deal["id"];
} {
  if (record?.authoritativeDealId !== undefined) return;
  throw new Error(
    `Deal "${legacyDealId}" cannot change read routing; expected a reconciled authoritative identity in the requested scope.`,
  );
}

export function routingChange(
  input: {
    readonly legacySource: string;
    readonly legacyDealId: string;
    readonly operator: ReconciliationOperatorContext;
    readonly reason: string;
    readonly nextMode: "authoritative" | "legacy";
  },
  current: DealReconciliationRecord & { authoritativeDealId: Deal["id"] },
) {
  return {
    scope: input.operator.scope,
    legacySource: input.legacySource,
    legacyDealId: input.legacyDealId,
    authoritativeDealId: current.authoritativeDealId,
    previousMode: current.routingMode,
    nextMode: input.nextMode,
    actorId: input.operator.actorId,
    correlationId: input.operator.correlationId,
    reason: input.reason,
    changedAt: input.operator.now,
  };
}
