import { Chromosome, DealProfile } from "./genetic.ts";

export interface ConstraintResult {
  feasible: boolean;
  reason?: string;
}

export interface KycData {
  kycBlocked: boolean;
  sanctionMatch: boolean;
  pepExposure: boolean;
}

export interface FinancialData {
  ebitda: number;
  debt: number;
  interestExpense: number;
}

export interface EvaluationContext {
  chromosome: Chromosome;
  profile: DealProfile;
  kyc?: KycData;
  financial?: FinancialData;
}

export interface Constraint {
  id: string;
  type: string;
  enabled: boolean;
  /**
   * Evaluates the constraint against the deal context.
   * @param context The deal context including GA outputs, KYC, and financial data.
   * @returns ConstraintResult indicating if feasible and the reason if not.
   */
  evaluate(context: EvaluationContext): ConstraintResult;
}

export class KycConstraint implements Constraint {
  id = "kyc-rule";
  type = "kyc";
  enabled = true;

  evaluate(context: EvaluationContext): ConstraintResult {
    if (!context.kyc) return { feasible: true };
    if (context.kyc.kycBlocked) {
      return { feasible: false, reason: "Blocked by KYC policy." };
    }
    if (context.kyc.sanctionMatch) {
      return { feasible: false, reason: "Blocked by sanction match." };
    }
    if (context.kyc.pepExposure) {
      return { feasible: false, reason: "Blocked due to PEP exposure." };
    }
    return { feasible: true };
  }
}

export class LeverageConstraint implements Constraint {
  id = "leverage-rule";
  type = "financial";
  enabled = true;

  constructor(public maxLeverage: number) {}

  evaluate(context: EvaluationContext): ConstraintResult {
    if (!context.financial || context.financial.ebitda <= 0) {
      return { feasible: true };
    }
    // Leverage = Total Debt / EBITDA
    const leverage = context.financial.debt / context.financial.ebitda;
    if (leverage > this.maxLeverage) {
      return {
        feasible: false,
        reason: `Leverage ratio ${
          leverage.toFixed(2)
        } exceeds maximum of ${this.maxLeverage}.`,
      };
    }
    return { feasible: true };
  }
}

export class CoverageConstraint implements Constraint {
  id = "coverage-rule";
  type = "financial";
  enabled = true;

  constructor(public minCoverage: number) {}

  evaluate(context: EvaluationContext): ConstraintResult {
    if (!context.financial || context.financial.interestExpense <= 0) {
      return { feasible: true };
    }
    // Coverage = EBITDA / Interest Expense
    const coverage = context.financial.ebitda /
      context.financial.interestExpense;
    if (coverage < this.minCoverage) {
      return {
        feasible: false,
        reason: `EBITDA coverage ${
          coverage.toFixed(2)
        } is below minimum of ${this.minCoverage}.`,
      };
    }
    return { feasible: true };
  }
}

export class ValuationFloorConstraint implements Constraint {
  id = "valuation-floor-rule";
  type = "financial";
  enabled = true;

  constructor(public minValuation: number) {}

  evaluate(context: EvaluationContext): ConstraintResult {
    if (context.chromosome.valuation < this.minValuation) {
      return {
        feasible: false,
        reason: `Valuation ${
          context.chromosome.valuation.toFixed(2)
        } is below floor of ${this.minValuation}.`,
      };
    }
    return { feasible: true };
  }
}

export function filterFeasible(
  candidates: EvaluationContext[],
  constraints: Constraint[],
): EvaluationContext[] {
  return candidates.filter((candidate) => {
    for (const constraint of constraints) {
      if (constraint.enabled) {
        const result = constraint.evaluate(candidate);
        if (!result.feasible) {
          return false;
        }
      }
    }
    return true;
  });
}
