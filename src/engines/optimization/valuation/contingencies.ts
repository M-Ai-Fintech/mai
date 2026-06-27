import type {
  ContingenciesData,
  ContingencyInput,
} from "../../../shared/types.ts";

/**
 * Computes probability-weighted expected values of off-balance-sheet tax and labor contingencies.
 * Deductible from Enterprise Value to bridge to Equity Value.
 */
export function computeContingencyDeductions(data: ContingenciesData): number {
  let totalDeduction = 0;

  const processContingency = (c: ContingencyInput): number => {
    if (c.probabilityWeight !== undefined) {
      return c.amount * c.probabilityWeight;
    }
    switch (c.probability) {
      case "PROBABLE":
        return c.amount * 1.0;
      case "POSSIBLE":
        return c.amount * 0.5;
      case "REMOTE":
        return c.amount * 0.0;
      default:
        return 0.0;
    }
  };

  if (data.taxContingencies) {
    for (const c of data.taxContingencies) {
      totalDeduction += processContingency(c);
    }
  }
  if (data.laborContingencies) {
    for (const c of data.laborContingencies) {
      totalDeduction += processContingency(c);
    }
  }

  return totalDeduction;
}
