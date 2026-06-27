/**
 * @module EnterpriseValueMethod
 * @description Pure mathematical calculation of Enterprise Value (EV).
 * Formula: EV = Market Capitalization + Total Debt - Cash and Cash Equivalents
 */

import type {
  EnterpriseValueInput,
  MethodResult,
  ValuationFlag,
} from "../../../../shared/types.ts";

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
  if (data.totalDebt < 0 || data.cashAndEquivalents < 0) {
    throw new RangeError(
      "[ValuationEngine:EnterpriseValue] Total debt and cash must be >= 0.",
    );
  }

  const ev = data.marketCap + data.totalDebt - data.cashAndEquivalents;
  const flags: ValuationFlag[] = [];

  if (ev < 0) {
    flags.push("NEGATIVE_ENTERPRISE_VALUE");
  }

  return {
    method: "Enterprise Value (EV)",
    value: ev,
    flags,
  };
}
