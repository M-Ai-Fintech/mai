/**
 * @module DiscountedCashFlowMethod
 * @description Pure mathematical calculation of Discounted Cash Flow (DCF).
 * Formula: DCF = Sum(UFCF_t / (1 + WACC)^t) for t = 1 to N
 */

import type {
  CashFlowProjection,
  MethodResult,
} from "../../../../shared/types.ts";
import { legacyDiscountedCashFlow } from "../compatibility.ts";

/**
 * Calculates the present value of projected unlevered free cash flows over an N-year period.
 *
 * @param {CashFlowProjection} data - The readonly cash flow projection DTO containing cash flows and WACC.
 * @returns {MethodResult} Deterministic result object containing the calculated DCF value and any warning flags.
 * @throws {RangeError} If WACC is not in the strict interval (0, 1).
 */
export function computeDCF(data: CashFlowProjection): MethodResult {
  return legacyDiscountedCashFlow(data);
}
