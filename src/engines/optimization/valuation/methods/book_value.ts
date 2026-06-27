/**
 * @module BookValueMethod
 * @description Pure mathematical calculation of Book Value (Valor Patrimonial).
 * Formula: BV = Total Assets - Intangible Assets - Total Liabilities
 */

import type {
  BalanceSheetData,
  MethodResult,
  ValuationFlag,
} from "../../../../shared/types.ts";

/**
 * Calculates the Book Value of a company based on balance sheet information.
 *
 * @param {BalanceSheetData} data - The readonly balance sheet DTO.
 * @returns {MethodResult} Deterministic result object containing the calculated value and any warning flags.
 * @throws {RangeError} If any of the balance sheet inputs are negative.
 */
export function computeBookValue(data: BalanceSheetData): MethodResult {
  if (
    data.totalAssets < 0 || data.intangibleAssets < 0 ||
    data.totalLiabilities < 0
  ) {
    throw new RangeError(
      "[ValuationEngine:BookValue] Balance sheet inputs must be >= 0.",
    );
  }

  const bv = data.totalAssets - data.intangibleAssets - data.totalLiabilities;
  const flags: ValuationFlag[] = [];

  if (bv < 0) {
    flags.push("NEGATIVE_BOOK_VALUE");
  }

  return {
    method: "Book Value",
    value: bv,
    flags,
  };
}
