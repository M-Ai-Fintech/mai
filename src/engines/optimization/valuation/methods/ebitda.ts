/**
 * @module EbitdaMultipleMethod
 * @description Pure mathematical calculation of enterprise valuation based on EV/EBITDA multiples.
 * Formula: EV_implied = EBITDA * Multiple_EV/EBITDA
 * (Implied Equity Value = EV_implied - Total Debt + Cash)
 */

import type {
  EbitdaMultipleInput,
  MethodResult,
  ValuationFlag,
} from "../../../../shared/types.ts";

/**
 * Calculates the implied Enterprise Value of a company using an EV/EBITDA multiple.
 *
 * @param {EbitdaMultipleInput} data - The readonly EBITDA multiple input DTO containing EBITDA, multiple, debt, and cash.
 * @returns {MethodResult} Deterministic result object containing the calculated implied EV and any warning flags.
 * @throws {RangeError} If evEbitdaMultiple <= 0, totalDebt < 0, or cashAndEquivalents < 0.
 */
export function computeEbitdaMultiple(data: EbitdaMultipleInput): MethodResult {
  if (data.evEbitdaMultiple <= 0) {
    throw new RangeError(
      "[ValuationEngine:EBITDA] EV/EBITDA multiple must be > 0.",
    );
  }
  if (data.totalDebt < 0 || data.cashAndEquivalents < 0) {
    throw new RangeError(
      "[ValuationEngine:EBITDA] Total debt and cash must be >= 0.",
    );
  }

  const flags: ValuationFlag[] = [];

  if (data.ebitda <= 0) {
    flags.push("NON_POSITIVE_EBITDA");
    return {
      method: "EBITDA Multiple Valuation",
      value: NaN,
      flags,
    };
  }

  const impliedEv = data.ebitda * data.evEbitdaMultiple;

  return {
    method: "EBITDA Multiple Valuation",
    value: impliedEv,
    flags,
  };
}
