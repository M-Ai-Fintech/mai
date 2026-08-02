/**
 * @module BookValueMethod
 * @description Pure mathematical calculation of book value.
 * Formula: BV = Total Assets - Intangible Assets - Total Liabilities
 */

import type {
  BalanceSheetData,
  MethodResult,
} from "../../../../shared/types.ts";
import { legacyBookValue } from "../compatibility.ts";

/**
 * Calculates the Book Value of a company based on balance sheet information.
 *
 * @param {BalanceSheetData} data - The readonly balance sheet DTO.
 * @returns {MethodResult} Deterministic result object containing the calculated value and any warning flags.
 * @throws {RangeError} If any of the balance sheet inputs are negative.
 */
export function computeBookValue(data: BalanceSheetData): MethodResult {
  return legacyBookValue(data);
}
