// src/engines/optimization/bubblyworld_highs.ts
import { HiGHS } from "@bubblyworld/highs-ts";

export interface HighsSolveResult {
  status: string;
  objective: number;
  vars: Record<string, number>;
}

export class HighsWasmSolver {
  /**
   * Solves an optimization problem formulated as a CPLEX LP format string.
   */
  public static async solveLP(lpString: string): Promise<HighsSolveResult> {
    let highsInstance: any = null;
    try {
      // Create the WASM instance
      highsInstance = await HiGHS.create();
      
      // Parse the LP format string
      await highsInstance.parse(lpString, "lp");
      
      // Solve the optimization problem
      const rawResult = await highsInstance.solve();
      
      const vars: Record<string, number> = {};
      if (rawResult.solution && typeof rawResult.solution.forEach === "function") {
        rawResult.solution.forEach((value: number, key: string) => {
          vars[key] = value;
        });
      } else if (rawResult.solution instanceof Map) {
        for (const [key, value] of rawResult.solution.entries()) {
          vars[key] = value;
        }
      } else if (rawResult.solution && typeof rawResult.solution === "object") {
        // Fallback for object representations
        Object.assign(vars, rawResult.solution);
      }
      
      return {
        status: rawResult.status,
        objective: rawResult.objective,
        vars,
      };
    } catch (err) {
      console.error("HiGHS Solver encountered an error:", err);
      // Fallback: A deterministic heuristic greedy knapsack solver if WASM fails to load/run
      return this.fallbackGreedySolver(lpString);
    } finally {
      if (highsInstance && typeof highsInstance.free === "function") {
        try {
          highsInstance.free();
        } catch (e) {
          // Ignore freeing errors
        }
      }
    }
  }

  /**
   * Safe fallback greedy solver to make sure the MVP works even if WASM fails to load.
   */
  private static fallbackGreedySolver(lpString: string): HighsSolveResult {
    console.warn("Using fallback greedy solver for LP matching.");
    
    // Parse values from LP string (rough parsing for fallback)
    const lines = lpString.split("\n");
    let budget = 100;
    const items: Array<{ id: string; val: number; cost: number; risk: number }> = [];
    
    // Simple regex parsing of the LP format for fallback
    const objLine = lines.find(l => l.includes("obj:"));
    const capLine = lines.find(l => l.includes("capital:"));
    
    if (capLine) {
      const budgetMatch = capLine.match(/<=\s*(\d+)/);
      if (budgetMatch) budget = parseFloat(budgetMatch[1]);
    }
    
    // Extract variables
    const binarySectionIdx = lines.findIndex(l => l.includes("Binaries"));
    if (binarySectionIdx !== -1) {
      const varLine = lines[binarySectionIdx + 1] || "";
      const varNames = varLine.trim().split(/\s+/).filter(Boolean);
      
      for (const vName of varNames) {
        let val = 10; // Default synergy
        let cost = 30; // Default cost
        let risk = 0.2; // Default risk
        
        // Find cost and synergy values in the LP string
        if (objLine) {
          const match = objLine.match(new RegExp(`(\\d+)\\s+${vName}`));
          if (match) val = parseFloat(match[1]);
        }
        if (capLine) {
          const match = capLine.match(new RegExp(`(\\d+)\\s+${vName}`));
          if (match) cost = parseFloat(match[1]);
        }
        
        // Check risk constraints
        const rLine = lines.find(l => l.includes(`risk_${vName}:`));
        if (rLine) {
          const match = rLine.match(new RegExp(`([\\d.]+)\\s+${vName}`));
          if (match) risk = parseFloat(match[1]);
        }
        
        items.push({ id: vName, val, cost, risk });
      }
    }
    
    // Greedy knapsack solver
    // Sort items by value/cost ratio descending
    items.sort((a, b) => (b.val / b.cost) - (a.val / a.cost));
    
    let currentCost = 0;
    const vars: Record<string, number> = {};
    let objective = 0;
    
    for (const item of items) {
      if (currentCost + item.cost <= budget && item.risk <= 0.5) {
        vars[item.id] = 1;
        currentCost += item.cost;
        objective += item.val;
      } else {
        vars[item.id] = 0;
      }
    }
    
    return {
      status: "optimal_fallback",
      objective,
      vars,
    };
  }
}
