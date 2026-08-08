import type {
  CandidateEligibility,
  MatchingCandidate,
  PortfolioSelectionCriteria,
  PortfolioSelectionResult,
} from "../engines/optimization/matching/types.ts";
import type {
  ActorId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type {
  CandidateId,
  ConflictId,
  CriteriaId,
  OutreachAuthorizationId,
  RestrictionId,
  RunId,
  ShortlistDecisionId,
} from "./ids.ts";

export const MATCHING_SCHEMA_VERSION = 1 as const;
export const MATCHING_RESOURCE_KIND = "matching_candidate" as const;

export interface MatchingScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export type CriteriaState = "draft" | "active" | "superseded";
export type RunState =
  | "queued"
  | "running"
  | "succeeded"
  | "infeasible"
  | "failed"
  | "cancelled";
export type ConflictKind =
  | "duplicate"
  | "relationship"
  | "restricted_identity"
  | "manual";
export type ConflictState = "open" | "resolved" | "waived";
export type CandidateConflictState = "clear" | ConflictState;
export type RestrictionState = "active" | "cleared";
export type ShortlistDecisionState = "proposed" | "shortlisted" | "removed";
export type OutreachAuthorizationState = "authorized" | "revoked";

export interface MatchingCriteria {
  readonly aggregateType: "matching_criteria";
  readonly id: CriteriaId;
  readonly scope: MatchingScope;
  readonly version: number;
  readonly schemaVersion: typeof MATCHING_SCHEMA_VERSION;
  readonly state: CriteriaState;
  readonly optimizerContractVersion: string;
  readonly selection: PortfolioSelectionCriteria;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MatchingRun {
  readonly aggregateType: "matching_run";
  readonly id: RunId;
  readonly scope: MatchingScope;
  readonly version: number;
  readonly schemaVersion: typeof MATCHING_SCHEMA_VERSION;
  readonly criteriaId: CriteriaId;
  readonly criteriaVersion: number;
  readonly state: RunState;
  readonly result?: PortfolioSelectionResult;
  readonly requestedBy: ActorId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CandidateMetrics {
  readonly synergyValue: number;
  readonly acquisitionCost: number;
  readonly sector: string;
  readonly riskScore: number;
  readonly taxDebt: number;
}

export interface CandidateProjection {
  readonly aggregateType: "candidate_projection";
  readonly id: CandidateId;
  readonly scope: MatchingScope;
  readonly version: number;
  readonly schemaVersion: typeof MATCHING_SCHEMA_VERSION;
  readonly runId: RunId;
  readonly restrictedIdentityReference: string;
  readonly sourceReference: string;
  readonly metrics: CandidateMetrics;
  readonly eligibility: CandidateEligibility;
  readonly restrictionState: RestrictionState;
  readonly conflictState: CandidateConflictState;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MatchingConflict {
  readonly aggregateType: "matching_conflict";
  readonly id: ConflictId;
  readonly scope: MatchingScope;
  readonly version: number;
  readonly schemaVersion: typeof MATCHING_SCHEMA_VERSION;
  readonly candidateId: CandidateId;
  readonly kind: ConflictKind;
  readonly state: ConflictState;
  readonly rationale?: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CandidateRestriction {
  readonly aggregateType: "candidate_restriction";
  readonly id: RestrictionId;
  readonly scope: MatchingScope;
  readonly version: number;
  readonly schemaVersion: typeof MATCHING_SCHEMA_VERSION;
  readonly candidateId: CandidateId;
  readonly state: RestrictionState;
  readonly category: string;
  readonly createdBy: ActorId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ShortlistDecision {
  readonly aggregateType: "shortlist_decision";
  readonly id: ShortlistDecisionId;
  readonly scope: MatchingScope;
  readonly version: number;
  readonly schemaVersion: typeof MATCHING_SCHEMA_VERSION;
  readonly runId: RunId;
  readonly candidateId: CandidateId;
  readonly state: ShortlistDecisionState;
  readonly decidedBy: ActorId;
  readonly authoritySnapshotReference: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OutreachAuthorization {
  readonly aggregateType: "outreach_authorization";
  readonly id: OutreachAuthorizationId;
  readonly scope: MatchingScope;
  readonly version: number;
  readonly schemaVersion: typeof MATCHING_SCHEMA_VERSION;
  readonly shortlistDecisionId: ShortlistDecisionId;
  readonly candidateId: CandidateId;
  readonly state: OutreachAuthorizationState;
  readonly authorizedBy: ActorId;
  readonly authoritySnapshotReference: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type MatchingAggregate =
  | MatchingCriteria
  | MatchingRun
  | CandidateProjection
  | MatchingConflict
  | CandidateRestriction
  | ShortlistDecision
  | OutreachAuthorization;

export function createMatchingCriteria(input: {
  readonly id: CriteriaId;
  readonly scope: MatchingScope;
  readonly selection: PortfolioSelectionCriteria;
  readonly createdBy: ActorId;
  readonly now: Date;
  readonly optimizerContractVersion: string;
}): MatchingCriteria {
  assertScope(input.scope);
  assertNonEmpty(input.optimizerContractVersion, "optimizer contract version");
  assertSelection(input.selection);
  return freezeAggregate({
    aggregateType: "matching_criteria",
    id: input.id,
    scope: input.scope,
    version: 1,
    schemaVersion: MATCHING_SCHEMA_VERSION,
    state: "draft",
    optimizerContractVersion: input.optimizerContractVersion,
    selection: cloneSelection(input.selection),
    createdBy: input.createdBy,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function createMatchingRun(input: {
  readonly id: RunId;
  readonly scope: MatchingScope;
  readonly criteriaId: CriteriaId;
  readonly criteriaVersion: number;
  readonly requestedBy: ActorId;
  readonly now: Date;
}): MatchingRun {
  return freezeAggregate({
    aggregateType: "matching_run",
    id: input.id,
    scope: input.scope,
    version: 1,
    schemaVersion: MATCHING_SCHEMA_VERSION,
    criteriaId: input.criteriaId,
    criteriaVersion: input.criteriaVersion,
    state: "queued",
    requestedBy: input.requestedBy,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function createCandidateProjection(input: {
  readonly id: CandidateId;
  readonly scope: MatchingScope;
  readonly runId: RunId;
  readonly restrictedIdentityReference: string;
  readonly sourceReference: string;
  readonly candidate: MatchingCandidate;
  readonly now: Date;
}): CandidateProjection {
  if (input.candidate.id !== input.id) {
    throw new Error(
      `Candidate projection "${input.id}" does not match optimizer candidate "${input.candidate.id}"; expected one stable semantic candidate identity.`,
    );
  }
  assertMetrics(input.candidate);
  assertNonEmpty(
    input.restrictedIdentityReference,
    "restricted identity reference",
  );
  assertNonEmpty(input.sourceReference, "candidate source reference");
  return freezeAggregate({
    aggregateType: "candidate_projection",
    id: input.id,
    scope: input.scope,
    version: 1,
    schemaVersion: MATCHING_SCHEMA_VERSION,
    runId: input.runId,
    restrictedIdentityReference: input.restrictedIdentityReference,
    sourceReference: input.sourceReference,
    metrics: metricsOf(input.candidate),
    eligibility: input.candidate.eligibility,
    restrictionState: "cleared",
    conflictState: "clear",
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function candidateAsOptimizerInput(
  candidate: CandidateProjection,
): MatchingCandidate {
  return {
    id: candidate.id,
    ...candidate.metrics,
    eligibility: candidate.eligibility,
  };
}

export function candidateReadiness(
  candidate: CandidateProjection,
): "ready" | "restricted" | "conflicted" {
  if (candidate.restrictionState === "active") return "restricted";
  if (candidate.conflictState === "open") return "conflicted";
  return "ready";
}

export function sameMatchingScope(
  left: MatchingScope,
  right: MatchingScope,
): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function metricsOf(candidate: MatchingCandidate): CandidateMetrics {
  return {
    synergyValue: candidate.synergyValue,
    acquisitionCost: candidate.acquisitionCost,
    sector: candidate.sector,
    riskScore: candidate.riskScore,
    taxDebt: candidate.taxDebt,
  };
}

function cloneSelection(
  selection: PortfolioSelectionCriteria,
): PortfolioSelectionCriteria {
  return {
    ...selection,
    sectorAllocationCaps: selection.sectorAllocationCaps === undefined
      ? undefined
      : { ...selection.sectorAllocationCaps },
    excludedCandidateIds: selection.excludedCandidateIds === undefined
      ? undefined
      : [...selection.excludedCandidateIds],
    mutualExclusions: selection.mutualExclusions === undefined
      ? undefined
      : selection.mutualExclusions.map(([left, right]) => [left, right]),
    mandatoryCandidateIds: selection.mandatoryCandidateIds === undefined
      ? undefined
      : [...selection.mandatoryCandidateIds],
    mandatoryInclusions: selection.mandatoryInclusions === undefined
      ? undefined
      : [...selection.mandatoryInclusions],
  };
}

function freezeAggregate<T extends MatchingAggregate>(aggregate: T): T {
  return Object.freeze({
    ...aggregate,
    scope: Object.freeze({ ...aggregate.scope }),
  }) as unknown as T;
}

function assertScope(scope: MatchingScope): void {
  assertNonEmpty(scope.tenantId, "matching tenant ID");
  assertNonEmpty(scope.workspaceId, "matching workspace ID");
  assertNonEmpty(scope.dealId, "matching deal ID");
}

function assertSelection(selection: PortfolioSelectionCriteria): void {
  assertNonNegativeNumber(selection.budgetLimit, "matching budget limit");
  if (
    !Number.isFinite(selection.riskThreshold) || selection.riskThreshold < 0 ||
    selection.riskThreshold > 1
  ) {
    throw new Error(
      `Matching risk threshold "${selection.riskThreshold}" is invalid; expected a finite number between 0 and 1.`,
    );
  }
  assertNonNegativeNumber(selection.taxDebtCap, "matching tax debt cap");
}

function assertMetrics(candidate: MatchingCandidate): void {
  assertFiniteNumber(candidate.synergyValue, "candidate synergy value");
  assertNonNegativeNumber(
    candidate.acquisitionCost,
    "candidate acquisition cost",
  );
  assertNonNegativeNumber(candidate.riskScore, "candidate risk score");
  assertNonNegativeNumber(candidate.taxDebt, "candidate tax debt");
}

function assertFiniteNumber(value: number, label: string): void {
  if (Number.isFinite(value)) return;
  throw new Error(`${label} "${value}" is invalid; expected a finite number.`);
}

function assertNonNegativeNumber(value: number, label: string): void {
  if (Number.isFinite(value) && value >= 0) return;
  throw new Error(
    `${label} "${value}" is invalid; expected a finite non-negative number.`,
  );
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim()) return;
  throw new Error(`${label} "${value}" is invalid; expected non-empty text.`);
}
