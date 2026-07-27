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
  validateWacc(data.wacc);
  const value = discountedCashFlows(data.cashFlows, data.wacc);
  return {
    method: "Discounted Cash Flow (DCF)",
    value,
    flags: negativeCashFlowFlags(data.cashFlows),
  };
}

function validateWacc(wacc: number): void {
  if (wacc > 0 && wacc < 1) return;
  throw new RangeError(
    `[ValuationEngine:DCF] WACC was ${wacc}; expected a number in (0, 1).`,
  );
}

function discountedCashFlows(
  cashFlows: readonly number[],
  wacc: number,
): number {
  return cashFlows.reduce(
    (total, cashFlow, index) =>
      total + cashFlow / Math.pow(1 + wacc, index + 1),
    0,
  );
}

function negativeCashFlowFlags(
  cashFlows: readonly number[],
): ValuationFlag[] {
  return cashFlows.some((cashFlow) => cashFlow < 0)
    ? ["NEGATIVE_CASH_FLOW_DETECTED"]
    : [];
}
