/**
 * @module MarketCapitalizationMethod
 * @description Pure mathematical calculation of Market Capitalization.
 * Formula: Market Cap = Share Price * Total Outstanding Shares
 */

import type { MarketData, MethodResult } from "../../../../shared/types.ts";
import { legacyMarketCapitalization } from "../compatibility.ts";

/**
 * Calculates the Market Capitalization of a publicly traded company.
 *
 * @param {MarketData} data - The readonly market data DTO containing share price and total outstanding shares.
 * @returns {MethodResult} Deterministic result object containing the calculated market capitalization value.
 * @throws {RangeError} If share price or outstanding shares are <= 0, or if outstanding shares is fractional.
 */
export function computeMarketCap(data: MarketData): MethodResult {
  return legacyMarketCapitalization(data);
}
