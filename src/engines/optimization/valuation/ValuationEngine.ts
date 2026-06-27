/**
 * @module ValuationEngine
 * @description Main facade orchestrator for company valuation calculations.
 * Executes a deterministic pipeline calling all 6 pure valuation functions and consolidating the results.
 */

import {
  computeBookValue,
  computeDCF,
  computeEbitdaMultiple,
  computeEnterpriseValue,
  computeMarketCap,
  computeTerminalValue,
} from "./formulas.ts";
import type {
  ValuationFlag,
  ValuationInput,
  ValuationReport,
} from "../../../shared/types.ts";

/**
 * Orchestrator facade class for company valuation.
 * Strictly deterministic, high-performance mathematical engine containing zero machine learning or randomness.
 */
export class ValuationEngine {
  static readonly ENGINE_ID = "valuation-engine";
  static readonly VERSION = "1.0.0";

  /**
   * Evaluates a company's financial data using 6 distinct valuation methods.
   *
   * @param {ValuationInput} input - Unified readonly input DTO containing all necessary financial metrics.
   * @returns {ValuationReport} Consolidated deterministic valuation report with aggregated flags.
   */
  evaluate(input: ValuationInput): ValuationReport {
    const bookValueResult = computeBookValue(input.balanceSheet);
    const dcfResult = computeDCF(input.cashFlowProjection);
    const terminalValueResult = computeTerminalValue(input.terminalValue);
    const marketCapResult = computeMarketCap(input.marketData);
    const enterpriseValueResult = computeEnterpriseValue(input.enterpriseValue);
    const ebitdaValuationResult = computeEbitdaMultiple(input.ebitdaMultiple);

    // Collect all unique flags encountered across all valuation methods
    const flagSet = new Set<ValuationFlag>([
      ...bookValueResult.flags,
      ...dcfResult.flags,
      ...terminalValueResult.flags,
      ...marketCapResult.flags,
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
    };
  }
}
