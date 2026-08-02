/**
 * @module EbitdaMultipleMethod
 * @description Pure mathematical calculation of enterprise valuation based on EV/EBITDA multiples.
 * Formula: EV_implied = EBITDA * Multiple_EV/EBITDA
 * (Implied Equity Value = EV_implied - Total Debt + Cash)
 */

import type {
  EbitdaMultipleInput,
  MethodResult,
} from "../../../../shared/types.ts";
import { legacyEbitdaMultiple } from "../compatibility.ts";

/**
 * Calculates the implied Enterprise Value of a company using an EV/EBITDA multiple.
 *
 * @param {EbitdaMultipleInput} data - The readonly EBITDA multiple input DTO containing EBITDA, multiple, debt, and cash.
 * @returns {MethodResult} Deterministic result object containing the calculated implied EV and any warning flags.
 * @throws {RangeError} If evEbitdaMultiple <= 0, totalDebt < 0, or cashAndEquivalents < 0.
 */
export function computeEbitdaMultiple(data: EbitdaMultipleInput): MethodResult {
  return legacyEbitdaMultiple(data);
}
