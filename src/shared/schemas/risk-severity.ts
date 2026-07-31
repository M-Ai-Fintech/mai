import { z } from "zod";

/**
 * Shared canonical Zod schema for risk severity across all internal agent contracts.
 */
export const riskSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

/**
 * Canonical TypeScript type union for internal risk severity.
 */
export type RiskSeverity = z.infer<typeof riskSeveritySchema>;

/**
 * Compatibility normalizer for legacy or imported risk severity values.
 * Trims surrounding whitespace and converts casing to lowercase before validation.
 * Rejects unknown or non-string values with an explicit error detailing the offending input.
 *
 * @example
 * normalizeLegacyRiskSeverity(" High ") // returns "high"
 */
export function normalizeLegacyRiskSeverity(value: unknown): RiskSeverity {
  if (typeof value !== "string") {
    throw new Error(
      `Invalid risk severity input: expected string, received ${typeof value} (${
        String(value)
      })`,
    );
  }
  const trimmed = value.trim().toLowerCase();
  const parsed = riskSeveritySchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new Error(
      `Invalid risk severity value: "${value}". Expected one of: low, medium, high, critical.`,
    );
  }
  return parsed.data;
}
