/**
 * @module EnterpriseValueMethod
 * @description Pure mathematical calculation of Enterprise Value (EV).
 * Formula: EV = Market Capitalization + Total Debt - Cash and Cash Equivalents
 */

import type {
  EnterpriseValueInput,
  MethodResult,
} from "../../../../shared/types.ts";
import { legacyEnterpriseValue } from "../compatibility.ts";

/**
 * Calculates the Enterprise Value (EV) of a company.
 *
 * @param {EnterpriseValueInput} data - The readonly enterprise value input DTO containing market cap, total debt, and cash.
 * @returns {MethodResult} Deterministic result object containing the calculated enterprise value and any warning flags.
 * @throws {RangeError} If totalDebt < 0 or cashAndEquivalents < 0.
 */
export function computeEnterpriseValue(
  data: EnterpriseValueInput,
): MethodResult {
  return legacyEnterpriseValue(data);
}
