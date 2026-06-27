/**
 * @module DiscountedCashFlowMethod
 * @description Pure mathematical calculation of Discounted Cash Flow (DCF).
 * Formula: DCF = Sum(UFCF_t / (1 + WACC)^t) for t = 1 to N
 */

import type {
  CashFlowProjection,
  MethodResult,
  ValuationFlag,
} from "../../../../shared/types.ts";

/**
 * Calculates the present value of projected unlevered free cash flows over an N-year period.
 *
 * @param {CashFlowProjection} data - The readonly cash flow projection DTO containing cash flows and WACC.
 * @returns {MethodResult} Deterministic result object containing the calculated DCF value and any warning flags.
 * @throws {RangeError} If WACC is not in the strict interval (0, 1).
 */
export function computeDCF(data: CashFlowProjection): MethodResult {
  if (data.wacc <= 0 || data.wacc >= 1) {
    throw new RangeError(
      "[ValuationEngine:DCF] WACC must be in the strict open interval (0, 1).",
    );
  }

  const N = data.cashFlows.length;
  if (N === 0) {
    return {
      method: "Discounted Cash Flow (DCF)",
      value: 0,
      flags: [],
    };
  }

  let totalValue = 0;
  let hasNegativeCashFlow = false;

  for (let i = 0; i < N; i++) {
    const t = i + 1;
    const cf = data.cashFlows[i];
    if (cf < 0) {
      hasNegativeCashFlow = true;
    }
    totalValue += cf / Math.pow(1 + data.wacc, t);
  }

  const flags: ValuationFlag[] = [];
  if (hasNegativeCashFlow) {
    flags.push("NEGATIVE_CASH_FLOW_DETECTED");
  }

  return {
    method: "Discounted Cash Flow (DCF)",
    value: totalValue,
    flags,
  };
}
