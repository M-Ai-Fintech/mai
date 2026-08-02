/**
 * @module GrowingPerpetuityMethod
 * @description Pure mathematical calculation of Terminal Value using the Gordon Growth Model, discounted back to Present Value.
 * Formula: TV = (UFCF_N * (1 + g)) / (WACC - g), PV_TV = TV / (1 + WACC)^N
 */

import type {
  MethodResult,
  TerminalValueInput,
} from "../../../../shared/types.ts";
import { legacyTerminalValue } from "../compatibility.ts";

/**
 * Calculates the terminal value using the Gordon Growth Model, discounted back to present value.
 *
 * @param {TerminalValueInput} data - The readonly terminal value input DTO containing last cash flow, growth rate, WACC, and projection years.
 * @returns {MethodResult} Deterministic result object containing the calculated PV of terminal value and any warning flags.
 * @throws {RangeError} If WACC is not in the strict interval (0, 1) or projectionYears < 0.
 */
export function computeTerminalValue(data: TerminalValueInput): MethodResult {
  return legacyTerminalValue(data);
}
