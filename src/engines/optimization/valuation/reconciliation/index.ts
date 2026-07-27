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

const METHOD_NAMES: (keyof ValuationReconciliationWeights)[] = [
  "bookValue",
  "dcf",
  "terminalValue",
  "marketCap",
  "enterpriseValue",
  "ebitdaValuation",
];

interface WeightBounds {
  minimums: number[];
  maximums: number[];
  priors: number[];
}

export class ReconciliationEngine {
  /**
   * Projects prior weights onto the simplex under box constraints.
   * Solves: min 0.5 * ||w - prior||^2 subject to sum(w_i) = 1 and min_i <= w_i <= max_i.
   * Uses a Lagrange multiplier bisection search.
   */
  public static reconcile(input: ReconciliationInput): ReconciliationOutput {
    const bounds = weightBounds(input.weightsConfig);
    const invalid = invalidBoundsMessage(bounds);
    if (invalid) return this.getUniformFallback(bounds, invalid);
    const lambda = simplexLambda(bounds);
    return { weights: projectedWeights(bounds, lambda), status: "optimal" };
  }

  private static getUniformFallback(
    bounds: WeightBounds,
    message: string,
  ): ReconciliationOutput {
    const midpoints = bounds.minimums.map(
      (minimum, index) => (minimum + bounds.maximums[index]) / 2,
    );
    const sum = midpoints.reduce((a, b) => a + b, 0);
    const weights = midpoints.map((midpoint) =>
      sum > 0 ? midpoint / sum : 1 / midpoints.length
    );
    return {
      weights,
      status: "fallback",
      message,
    };
  }
}

function weightBounds(
  config: ValuationReconciliationWeights,
): WeightBounds {
  return {
    minimums: METHOD_NAMES.map((method) => config[method].minWeight),
    maximums: METHOD_NAMES.map((method) => config[method].maxWeight),
    priors: METHOD_NAMES.map((method) => config[method].priorWeight),
  };
}

function invalidBoundsMessage(bounds: WeightBounds): string {
  const invalidIndex = bounds.minimums.findIndex(
    (minimum, index) => minimum > bounds.maximums[index],
  );
  if (invalidIndex >= 0) return "Bounds error: minWeight > maxWeight";
  const minimumSum = sum(bounds.minimums);
  const maximumSum = sum(bounds.maximums);
  if (minimumSum <= 1 + 1e-9 && maximumSum >= 1 - 1e-9) return "";
  return `Bounds error: Infeasible space. sum(min)=${
    minimumSum.toFixed(4)
  }, sum(max)=${maximumSum.toFixed(4)}`;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function simplexLambda(bounds: WeightBounds): number {
  let minimum = Math.min(
    ...bounds.priors.map((prior, index) => prior - bounds.maximums[index]),
  );
  let maximum = Math.max(
    ...bounds.priors.map((prior, index) => prior - bounds.minimums[index]),
  );
  for (let iteration = 0; iteration < 100; iteration++) {
    const lambda = (minimum + maximum) / 2;
    const currentSum = sum(projectedWeights(bounds, lambda));
    if (Math.abs(currentSum - 1) < 1e-12) return lambda;
    if (currentSum > 1) minimum = lambda;
    else maximum = lambda;
  }
  return (minimum + maximum) / 2;
}

function projectedWeights(
  bounds: WeightBounds,
  lambda: number,
): number[] {
  return bounds.priors.map((prior, index) =>
    Math.max(
      bounds.minimums[index],
      Math.min(bounds.maximums[index], prior - lambda),
    )
  );
}
