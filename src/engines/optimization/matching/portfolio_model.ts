import solver, {
  type ConstraintBound,
  type Model,
  type VariableCoefficients,
} from "javascript-lp-solver";
import {
  type ConstraintExplanation,
  MATCHING_CONTRACT_VERSION,
  type MatchingCandidate,
  type PortfolioSelectionResult,
  type RankingContract,
} from "./types.ts";
import type { NormalizedCriteria } from "./selection_input_validation.ts";
import { compareText } from "./selection_constraints.ts";

export interface SolverResult extends Record<string, number | boolean> {
  feasible: boolean;
}

export interface BuiltModel {
  readonly model: Model;
  readonly variableKeys: readonly string[];
}

export function buildModel(
  candidates: readonly MatchingCandidate[],
  criteria: NormalizedCriteria,
): BuiltModel {
  const constraints = baseConstraints(criteria);
  const variables: Record<string, VariableCoefficients> = {};
  const ints: Record<string, 1> = {};
  const sectorKeys = sectorConstraintKeys(criteria.sectorAllocationCaps);
  const variableKeys: string[] = [];
  candidates.forEach((candidate, index) => {
    const variableKey = `candidate_${index}`;
    variableKeys.push(variableKey);
    constraints[`pick_${index}`] = { max: 1 };
    variables[variableKey] = candidateCoefficients(
      candidate,
      index,
      criteria,
      sectorKeys,
    );
    ints[variableKey] = 1;
  });
  return {
    model: {
      optimize: "synergyValue",
      opType: "max",
      constraints,
      variables,
      ints,
    },
    variableKeys,
  };
}

function baseConstraints(
  criteria: NormalizedCriteria,
): Record<string, ConstraintBound> {
  const constraints: Record<string, ConstraintBound> = {
    budget: { max: criteria.budgetLimit },
    taxDebt: { max: criteria.taxDebtCap },
    selectionCount: {
      min: criteria.minSelectionSize,
      max: criteria.maxSelectionSize,
    },
  };
  addExclusionConstraints(constraints, criteria);
  addSectorConstraints(constraints, criteria);
  addMandatoryConstraints(constraints, criteria);
  return constraints;
}

function addExclusionConstraints(
  constraints: Record<string, ConstraintBound>,
  criteria: NormalizedCriteria,
): void {
  for (const [index] of criteria.mutualExclusions.entries()) {
    constraints[`exclusion_${index}`] = { max: 1 };
  }
}

function addSectorConstraints(
  constraints: Record<string, ConstraintBound>,
  criteria: NormalizedCriteria,
): void {
  for (
    const [index, sector] of Object.keys(criteria.sectorAllocationCaps).sort(
      compareText,
    ).entries()
  ) {
    constraints[`sector_${index}`] = {
      max: criteria.sectorAllocationCaps[sector],
    };
  }
}

function addMandatoryConstraints(
  constraints: Record<string, ConstraintBound>,
  criteria: NormalizedCriteria,
): void {
  for (const [index] of criteria.mandatoryCandidateIds.entries()) {
    constraints[`mandatory_${index}`] = { min: 1 };
  }
}

function sectorConstraintKeys(
  caps: Readonly<Record<string, number>>,
): Map<string, string> {
  return new Map(
    Object.keys(caps).sort(compareText).map((sector, index) => [
      sector,
      `sector_${index}`,
    ]),
  );
}

function candidateCoefficients(
  candidate: MatchingCandidate,
  index: number,
  criteria: NormalizedCriteria,
  sectorKeys: ReadonlyMap<string, string>,
): VariableCoefficients {
  const coefficients: VariableCoefficients = {
    synergyValue: candidate.synergyValue,
    budget: candidate.acquisitionCost,
    taxDebt: candidate.taxDebt,
    selectionCount: 1,
    [`pick_${index}`]: 1,
  };
  const sectorKey = sectorKeys.get(candidate.sector);
  if (sectorKey) coefficients[sectorKey] = candidate.acquisitionCost;
  addMandatoryCoefficient(
    coefficients,
    candidate,
    criteria.mandatoryCandidateIds,
  );
  addExclusionCoefficients(coefficients, candidate, criteria.mutualExclusions);
  return coefficients;
}

function addMandatoryCoefficient(
  coefficients: VariableCoefficients,
  candidate: MatchingCandidate,
  mandatoryIds: readonly string[],
): void {
  if (mandatoryIds.includes(candidate.id)) {
    coefficients[`mandatory_${mandatoryIds.indexOf(candidate.id)}`] = 1;
  }
}

function addExclusionCoefficients(
  coefficients: VariableCoefficients,
  candidate: MatchingCandidate,
  exclusions: readonly (readonly [string, string])[],
): void {
  exclusions.forEach(([left, right], index) => {
    if (candidate.id === left || candidate.id === right) {
      coefficients[`exclusion_${index}`] = 1;
    }
  });
}

export function solveModel(model: Model): SolverResult {
  const typedSolver = solver as unknown as {
    Solve(input: Model): SolverResult;
  };
  return typedSolver.Solve(model);
}

export function optimalResult(
  solution: SolverResult,
  variableKeys: readonly string[],
  candidates: readonly MatchingCandidate[],
  ranking: RankingContract,
): PortfolioSelectionResult {
  const selected = candidates.filter((_, index) =>
    Number(solution[variableKeys[index]]) >= 1
  );
  const selectedCandidateIds = selected.map((candidate) => candidate.id).sort(
    compareText,
  );
  return {
    contractVersion: MATCHING_CONTRACT_VERSION,
    status: "optimal",
    selectedCandidateIds,
    totals: {
      synergyValue: sum(selected, (candidate) => candidate.synergyValue),
      acquisitionCost: sum(selected, (candidate) => candidate.acquisitionCost),
      taxDebt: sum(selected, (candidate) => candidate.taxDebt),
      selectionCount: selected.length,
    },
    ranking,
    explanations: [],
    consideredCandidateCount: candidates.length,
  };
}

export function infeasibleResult(
  ranking: RankingContract,
  consideredCandidateCount: number,
  reason: ConstraintExplanation,
): PortfolioSelectionResult {
  return {
    contractVersion: MATCHING_CONTRACT_VERSION,
    status: "infeasible",
    selectedCandidateIds: [],
    totals: {
      synergyValue: 0,
      acquisitionCost: 0,
      taxDebt: 0,
      selectionCount: 0,
    },
    ranking,
    explanations: [reason],
    consideredCandidateCount,
  };
}

function sum(
  candidates: readonly MatchingCandidate[],
  value: (candidate: MatchingCandidate) => number,
): number {
  return candidates.reduce((total, candidate) => total + value(candidate), 0);
}
