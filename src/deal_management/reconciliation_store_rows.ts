import type { DealScope } from "./contracts.ts";
import type { DealId } from "./ids.ts";
import { boundedIssueEvidence } from "./issue_evidence.ts";
import type {
  DealReconciliationRecord,
  LegacyMappingIssue,
  LegacyMappingIssueCode,
  RoutingChange,
} from "./legacy_contracts.ts";
import { parseStoredDeal } from "./read_model.ts";

export interface ReconciliationRow {
  readonly recordId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId: string | null;
  readonly sourceFingerprint: string | null;
  readonly intendedDocument: unknown;
  readonly status: DealReconciliationRecord["status"];
  readonly routingMode: RoutingChange["nextMode"];
  readonly issue: unknown;
  readonly updatedAt: Date | string;
}

export interface RoutingRow {
  readonly routingEventId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId: string | null;
  readonly previousMode: RoutingChange["previousMode"];
  readonly nextMode: RoutingChange["nextMode"];
  readonly actorId: string;
  readonly correlationId: string;
  readonly reason: string;
  readonly changedAt: Date | string;
}

export function toRecord(row: ReconciliationRow): DealReconciliationRecord {
  const intendedDeal = row.intendedDocument === null
    ? undefined
    : parseStoredDeal(row.intendedDocument);
  return {
    recordId: row.recordId,
    scope: rowScope(row),
    legacySource: row.legacySource,
    legacyDealId: row.legacyDealId,
    ...rowIdentity(row),
    ...(intendedDeal === undefined ? {} : { intendedDeal }),
    status: row.status,
    routingMode: row.routingMode,
    ...(row.issue === null
      ? {}
      : { issue: parseIssue(row.issue, row.legacyDealId) }),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function toRoutingChange(row: RoutingRow): RoutingChange {
  return {
    scope: rowScope(row),
    legacySource: row.legacySource,
    legacyDealId: row.legacyDealId,
    ...(row.authoritativeDealId === null
      ? {}
      : { authoritativeDealId: row.authoritativeDealId as DealId }),
    previousMode: row.previousMode,
    nextMode: row.nextMode,
    actorId: row.actorId,
    correlationId: row.correlationId,
    reason: row.reason,
    changedAt: new Date(row.changedAt).toISOString(),
  };
}

export function routedRecord(
  record: DealReconciliationRecord,
  change: RoutingChange,
): DealReconciliationRecord {
  return {
    ...record,
    authoritativeDealId: change.authoritativeDealId ??
      record.authoritativeDealId,
    status: change.nextMode === "legacy" ? "rollback_routed" : "verified",
    routingMode: change.nextMode,
    updatedAt: change.changedAt,
  };
}

export function recordKey(
  scope: DealScope,
  source: string,
  legacyDealId: string,
): string {
  return `${scope.tenantId}\u0000${scope.workspaceId}\u0000${source}\u0000${legacyDealId}`;
}

export function sameScope(left: DealScope, right: DealScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId;
}

function rowScope(row: ReconciliationRow | RoutingRow): DealScope {
  return {
    tenantId: row.tenantId as DealScope["tenantId"],
    workspaceId: row.workspaceId as DealScope["workspaceId"],
  };
}

function rowIdentity(row: ReconciliationRow) {
  return {
    ...(row.authoritativeDealId === null
      ? {}
      : { authoritativeDealId: row.authoritativeDealId as DealId }),
    ...(row.sourceFingerprint === null
      ? {}
      : { sourceFingerprint: row.sourceFingerprint }),
  };
}

function parseIssue(value: unknown, legacyDealId: string): LegacyMappingIssue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `Reconciliation issue for "${legacyDealId}" is invalid; expected a JSON object.`,
    );
  }
  const issue = value as Record<string, unknown>;
  if (!isIssueCode(issue.code)) {
    throw new Error(
      `Reconciliation issue for "${legacyDealId}" has unsupported code "${
        String(issue.code)
      }"; expected a supported issue code.`,
    );
  }
  return boundedIssueEvidence({
    code: issue.code,
    legacyDealId,
    received: issue.received,
    expected: issue.expected,
    explanation: typeof issue.explanation === "string"
      ? issue.explanation
      : "Persisted reconciliation evidence is available by code and digest.",
    mismatchPaths: stringArray(issue.mismatchPaths),
    receivedDigest: optionalString(issue.receivedDigest),
    expectedDigest: optionalString(issue.expectedDigest),
    operatorInterventionRequired: issue.operatorInterventionRequired === true,
    retrySafe: issue.retrySafe === true,
  });
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function isIssueCode(value: unknown): value is LegacyMappingIssueCode {
  return typeof value === "string" &&
    issueCodes.includes(value as LegacyMappingIssueCode);
}

const issueCodes: readonly LegacyMappingIssueCode[] = [
  "MISSING_REQUIRED_FIELD",
  "INCOMPLETE_MANDATE",
  "INVALID_CURRENCY",
  "UNSUPPORTED_DEAL_TYPE",
  "DUPLICATE_PARTY",
  "MISSING_UPSTREAM_REFERENCE",
  "UNSUPPORTED_LEGACY_SHAPE",
  "AUTHORITY_EXCEEDS_MANDATE",
  "SCOPE_MISMATCH",
  "RECONCILIATION_DRIFT",
];
