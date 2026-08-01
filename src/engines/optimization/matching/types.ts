export const MATCHING_CONTRACT_VERSION = "matching-portfolio/v1" as const;
export const ELIGIBILITY_CONTRACT_VERSION = "matching-eligibility/v1" as const;
export const LEGACY_ADAPTER_CONTRACT_VERSION =
  "matching-legacy-adapter/v1" as const;

export type EligibilityStatus =
  | "eligible"
  | "ineligible"
  | "unavailable"
  | "unresolved"
  | "restricted"
  | "unauthorized";

export type EvidenceStaleness = "current" | "stale" | "unknown";

export interface EligibilityEvidence {
  readonly evidenceVersion: string;
  readonly findingId: string;
  readonly decisionRecordId: string;
  readonly policyVersion: string;
  readonly actorOrApprovalAuthority: string;
  readonly effectiveAt: string;
  readonly staleness: EvidenceStaleness;
}

export interface VersionedEligibility {
  readonly contractVersion: typeof ELIGIBILITY_CONTRACT_VERSION;
  readonly status: EligibilityStatus;
  readonly evidence: EligibilityEvidence;
}

export interface LegacyCompatibilityEligibility {
  readonly contractVersion: typeof LEGACY_ADAPTER_CONTRACT_VERSION;
  readonly status: "legacy-compatible";
}

export type CandidateEligibility =
  | VersionedEligibility
  | LegacyCompatibilityEligibility;

export interface MatchingCandidate {
  readonly id: string;
  readonly synergyValue: number;
  readonly acquisitionCost: number;
  readonly sector: string;
  readonly riskScore: number;
  readonly taxDebt: number;
  readonly eligibility: CandidateEligibility;
}

export interface PortfolioSelectionCriteria {
  readonly budgetLimit: number;
  readonly riskThreshold: number;
  readonly taxDebtCap: number;
  readonly sectorAllocationCaps?: Readonly<Record<string, number>>;
  readonly excludedCandidateIds?: readonly string[];
  readonly mutualExclusions?: readonly (readonly [string, string])[];
  readonly mandatoryCandidateIds?: readonly string[];
  readonly mandatoryInclusions?: readonly string[];
  readonly minSelectionSize?: number;
  readonly maxSelectionSize?: number;
  readonly minimumSelectionSize?: number;
  readonly maximumSelectionSize?: number;
  readonly seed?: number;
}

export interface PortfolioSelectionRequest {
  readonly candidates: readonly MatchingCandidate[];
  readonly criteria: PortfolioSelectionCriteria;
}

export type RankingTieBreaker =
  | "candidate-id-ascending"
  | "seeded-candidate-order";

export interface RankingContract {
  readonly contractVersion: typeof MATCHING_CONTRACT_VERSION;
  readonly objective: "synergyValue";
  readonly direction: "maximize";
  readonly tieBreaker: RankingTieBreaker;
  readonly seed?: number;
}

export type InfeasibilityCode =
  | "EMPTY_CANDIDATE_SET"
  | "NO_ELIGIBLE_CANDIDATES"
  | "MANDATORY_INCLUSION_UNAVAILABLE"
  | "MANDATORY_INCLUSION_EXCLUDED"
  | "MANDATORY_INCLUSION_RISK_EXCEEDED"
  | "MANDATORY_INCLUSION_CONFLICT"
  | "MANDATORY_INCLUSION_OVER_BUDGET"
  | "MANDATORY_INCLUSION_OVER_TAX_DEBT_CAP"
  | "MANDATORY_INCLUSION_OVER_SECTOR_CAP"
  | "SELECTION_SIZE_CONFLICT"
  | "MIN_SELECTION_UNREACHABLE"
  | "CONSTRAINT_CONFLICT";

export interface ConstraintExplanation {
  readonly code: InfeasibilityCode;
  readonly constraint:
    | "candidate-set"
    | "eligibility"
    | "risk-threshold"
    | "mandatory-inclusion"
    | "budget"
    | "tax-debt"
    | "sector-cap"
    | "selection-size"
    | "mutual-exclusion"
    | "combined";
  readonly message: string;
}

export interface PortfolioSelectionTotals {
  readonly synergyValue: number;
  readonly acquisitionCost: number;
  readonly taxDebt: number;
  readonly selectionCount: number;
}

export interface PortfolioSelectionResult {
  readonly contractVersion: typeof MATCHING_CONTRACT_VERSION;
  readonly status: "optimal" | "infeasible";
  readonly selectedCandidateIds: readonly string[];
  readonly totals: PortfolioSelectionTotals;
  readonly ranking: RankingContract;
  readonly explanations: readonly ConstraintExplanation[];
  readonly consideredCandidateCount: number;
}
