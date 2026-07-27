/**
 * @module BookValueMethod
 * @description Pure mathematical calculation of book value.
 * Formula: BV = Total Assets - Intangible Assets - Total Liabilities
 */

import type {
  BalanceSheetData,
  MethodResult,
} from "../../../../shared/types.ts";

/**
 * Calculates the Book Value of a company based on balance sheet information.
 *
 * @param {BalanceSheetData} data - The readonly balance sheet DTO.
 * @returns {MethodResult} Deterministic result object containing the calculated value and any warning flags.
 * @throws {RangeError} If any of the balance sheet inputs are negative.
 */
export function computeBookValue(data: BalanceSheetData): MethodResult {
  validateBalanceSheet(data);
  const value = data.totalAssets - data.intangibleAssets -
    data.totalLiabilities;
  return {
    method: "Book Value",
    value,
    flags: value < 0 ? ["NEGATIVE_BOOK_VALUE"] : [],
  };
}

function validateBalanceSheet(data: BalanceSheetData): void {
  if (
    data.totalAssets >= 0 && data.intangibleAssets >= 0 &&
    data.totalLiabilities >= 0
  ) return;
  throw new RangeError(
    `[ValuationEngine:BookValue] assets/intangibles/liabilities was ${data.totalAssets}/${data.intangibleAssets}/${data.totalLiabilities}; expected non-negative values.`,
  );
}
