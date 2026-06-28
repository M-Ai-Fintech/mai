/**
 * @module ValuationEngine
 * @description Main facade orchestrator for company valuation calculations.
 * Executes a deterministic pipeline calling all 6 pure valuation functions and consolidating the results.
 * Supports advanced LATAM/Brazil adjustments (DLOM, JCP, contingencies) and convex weight reconciliation.
 */

import { computeBookValue } from "./methods/book_value.ts";
import { computeDCF } from "./methods/discounted_cash_flow.ts";
import { computeEbitdaMultiple } from "./methods/ebitda.ts";
import { computeEnterpriseValue } from "./methods/enterprise_value.ts";
import { computeMarketCap } from "./methods/market_capitalization.ts";
import { computeTerminalValue } from "./methods/growing_perpetuity.ts";

import { computeChaffeDLOM } from "./reconciliation/dlom.ts";
import { computeJcpTaxShield } from "./reconciliation/jcp.ts";
import { computeContingencyDeductions } from "./reconciliation/contingencies.ts";
import { ReconciliationEngine } from "./reconciliation/index.ts";

import type {
  CompanyProfile,
  ExtendedValuationInput,
  ExtendedValuationReport,
  MethodWeightBounds,
  ReconciledMethodResult,
  ValuationFlag,
  ValuationReconciliationWeights,
} from "../../../shared/types.ts";

/**
 * Orchestrator facade class for company valuation.
 * Strictly deterministic, high-performance mathematical engine containing zero machine learning or randomness.
 */
export class ValuationEngine {
  static readonly ENGINE_ID = "valuation-engine";
  static readonly VERSION = "1.1.0";

  /**
   * Evaluates a company's financial data using 6 distinct valuation methods and reconciles them.
   *
   * @param {ExtendedValuationInput} input - Unified readonly input DTO containing all necessary financial metrics.
   * @returns {ExtendedValuationReport} Consolidated deterministic valuation report with weight-based reconciliation.
   */
  public evaluate(input: ExtendedValuationInput): ExtendedValuationReport {
    // 1. Execute the 6 deterministic valuation methods
    const bookValueResult = computeBookValue(input.balanceSheet);
    const dcfResult = computeDCF(input.cashFlowProjection);
    const terminalValueResult = computeTerminalValue(input.terminalValue);
    const marketCapResult = computeMarketCap(input.marketData);
    const enterpriseValueResult = computeEnterpriseValue(input.enterpriseValue);
    const ebitdaValuationResult = computeEbitdaMultiple(input.ebitdaMultiple);

    const values = [
      bookValueResult.value,
      dcfResult.value,
      terminalValueResult.value,
      marketCapResult.value,
      enterpriseValueResult.value,
      // Replace NaN with 0 for optimization stability
      Number.isNaN(ebitdaValuationResult.value)
        ? 0
        : ebitdaValuationResult.value,
    ];

    // 2. Resolve Weights & Bounds (Dynamic or Custom Overrides)
    const weightsConfig = this.resolveWeightsConfig(input);

    // 3. Reconcile valuation results using convex solver
    const reconciliationRes = ReconciliationEngine.reconcile({
      values,
      weightsConfig,
    });

    const w = reconciliationRes.weights;
    let baseReconciledValue = 0;
    for (let i = 0; i < values.length; i++) {
      baseReconciledValue += values[i] * w[i];
    }

    // 4. Compute Chaffe DLOM
    let dlomRate = 0.0;
    if (input.dlom) {
      dlomRate = computeChaffeDLOM(input.dlom);
    }
    const dlomDiscountAmount = baseReconciledValue * dlomRate;

    // 5. Compute JCP tax shield adjustment
    let jcpTaxShieldBenefit = 0;
    if (input.jcp) {
      const shield = computeJcpTaxShield(input.jcp);
      jcpTaxShieldBenefit = shield.taxShieldBenefit;
    }

    // 6. Compute Tax/Labor contingencies deductions
    let contingencyDeductions = 0;
    if (input.contingencies) {
      contingencyDeductions = computeContingencyDeductions(input.contingencies);
    }

    // 7. Calculate final reconciled corporate value
    // Formula: Final = Reconciled_Base * (1 - DLOM) + JCP_Benefit - Contingencies
    const finalReconciledValuation = baseReconciledValue - dlomDiscountAmount +
      jcpTaxShieldBenefit - contingencyDeductions;

    // 8. Build detailed breakdown
    const methodNames = [
      "Book Value",
      "Discounted Cash Flow (DCF)",
      "Growing Perpetuity (Terminal Value)",
      "Market Capitalization",
      "Enterprise Value (EV)",
      "EBITDA Multiple Valuation",
    ];

    const methodFlags = [
      bookValueResult.flags,
      dcfResult.flags,
      terminalValueResult.flags,
      [],
      enterpriseValueResult.flags,
      ebitdaValuationResult.flags,
    ];

    const methodBreakdown: ReconciledMethodResult[] = methodNames.map((
      name,
      i,
    ) => ({
      method: name,
      rawValue: values[i],
      weight: w[i],
      contribution: values[i] * w[i],
      flags: methodFlags[i],
    }));

    // Collect all flags
    const flagSet = new Set<ValuationFlag>([
      ...bookValueResult.flags,
      ...dcfResult.flags,
      ...terminalValueResult.flags,
      ...enterpriseValueResult.flags,
      ...ebitdaValuationResult.flags,
    ]);

    return {
      companyId: input.companyId,
      timestamp: new Date().toISOString(),
      engineVersion: ValuationEngine.VERSION,
      bookValue: bookValueResult,
      dcf: dcfResult,
      terminalValue: terminalValueResult,
      marketCap: marketCapResult,
      enterpriseValue: enterpriseValueResult,
      ebitdaValuation: ebitdaValuationResult,
      allFlags: Array.from(flagSet),
      reconciliation: {
        baseReconciledValue,
        dlomDiscountRate: dlomRate,
        dlomDiscountAmount,
        jcpTaxShieldBenefit,
        contingencyDeductions,
        finalReconciledValuation,
        methodBreakdown,
        optimizationStatus: reconciliationRes.status,
        optimizationMessage: reconciliationRes.message,
      },
    };
  }

