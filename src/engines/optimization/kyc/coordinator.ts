// src/engines/optimization/kyc/coordinator.ts
import solver from "npm:javascript-lp-solver";

export interface TargetRawInput {
  id: string;
  name: string;
  synergyValue: number;
  acquisitionCost: number;
  ebitda: number;
  revenue: number;
  totalAssets: number;
  totalLiabilities: number;
  operatingCashFlow: number;
  historicalVolatility: number;
  businessSector: string;
}

interface EvaluatedProfile {
  metrics: { insolvencyRisk: number };
}

export class KYCValuationsCoordinator {
  /**
   * Avalia perfis de risco e otimiza o portfólio de aquisições de M&A via MILP (HiGHS WASM / javascript-lp-solver).
   * Executa de forma assíncrona yieldable para liberar o event loop.
   */
  public static async evaluateAndOptimize(
    targets: TargetRawInput[],
    criteria: {
      budgetLimit: number;
      riskToleranceLimit: number;
      mutualExclusions?: string[][];
    },
  ): Promise<{
    optimization: { status: string; selectedTargetIds: string[] };
    totalSynergy: number;
    totalCost: number;
    evaluatedProfiles: Record<string, EvaluatedProfile>;
  }> {
    // Step 1: Evaluate risk profiles for each target
    const evaluatedProfiles: Record<string, EvaluatedProfile> = {};
    const eligibleTargets: TargetRawInput[] = [];

    for (const t of targets) {
      evaluatedProfiles[t.id] = {
        metrics: { insolvencyRisk: t.historicalVolatility },
      };
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

    // Yield para o Event Loop para manter a CLI responsiva antes do solve
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Step 2: Build and solve MILP model with javascript-lp-solver
    const variables: Record<string, any> = {};
    const ints: Record<string, 1 | 0> = {};
    const constraints: Record<string, any> = {
      budget: { max: criteria.budgetLimit },
    };

    if (criteria.mutualExclusions) {
      criteria.mutualExclusions.forEach((_pair, index) => {
        constraints[`exclusion_${index}`] = { max: 1 };
      });
    }

    eligibleTargets.forEach((t) => {
      const varDef: Record<string, number> = {
        budget: t.acquisitionCost,
        synergy: t.synergyValue,
        [t.id]: 1,
      };
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

    const model = {
      optimize: "synergy",
      opType: "max" as const,
      constraints,
      variables,
      ints,
    };

    const solution = solver.Solve(model) as any;

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
