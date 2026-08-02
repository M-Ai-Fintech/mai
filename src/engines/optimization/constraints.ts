import type { Chromosome, DealProfile } from "./genetic.ts";
import {
  legacyInterestCoverageCalculation,
  legacyLeverageCalculation,
  legacyValuationFloorCalculation,
} from "./valuation/compatibility.ts";
import { invalid, missing } from "../valuation/support.ts";
import type { CalculationError } from "../valuation/types.ts";

export interface ConstraintResult {
  feasible: boolean;
  reason?: string;
  error?: CalculationError;
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
    if (!context.financial) {
      return unavailableFinancial("leverage", "financial debt and EBITDA");
    }
    if (!Number.isFinite(this.maxLeverage) || this.maxLeverage < 0) {
      return invalidThreshold("maxLeverage", this.maxLeverage);
    }
    const outcome = legacyLeverageCalculation(
      context.financial.debt,
      context.financial.ebitda,
    );
    if (!outcome.ok) return calculationFailure(outcome.error);
    const leverage = outcome.value.ratio.value;
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
    if (!context.financial) {
      return unavailableFinancial(
        "coverage",
        "financial EBITDA and interest expense",
      );
    }
    if (!Number.isFinite(this.minCoverage) || this.minCoverage < 0) {
      return invalidThreshold("minCoverage", this.minCoverage);
    }
    const outcome = legacyInterestCoverageCalculation(
      context.financial.ebitda,
      context.financial.interestExpense,
    );
    if (!outcome.ok) return calculationFailure(outcome.error);
    const coverage = outcome.value.ratio.value;
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
    if (!Number.isFinite(this.minValuation) || this.minValuation < 0) {
      return invalidThreshold("minValuation", this.minValuation);
    }
    const outcome = legacyValuationFloorCalculation(
      context.chromosome.valuation,
      this.minValuation,
    );
    if (!outcome.ok) return calculationFailure(outcome.error);
    if (!outcome.value.meetsFloor) {
      return {
        feasible: false,
        reason: `Valuation ${
          outcome.value.valuation.amount.toFixed(2)
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

function unavailableFinancial(
  name: string,
  expected: string,
): ConstraintResult {
  return calculationFailure(missing(name, expected));
}

function invalidThreshold(field: string, value: number): ConstraintResult {
  return calculationFailure(
    invalid(field, value, "a finite non-negative threshold"),
  );
}

function calculationFailure(error: CalculationError): ConstraintResult {
  return { feasible: false, reason: error.message, error };
}
