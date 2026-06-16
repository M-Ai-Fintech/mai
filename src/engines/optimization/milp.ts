// src/engines/optimization/milp.ts
import { HighsWasmSolver } from "./highs.ts";

export interface MATarget {
  id: string;
  name: string;
  synergyValue: number; // V_i (Maximization target)
  acquisitionCost: number; // C_i (Budget cost)
  kycRiskIndex: number; // R_i (Compliance/Risk indicator)
}

export interface MILPConfig {
  budgetLimit: number;
  riskToleranceLimit: number;
  mutualExclusions?: Array<[string, string]>;
}

export interface MILPResult {
  selectedTargetIds: string[];
  totalSynergy: number;
  totalCostSpent: number;
  status: string;
}

export class MILPOptimizer {
  /**
   * Solves the deal-matching portfolio problem using HiGHS MILP.
   */
  public static async optimizePortfolio(
    targets: MATarget[],
    config: MILPConfig
  ): Promise<MILPResult> {
    if (targets.length === 0) {
      return { selectedTargetIds: [], totalSynergy: 0, totalCostSpent: 0, status: "empty" };
    }

    // Build CPLEX LP string
    const lpLines: string[] = [];
    
    // 1. Objective function
    lpLines.push("Maximize");
    const objTerms = targets.map(t => `${t.synergyValue} x_${t.id}`).join(" + ");
    lpLines.push(`  obj: ${objTerms}`);
    
    // 2. Constraints
    lpLines.push("Subject To");
    
    // Capital constraint
    const capTerms = targets.map(t => `${t.acquisitionCost} x_${t.id}`).join(" + ");
    lpLines.push(`  capital: ${capTerms} <= ${config.budgetLimit}`);
    
    // Risk constraints (one per target)
    for (const target of targets) {
      lpLines.push(`  risk_${target.id}: ${target.kycRiskIndex} x_${target.id} <= ${config.riskToleranceLimit}`);
    }
    
    // Mutual exclusions constraints
    if (config.mutualExclusions) {
      let idx = 1;
      for (const [idA, idB] of config.mutualExclusions) {
        if (targets.some(t => t.id === idA) && targets.some(t => t.id === idB)) {
          lpLines.push(`  exclude_${idx}: x_${idA} + x_${idB} <= 1`);
          idx++;
        }
      }
    }
    
    // 3. Bounds (binary variables, so 0 <= x_i <= 1)
    lpLines.push("Bounds");
    for (const target of targets) {
      lpLines.push(`  0 <= x_${target.id} <= 1`);
    }
    
    // 4. Declare variables as binaries
    lpLines.push("Binaries");
    const varNames = targets.map(t => `x_${t.id}`).join(" ");
    lpLines.push(`  ${varNames}`);
    
    lpLines.push("End");
    
    const lpString = lpLines.join("\n");
    
    // Solve using the HiGHS WASM wrapper
    const solution = await HighsWasmSolver.solveLP(lpString);
    
    const selectedTargetIds: string[] = [];
    let totalCostSpent = 0;
    
    for (const target of targets) {
      const val = solution.vars[`x_${target.id}`];
      if (val && val > 0.5) {
        selectedTargetIds.push(target.id);
        totalCostSpent += target.acquisitionCost;
      }
    }
    
    return {
      selectedTargetIds,
      totalSynergy: solution.objective,
      totalCostSpent,
      status: solution.status,
    };
  }
}
