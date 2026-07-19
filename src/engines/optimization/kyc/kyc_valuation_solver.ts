// src/engines/optimization/kyc/kyc_valuation_solver.ts
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

export class PortfolioSolver {
  public static async evaluateAndOptimize(
    targets: TargetRawInput[],
    criteria: PortfolioCriteria,
  ): Promise<PortfolioResult> {
    const evaluatedProfiles: Record<
      string,
      { metrics: { insolvencyRisk: number } }
    > = {};
    const eligibleTargets: TargetRawInput[] = [];

    // Step 1: Pre-filter targets based on hard thresholds
    for (const t of targets) {
      evaluatedProfiles[t.id] = {
        metrics: { insolvencyRisk: t.historicalVolatility },
      };
      // Insolvency risk threshold constraint
      if (t.historicalVolatility <= criteria.riskToleranceLimit) {
        eligibleTargets.push(t);
      }
    }

    if (eligibleTargets.length === 0) {
      return {
        optimization: { status: "infeasible", selectedTargetIds: [] },
        totalSynergy: 0,
        totalCost: 0,
        evaluatedProfiles,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Step 2: Build MILP model
    const variables: Record<string, VariableCoefficients> = {};
    const ints: Record<string, 1 | 0> = {};
    const constraints: Record<string, ConstraintBound> = {
      budget: { max: criteria.budgetLimit },
      taxDebt: { max: criteria.taxDebtCap },
    };

    if (criteria.sectorAllocationCaps) {
      for (
        const [sector, cap] of Object.entries(criteria.sectorAllocationCaps)
      ) {
        constraints[`sector_${sector}`] = { max: cap };
      }
    }

    if (criteria.mutualExclusions) {
      criteria.mutualExclusions.forEach((_pair, index) => {
        constraints[`exclusion_${index}`] = { max: 1 };
      });
    }

    eligibleTargets.forEach((t) => {
      const varDef: Record<string, number> = {
        budget: t.acquisitionCost,
        synergy: t.synergyValue,
        taxDebt: t.taxDebtsAmount,
        [t.id]: 1,
      };

      if (
        criteria.sectorAllocationCaps &&
        t.businessSector in criteria.sectorAllocationCaps
      ) {
        varDef[`sector_${t.businessSector}`] = t.acquisitionCost; // Cap by acquisition cost or by count? Usually cap means budget allocation per sector. Let's assume cost.
      }

      constraints[t.id] = { max: 1 };

      if (criteria.mutualExclusions) {
        criteria.mutualExclusions.forEach(([idA, idB], index) => {
          if (t.id === idA || t.id === idB) {
            varDef[`exclusion_${index}`] = 1;
          }
        });
      }

      variables[t.id] = varDef;
      ints[t.id] = 1;
    });

    const model: Model = {
      optimize: "synergy",
      opType: "max" as const,
      constraints,
      variables,
      ints,
    };

    const typedSolver = solver as unknown as {
      Solve(input: Model): Record<string, number | boolean> & {
        feasible: boolean;
      };
    };
    const solution = typedSolver.Solve(model);

    const selectedTargetIds: string[] = [];
    let totalSynergy = 0;
    let totalCost = 0;

    if (solution.feasible) {
      eligibleTargets.forEach((t) => {
        if (solution[t.id] === 1) {
          selectedTargetIds.push(t.id);
          totalSynergy += t.synergyValue;
          totalCost += t.acquisitionCost;
        }
      });
    }

    return {
      optimization: {
        status: solution.feasible ? "optimal" : "infeasible",
        selectedTargetIds,
      },
      totalSynergy,
      totalCost,
      evaluatedProfiles,
    };
  }
}
