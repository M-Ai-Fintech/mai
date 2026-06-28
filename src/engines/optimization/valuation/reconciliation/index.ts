import type { ValuationReconciliationWeights } from "../../../../shared/types.ts";

export interface ReconciliationInput {
  readonly values: readonly number[];
  readonly weightsConfig: ValuationReconciliationWeights;
}

export interface ReconciliationOutput {
  readonly weights: readonly number[];
  readonly status: "optimal" | "fallback";
  readonly message?: string;
}

export class ReconciliationEngine {
  /**
   * Projects prior weights onto the simplex under box constraints.
   * Solves: min 0.5 * ||w - prior||^2 subject to sum(w_i) = 1 and min_i <= w_i <= max_i.
   * Uses a Lagrange multiplier bisection search.
   */
  public static reconcile(input: ReconciliationInput): ReconciliationOutput {
    const methods: (keyof ValuationReconciliationWeights)[] = [
      "bookValue",
      "dcf",
      "terminalValue",
      "marketCap",
      "enterpriseValue",
      "ebitdaValuation",
    ];

    const n = methods.length;

    const minWeights = methods.map((m) => input.weightsConfig[m].minWeight);
    const maxWeights = methods.map((m) => input.weightsConfig[m].maxWeight);
    const priorWeights = methods.map((m) => input.weightsConfig[m].priorWeight);

    // Feasibility Validation
    let sumMin = 0;
    let sumMax = 0;
    for (let i = 0; i < n; i++) {
      if (minWeights[i] > maxWeights[i]) {
        return this.getUniformFallback(
          minWeights,
          maxWeights,
          "Bounds error: minWeight > maxWeight",
        );
      }
      sumMin += minWeights[i];
      sumMax += maxWeights[i];
    }

    if (sumMin > 1.0 + 1e-9 || sumMax < 1.0 - 1e-9) {
      return this.getUniformFallback(
        minWeights,
        maxWeights,
        `Bounds error: Infeasible space. sum(min)=${
          sumMin.toFixed(4)
        }, sum(max)=${sumMax.toFixed(4)}`,
      );
    }

    // Binary search for Lagrange multiplier lambda
    // w_i = clip(prior_i - lambda, min_i, max_i)
    let lambdaMin = Math.min(...priorWeights.map((p, i) => p - maxWeights[i]));
    let lambdaMax = Math.max(...priorWeights.map((p, i) => p - minWeights[i]));

    const computeSum = (lambda: number): number => {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const val = priorWeights[i] - lambda;
        sum += Math.max(minWeights[i], Math.min(maxWeights[i], val));
      }
      return sum;
    };

    const maxIterations = 100;
    const tolerance = 1e-12;
    let lambda = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      lambda = (lambdaMin + lambdaMax) / 2;
      const currentSum = computeSum(lambda);

      if (Math.abs(currentSum - 1.0) < tolerance) {
        break;
      }

      if (currentSum > 1.0) {
        lambdaMin = lambda; // Increase lambda to decrease weights
      } else {
        lambdaMax = lambda; // Decrease lambda to increase weights
      }
    }

    const finalWeights = priorWeights.map((p, i) =>
      Math.max(minWeights[i], Math.min(maxWeights[i], p - lambda))
    );

    return {
      weights: finalWeights,
      status: "optimal",
    };
  }

  private static getUniformFallback(
    minWeights: number[],
    maxWeights: number[],
    message: string,
  ): ReconciliationOutput {
    // Falls back to normalized midpoints of constraints
    const n = minWeights.length;
    const midpoints = minWeights.map((min, i) => (min + maxWeights[i]) / 2);
    const sum = midpoints.reduce((a, b) => a + b, 0);
    const weights = midpoints.map((m) => (sum > 0 ? m / sum : 1.0 / n));

    return {
      weights,
      status: "fallback",
      message,
    };
  }
}
