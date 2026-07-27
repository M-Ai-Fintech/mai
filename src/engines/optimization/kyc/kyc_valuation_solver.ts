import solver, {
  type ConstraintBound,
  type Model,
  type VariableCoefficients,
} from "javascript-lp-solver";
import {
  PortfolioCriteria,
  PortfolioResult,
  TargetRawInput,
} from "../types.ts";

type EvaluatedProfiles = PortfolioResult["evaluatedProfiles"];

export class PortfolioSolver {
  public static async evaluateAndOptimize(
    targets: TargetRawInput[],
    criteria: PortfolioCriteria,
  ): Promise<PortfolioResult> {
    const evaluatedProfiles = evaluateProfiles(targets);
    const eligible = eligibleTargets(targets, criteria);
    if (eligible.length === 0) return infeasibleResult(evaluatedProfiles);
    await Promise.resolve();
    const solution = solvePortfolio(buildModel(eligible, criteria));
    return portfolioResult(solution, eligible, evaluatedProfiles);
  }
}

function evaluateProfiles(targets: TargetRawInput[]): EvaluatedProfiles {
  return Object.fromEntries(
    targets.map((target) => [
      target.id,
      { metrics: { insolvencyRisk: target.historicalVolatility } },
    ]),
  );
}

function eligibleTargets(
  targets: TargetRawInput[],
  criteria: PortfolioCriteria,
): TargetRawInput[] {
  return targets.filter((target) =>
    target.historicalVolatility <= criteria.riskToleranceLimit
  );
}

function infeasibleResult(
  evaluatedProfiles: EvaluatedProfiles,
): PortfolioResult {
  return {
    optimization: { status: "infeasible", selectedTargetIds: [] },
    totalSynergy: 0,
    totalCost: 0,
    evaluatedProfiles,
  };
}

function buildModel(
  targets: TargetRawInput[],
  criteria: PortfolioCriteria,
): Model {
  const constraints = portfolioConstraints(criteria);
  const variables: Record<string, VariableCoefficients> = {};
  const ints: Record<string, 1 | 0> = {};
  for (const target of targets) {
    constraints[target.id] = { max: 1 };
    variables[target.id] = targetCoefficients(target, criteria);
    ints[target.id] = 1;
  }
  return { optimize: "synergy", opType: "max", constraints, variables, ints };
}

function portfolioConstraints(
  criteria: PortfolioCriteria,
): Record<string, ConstraintBound> {
  const constraints: Record<string, ConstraintBound> = {
    budget: { max: criteria.budgetLimit },
    taxDebt: { max: criteria.taxDebtCap },
  };
  for (
    const [sector, cap] of Object.entries(criteria.sectorAllocationCaps ?? {})
  ) {
    constraints[`sector_${sector}`] = { max: cap };
  }
  for (const [index] of (criteria.mutualExclusions ?? []).entries()) {
    constraints[`exclusion_${index}`] = { max: 1 };
  }
  return constraints;
}

function targetCoefficients(
  target: TargetRawInput,
  criteria: PortfolioCriteria,
): VariableCoefficients {
  const coefficients: Record<string, number> = {
    budget: target.acquisitionCost,
    synergy: target.synergyValue,
    taxDebt: target.taxDebtsAmount,
    [target.id]: 1,
  };
  if (criteria.sectorAllocationCaps?.[target.businessSector] !== undefined) {
    coefficients[`sector_${target.businessSector}`] = target.acquisitionCost;
  }
  addExclusionCoefficients(coefficients, target.id, criteria);
  return coefficients;
}

function addExclusionCoefficients(
  coefficients: Record<string, number>,
  targetId: string,
  criteria: PortfolioCriteria,
): void {
  (criteria.mutualExclusions ?? []).forEach(([left, right], index) => {
    if (targetId === left || targetId === right) {
      coefficients[`exclusion_${index}`] = 1;
    }
  });
}

type SolverResult = Record<string, number | boolean> & { feasible: boolean };

function solvePortfolio(model: Model): SolverResult {
  const typedSolver = solver as unknown as {
    Solve(input: Model): SolverResult;
  };
  return typedSolver.Solve(model);
}

function portfolioResult(
  solution: SolverResult,
  targets: TargetRawInput[],
  evaluatedProfiles: EvaluatedProfiles,
): PortfolioResult {
  const selected = solution.feasible
    ? targets.filter((target) => solution[target.id] === 1)
    : [];
  return {
    optimization: {
      status: solution.feasible ? "optimal" : "infeasible",
      selectedTargetIds: selected.map((target) => target.id),
    },
    totalSynergy: sum(selected, "synergyValue"),
    totalCost: sum(selected, "acquisitionCost"),
    evaluatedProfiles,
  };
}

function sum(
  targets: TargetRawInput[],
  field: "synergyValue" | "acquisitionCost",
): number {
  return targets.reduce((total, target) => total + target[field], 0);
}
