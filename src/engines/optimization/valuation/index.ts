import type {
  ExtendedValuationInput,
  ExtendedValuationReport,
} from "../../../shared/types.ts";
import { evaluateValuation } from "./pipeline.ts";

/**
 * Deterministic facade for the valuation calculation pipeline.
 */
export class ValuationEngine {
  static readonly ENGINE_ID = "valuation-engine";
  static readonly VERSION = "1.1.0";

  /**
   * Evaluates six valuation methods and reconciles their results.
   *
   * @example new ValuationEngine().evaluate(input)
   */
  public evaluate(input: ExtendedValuationInput): ExtendedValuationReport {
    return evaluateValuation(input, ValuationEngine.VERSION);
  }
}

export { computeBookValue } from "./methods/book_value.ts";
export { computeDCF } from "./methods/discounted_cash_flow.ts";
export { computeEbitdaMultiple } from "./methods/ebitda.ts";
export { computeEnterpriseValue } from "./methods/enterprise_value.ts";
export { computeMarketCap } from "./methods/market_capitalization.ts";
export { computeTerminalValue } from "./methods/growing_perpetuity.ts";
export {
  computeChaffeDLOM,
  cumulativeNormalCDF,
} from "./reconciliation/dlom.ts";
export { computeJcpTaxShield } from "./reconciliation/jcp.ts";
export { computeContingencyDeductions } from "./reconciliation/contingencies.ts";
export { ReconciliationEngine } from "./reconciliation/index.ts";
export type * from "../../../shared/types.ts";