  /**
   * Evaluates company profile variables to dynamically determine valuation priors.
   */
  private resolveWeightsConfig(
    input: ExtendedValuationInput,
  ): ValuationReconciliationWeights {
    const basePriors: Record<
      keyof ValuationReconciliationWeights,
      MethodWeightBounds
    > = {
      ...this.getDynamicProfilePriors(input.profile),
    };

    // Apply custom overrides if defined
    if (input.customWeights) {
      const keys: (keyof ValuationReconciliationWeights)[] = [
        "bookValue",
        "dcf",
        "terminalValue",
        "marketCap",
        "enterpriseValue",
        "ebitdaValuation",
      ];
      for (const k of keys) {
        const override = input.customWeights[k];
        if (override) {
          basePriors[k] = {
            ...basePriors[k],
            ...override,
          };
        }
      }
    }

    return basePriors;
  }

  private getDynamicProfilePriors(
    profile?: CompanyProfile,
  ): ValuationReconciliationWeights {
    // Default fallback priors (Equal weighting bounds)
    const fallback: ValuationReconciliationWeights = {
      bookValue: { minWeight: 0.0, maxWeight: 0.30, priorWeight: 0.166 },
      dcf: { minWeight: 0.10, maxWeight: 0.50, priorWeight: 0.168 },
      terminalValue: { minWeight: 0.0, maxWeight: 0.30, priorWeight: 0.166 },
      marketCap: { minWeight: 0.0, maxWeight: 0.30, priorWeight: 0.166 },
      enterpriseValue: { minWeight: 0.0, maxWeight: 0.30, priorWeight: 0.168 },
      ebitdaValuation: { minWeight: 0.0, maxWeight: 0.40, priorWeight: 0.166 },
    };

    if (!profile) return fallback;

    // Profile-based rule mapping
    if (profile.listingStatus === "private") {
      // Private companies have zero marketCap/enterpriseValue weights since share price is unobservable
      if (profile.stage === "startup" || profile.sector === "technology") {
        // High growth startups: DCF and Multiples are key. Book value has low relevance.
        return {
          bookValue: { minWeight: 0.0, maxWeight: 0.10, priorWeight: 0.05 },
          dcf: { minWeight: 0.30, maxWeight: 0.70, priorWeight: 0.50 },
          terminalValue: {
            minWeight: 0.05,
            maxWeight: 0.25,
            priorWeight: 0.15,
          },
          marketCap: { minWeight: 0.0, maxWeight: 0.0, priorWeight: 0.0 },
          enterpriseValue: { minWeight: 0.0, maxWeight: 0.0, priorWeight: 0.0 },
          ebitdaValuation: {
            minWeight: 0.10,
            maxWeight: 0.50,
            priorWeight: 0.30,
          },
        };
      } else {
        // Mature private manufacturing/retail: EBITDA and Book Value are key
        return {
          bookValue: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.30 },
          dcf: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.25 },
          terminalValue: { minWeight: 0.0, maxWeight: 0.20, priorWeight: 0.10 },
          marketCap: { minWeight: 0.0, maxWeight: 0.0, priorWeight: 0.0 },
          enterpriseValue: { minWeight: 0.0, maxWeight: 0.0, priorWeight: 0.0 },
          ebitdaValuation: {
            minWeight: 0.15,
            maxWeight: 0.50,
            priorWeight: 0.35,
          },
        };
      }
    } else {
      // Public listed entities: Market multiples and listed values are highly observable
      return {
        bookValue: { minWeight: 0.05, maxWeight: 0.20, priorWeight: 0.10 },
        dcf: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.20 },
        terminalValue: { minWeight: 0.0, maxWeight: 0.20, priorWeight: 0.10 },
        marketCap: { minWeight: 0.10, maxWeight: 0.40, priorWeight: 0.20 },
        enterpriseValue: {
          minWeight: 0.10,
          maxWeight: 0.40,
          priorWeight: 0.20,
        },
        ebitdaValuation: {
          minWeight: 0.10,
          maxWeight: 0.45,
          priorWeight: 0.20,
        },
      };
    }
  }
}

// Named exports for compatibility with the test suite and rest of the codebase
export { computeBookValue } from "./methods/book_value.ts";
export { computeDCF } from "./methods/discounted_cash_flow.ts";
export { computeEbitdaMultiple } from "./methods/ebitda.ts";
export { computeEnterpriseValue } from "./methods/enterprise_value.ts";
export { computeMarketCap } from "./methods/market_capitalization.ts";
export { computeTerminalValue } from "./methods/growing_perpetuity.ts";

export { computeChaffeDLOM, cumulativeNormalCDF } from "./reconciliation/dlom.ts";
export { computeJcpTaxShield } from "./reconciliation/jcp.ts";
export { computeContingencyDeductions } from "./reconciliation/contingencies.ts";
export { ReconciliationEngine } from "./reconciliation/index.ts";
export type * from "../../../shared/types.ts";
