import {
  type ConstraintExplanation,
  ELIGIBILITY_CONTRACT_VERSION,
  type InfeasibilityCode,
  LEGACY_ADAPTER_CONTRACT_VERSION,
  MATCHING_CONTRACT_VERSION,
  type MatchingCandidate,
  type RankingContract,
} from "./types.ts";
import type { NormalizedCriteria } from "./selection_input_validation.ts";

export function rankingContract(seed: number | undefined): RankingContract {
  return seed === undefined
    ? {
      contractVersion: MATCHING_CONTRACT_VERSION,
      objective: "synergyValue",
      direction: "maximize",
      tieBreaker: "candidate-id-ascending",
      tieBreakMethod: "lexicographic-reoptimization",
    }
    : {
      contractVersion: MATCHING_CONTRACT_VERSION,
      objective: "synergyValue",
      direction: "maximize",
      tieBreaker: "seeded-candidate-order",
      tieBreakMethod: "lexicographic-reoptimization",
      seed,
    };
}

export function orderCandidates(
  candidates: readonly MatchingCandidate[],
  seed: number | undefined,
): MatchingCandidate[] {
  // Canonical order is the sequence used by equal-optimum reoptimization.
  return [...candidates].sort((left, right) =>
    compareCandidates(left, right, seed)
  );
}

function compareCandidates(
  left: MatchingCandidate,
  right: MatchingCandidate,
  seed: number | undefined,
): number {
  if (seed === undefined) return compareText(left.id, right.id);
  const rankDifference = seededRank(left.id, seed) - seededRank(right.id, seed);
  return rankDifference || compareText(left.id, right.id);
}

function seededRank(id: string, seed: number): number {
  let hash = (2_166_136_261 ^ seed) >>> 0;
  for (const character of id) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function findPreconditionFailure(
  candidates: readonly MatchingCandidate[],
  criteria: NormalizedCriteria,
): ConstraintExplanation | undefined {
  if (criteria.minSelectionSize > criteria.maxSelectionSize) {
    return explanation(
      "SELECTION_SIZE_CONFLICT",
      "selection-size",
      "The minimum selection size exceeds the maximum selection size.",
    );
  }
  const mandatory = new Set(criteria.mandatoryCandidateIds);
  for (const id of criteria.mandatoryCandidateIds) {
    const candidate = candidates.find((item) => item.id === id);
    if (!candidate || !candidateIsEligible(candidate)) {
      return explanation(
        "MANDATORY_INCLUSION_UNAVAILABLE",
        "mandatory-inclusion",
        "A mandatory inclusion lacks a current eligible decision.",
      );
    }
    if (candidate.riskScore > criteria.riskThreshold) {
      return explanation(
        "MANDATORY_INCLUSION_RISK_EXCEEDED",
        "risk-threshold",
        "A mandatory inclusion exceeds the supplied risk threshold.",
      );
    }
    if (criteria.excludedCandidateIds.includes(id)) {
      return explanation(
        "MANDATORY_INCLUSION_EXCLUDED",
        "mandatory-inclusion",
        "A mandatory inclusion is also excluded by the supplied selection constraints.",
      );
    }
  }
  for (const [left, right] of criteria.mutualExclusions) {
    if (mandatory.has(left) && mandatory.has(right)) {
      return explanation(
        "MANDATORY_INCLUSION_CONFLICT",
        "mutual-exclusion",
        "Mandatory inclusions conflict with a mutual-exclusion constraint.",
      );
    }
  }
  return undefined;
}

export function eligibleCandidates(
  candidates: readonly MatchingCandidate[],
  criteria: NormalizedCriteria,
): MatchingCandidate[] {
  return candidates.filter((candidate) =>
    !criteria.excludedCandidateIds.includes(candidate.id) &&
    candidateIsEligible(candidate) &&
    candidate.riskScore <= criteria.riskThreshold
  );
}

function candidateIsEligible(candidate: MatchingCandidate): boolean {
  const eligibility = candidate.eligibility;
  if (eligibility.contractVersion === LEGACY_ADAPTER_CONTRACT_VERSION) {
    return eligibility.status === "legacy-compatible";
  }
  return eligibility.contractVersion === ELIGIBILITY_CONTRACT_VERSION &&
    eligibility.status === "eligible" &&
    eligibility.evidence.staleness === "current";
}

export function findCapacityFailure(
  eligible: readonly MatchingCandidate[],
  criteria: NormalizedCriteria,
): ConstraintExplanation | undefined {
  if (criteria.mandatoryCandidateIds.length > criteria.maxSelectionSize) {
    return explanation(
      "SELECTION_SIZE_CONFLICT",
      "selection-size",
      "Mandatory inclusions exceed the maximum selection size.",
    );
  }
  if (criteria.minSelectionSize > eligible.length) {
    return explanation(
      "MIN_SELECTION_UNREACHABLE",
      "selection-size",
      "The minimum selection size exceeds the eligible candidate count.",
    );
  }
  const mandatory = eligible.filter((candidate) =>
    criteria.mandatoryCandidateIds.includes(candidate.id)
  );
  const totalCost = sum(mandatory, (candidate) => candidate.acquisitionCost);
  if (totalCost > criteria.budgetLimit) {
    return explanation(
      "MANDATORY_INCLUSION_OVER_BUDGET",
      "budget",
      "Mandatory inclusions exceed the available budget.",
    );
  }
  const totalTaxDebt = sum(mandatory, (candidate) => candidate.taxDebt);
  if (totalTaxDebt > criteria.taxDebtCap) {
    return explanation(
      "MANDATORY_INCLUSION_OVER_TAX_DEBT_CAP",
      "tax-debt",
      "Mandatory inclusions exceed the tax-debt cap.",
    );
  }
  return sectorCapacityFailure(mandatory, criteria.sectorAllocationCaps);
}

function sectorCapacityFailure(
  mandatory: readonly MatchingCandidate[],
  caps: Readonly<Record<string, number>>,
): ConstraintExplanation | undefined {
  for (const [sector, cap] of Object.entries(caps)) {
    const cost = sum(
      mandatory.filter((candidate) => candidate.sector === sector),
      (candidate) => candidate.acquisitionCost,
    );
    if (cost > cap) {
      return explanation(
        "MANDATORY_INCLUSION_OVER_SECTOR_CAP",
        "sector-cap",
        "Mandatory inclusions exceed a sector allocation cap.",
      );
    }
  }
  return undefined;
}

export function explanation(
  code: InfeasibilityCode,
  constraint: ConstraintExplanation["constraint"],
  message: string,
): ConstraintExplanation {
  return { code, constraint, message };
}

function sum(
  candidates: readonly MatchingCandidate[],
  value: (candidate: MatchingCandidate) => number,
): number {
  return candidates.reduce((total, candidate) => total + value(candidate), 0);
}
