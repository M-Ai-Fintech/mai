/**
 * @module GrowingPerpetuityMethod
 * @description Pure mathematical calculation of Terminal Value using the Gordon Growth Model, discounted back to Present Value.
 * Formula: TV = (UFCF_N * (1 + g)) / (WACC - g), PV_TV = TV / (1 + WACC)^N
 */

import type {
  MethodResult,
  TerminalValueInput,
  ValuationFlag,
} from "../../../../shared/types.ts";

/**
 * Calculates the terminal value using the Gordon Growth Model, discounted back to present value.
 *
 * @param {TerminalValueInput} data - The readonly terminal value input DTO containing last cash flow, growth rate, WACC, and projection years.
 * @returns {MethodResult} Deterministic result object containing the calculated PV of terminal value and any warning flags.
 * @throws {RangeError} If WACC is not in the strict interval (0, 1) or projectionYears < 0.
 */
export function computeTerminalValue(data: TerminalValueInput): MethodResult {
  if (data.wacc <= 0 || data.wacc >= 1) {
    throw new RangeError(
      "[ValuationEngine:TerminalValue] WACC must be in the strict open interval (0, 1).",
    );
  }
  if (data.projectionYears < 0) {
    throw new RangeError(
      "[ValuationEngine:TerminalValue] projectionYears cannot be negative.",
    );
  }

  const flags: ValuationFlag[] = [];

  if (data.growthRate < 0 || data.growthRate > 0.04) {
    flags.push("UNREALISTIC_GROWTH_RATE");
  }

  if (data.growthRate >= data.wacc) {
    flags.push("GROWTH_EXCEEDS_WACC");
    return {
      method: "Growing Perpetuity (Terminal Value)",
      value: Infinity,
      flags,
    };
  }

  const baseCashFlow = data.lastCashFlow;
  const tv = (baseCashFlow * (1 + data.growthRate)) /
    (data.wacc - data.growthRate);
  const pvTv = tv / Math.pow(1 + data.wacc, data.projectionYears);

  return {
    method: "Growing Perpetuity (Terminal Value)",
    value: pvTv,
    flags,
  };
}
