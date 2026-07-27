import type {
  ContingenciesData,
  ContingencyInput,
} from "../../../../shared/types.ts";

/**
 * Computes probability-weighted expected values of off-balance-sheet tax and labor contingencies.
 * Deductible from Enterprise Value to bridge to Equity Value.
 */
export function computeContingencyDeductions(data: ContingenciesData): number {
  return contingencyTotal(data.taxContingencies) +
    contingencyTotal(data.laborContingencies);
}

function contingencyTotal(
  contingencies: readonly ContingencyInput[] | undefined,
): number {
  return (contingencies ?? []).reduce(
    (total, contingency) => total + contingencyValue(contingency),
    0,
  );
}

function contingencyValue(contingency: ContingencyInput): number {
  if (contingency.probabilityWeight !== undefined) {
    return contingency.amount * contingency.probabilityWeight;
  }
  const weights: Record<ContingencyInput["probability"], number> = {
    PROBABLE: 1,
    POSSIBLE: 0.5,
    REMOTE: 0,
  };
  return contingency.amount * weights[contingency.probability];
}
