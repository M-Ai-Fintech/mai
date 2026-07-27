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
  validateTerminalInput(data);
  const flags = terminalFlags(data);
  if (data.growthRate >= data.wacc) {
    flags.push("GROWTH_EXCEEDS_WACC");
    return terminalResult(Infinity, flags);
  }
  const terminalValue = (data.lastCashFlow * (1 + data.growthRate)) /
    (data.wacc - data.growthRate);
  const presentValue = terminalValue /
    Math.pow(1 + data.wacc, data.projectionYears);
  return terminalResult(presentValue, flags);
}

function validateTerminalInput(data: TerminalValueInput): void {
  if (data.wacc <= 0 || data.wacc >= 1) {
    throw new RangeError(
      `[ValuationEngine:TerminalValue] WACC was ${data.wacc}; expected a number in (0, 1).`,
    );
  }
  if (data.projectionYears >= 0) return;
  throw new RangeError(
    `[ValuationEngine:TerminalValue] projectionYears was ${data.projectionYears}; expected a non-negative number.`,
  );
}

function terminalFlags(data: TerminalValueInput): ValuationFlag[] {
  return data.growthRate < 0 || data.growthRate > 0.04
    ? ["UNREALISTIC_GROWTH_RATE"]
    : [];
}

function terminalResult(
  value: number,
  flags: ValuationFlag[],
): MethodResult {
  return {
    method: "Growing Perpetuity (Terminal Value)",
    value,
    flags,
  };
}
