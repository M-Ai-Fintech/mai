import type {
  Deal,
  DealCommandContext,
  DealConfidentiality,
  DealPartyReference,
  DealPartySide,
  DealRoleName,
  DealScope,
} from "./contracts.ts";
import type { DealId } from "./ids.ts";

export interface LegacyDealRecord {
  readonly source: string;
  readonly legacyDealId: string;
  readonly tenantId?: string;
  readonly workspaceId?: string;
  readonly name?: string;
  readonly dealType?: string;
  readonly confidentiality?: DealConfidentiality;
  readonly currency?: string;
  readonly parties: readonly LegacyPartyRecord[];
  readonly team: readonly LegacyTeamMemberRecord[];
  readonly mandate?: LegacyMandateLike;
  readonly sourceUpdatedAt?: string;
  readonly sourceVersion?: string | number;
}

export interface LegacyPartyRecord {
  readonly legacyPartyId: string;
  readonly reference?: DealPartyReference;
  readonly referenceKind?: DealPartyReference["kind"];
  readonly side?: string;
  readonly label?: string;
}

export interface LegacyTeamMemberRecord {
  readonly legacyMemberId: string;
  readonly reference?: DealPartyReference;
  readonly referenceKind?: DealPartyReference["kind"];
  readonly assignmentRole?: string;
  readonly side?: string;
  readonly label?: string;
  readonly authorityLevel?: number;
}

export interface LegacyMandateLike {
  readonly transactionValueCeiling?: number;
  readonly currency?: string;
  readonly authorityCeiling?: number;
}

export interface LegacyReferenceResolver {
  resolve(input: {
    readonly source: string;
    readonly legacyReferenceId: string;
    readonly referenceKind: DealPartyReference["kind"];
  }): Promise<DealPartyReference | undefined>;
}

export interface LegacyDealSource {
  load(input: {
    readonly scope: DealScope;
    readonly legacyDealId: string;
  }): Promise<LegacyDealRecord | undefined>;
}

export type LegacyMappingIssueCode =
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_CURRENCY"
  | "UNSUPPORTED_DEAL_TYPE"
  | "DUPLICATE_PARTY"
  | "MISSING_UPSTREAM_REFERENCE"
  | "UNSUPPORTED_LEGACY_SHAPE"
  | "AUTHORITY_EXCEEDS_MANDATE"
  | "SCOPE_MISMATCH"
  | "RECONCILIATION_DRIFT";

export interface LegacyMappingIssue {
  readonly code: LegacyMappingIssueCode;
  readonly legacyDealId: string;
  readonly received: string;
  readonly expected: string;
  readonly explanation: string;
  readonly operatorInterventionRequired: boolean;
  readonly retrySafe: boolean;
}

export type LegacyMappingResult =
  | {
    readonly kind: "mapped";
    readonly legacyDealId: string;
    readonly authoritativeDealId: DealId;
    readonly sourceFingerprint: string;
    readonly deal: Deal;
  }
  | {
    readonly kind:
      | "invalid_legacy_record"
      | "missing_required_reference"
      | "unsupported_legacy_shape"
      | "conflict";
    readonly issue: LegacyMappingIssue;
  };

export interface LegacyDealMapper {
  map(input: {
    readonly record: LegacyDealRecord;
    readonly scope: DealScope;
    readonly now: string;
  }): Promise<LegacyMappingResult>;
}

export type ReconciliationMode = "dry-run" | "apply" | "resume";
export type ReconciliationStatus =
  | "pending"
  | "dry_run_valid"
  | "applied"
  | "verified"
  | "conflict"
  | "rejected"
  | "rollback_routed";
export type CompatibilityRoutingMode = "authoritative" | "legacy";

export interface DealReconciliationRecord {
  readonly recordId: string;
  readonly scope: DealScope;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId?: DealId;
  readonly sourceFingerprint?: string;
  readonly intendedDeal?: Deal;
  readonly status: ReconciliationStatus;
  readonly routingMode: CompatibilityRoutingMode;
  readonly issue?: LegacyMappingIssue;
  readonly updatedAt: string;
}

export interface RoutingChange {
  readonly scope: DealScope;
  readonly legacySource: string;
  readonly legacyDealId: string;
  readonly authoritativeDealId?: DealId;
  readonly previousMode: CompatibilityRoutingMode;
  readonly nextMode: CompatibilityRoutingMode;
  readonly actorId: string;
  readonly correlationId: string;
  readonly reason: string;
  readonly changedAt: string;
}

export interface DealReconciliationStore {
  find(input: {
    readonly scope: DealScope;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<DealReconciliationRecord | undefined>;
  findByAuthoritativeId(input: {
    readonly scope: DealScope;
    readonly authoritativeDealId: DealId;
  }): Promise<DealReconciliationRecord | undefined>;
  save(record: DealReconciliationRecord): Promise<void>;
  route(change: RoutingChange): Promise<DealReconciliationRecord>;
  listRoutingChanges(input: {
    readonly scope: DealScope;
    readonly legacySource: string;
    readonly legacyDealId: string;
  }): Promise<readonly RoutingChange[]>;
}

export interface ReconciliationRunResult {
  readonly mode: ReconciliationMode;
  readonly outcomes: readonly ReconciliationOutcome[];
}

export interface ReconciliationVerificationResult {
  readonly mode: "verify";
  readonly outcomes: readonly ReconciliationOutcome[];
}

export type ReconciliationOutcome =
  | {
    readonly kind: "mapped" | "already_reconciled" | "applied" | "verified";
    readonly record: DealReconciliationRecord;
  }
  | {
    readonly kind:
      | "skipped"
      | "conflict"
      | "rejected"
      | "invalid_legacy_record"
      | "missing_required_reference"
      | "unsupported_legacy_shape";
    readonly record: DealReconciliationRecord;
  };

export interface ReconciliationOperatorContext {
  readonly scope: DealScope;
  readonly actorId: string;
  readonly correlationId: string;
  readonly now: string;
  readonly commandContext: DealCommandContext;
}

/**
 * Checks whether a legacy party side is representable by Deal Management.
 *
 * @example isDealPartySide("target")
 */
export function isDealPartySide(value: string): value is DealPartySide {
  return ["acquirer", "target", "seller", "buyer", "advisor", "other"]
    .includes(value);
}

/**
 * Checks whether a legacy team assignment is representable as a Deal role.
 *
 * @example isDealRoleName("advisor")
 */
export function isDealRoleName(value: string): value is DealRoleName {
  return [
    "acquirer",
    "target",
    "seller",
    "buyer",
    "advisor",
    "counsel",
    "lender",
    "other",
  ].includes(value);
}
