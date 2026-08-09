import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from "./contracts.ts";
import type { ReadinessTarget } from "./readiness.ts";

/**
 * Rejects providers outside the governed integration registry.
 *
 * @example assertReadinessProvider("papermark")
 */
export function assertReadinessProvider(
  provider: IntegrationProvider,
): void {
  if (INTEGRATION_PROVIDERS.includes(provider)) return;
  throw new Error(
    "Readiness provider is invalid; expected a registered provider marker.",
  );
}

/**
 * Rejects readiness targets outside the explicit environment ladder.
 *
 * @example assertReadinessTarget("local-development")
 */
export function assertReadinessTarget(target: ReadinessTarget): void {
  if (
    target === "interface-only" ||
    target === "fixture" ||
    target === "local-development" ||
    target === "sandbox-certification" ||
    target === "production-candidate" ||
    target === "production-verified"
  ) return;
  throw new Error(
    "Readiness target is invalid; expected an evidence-backed environment target.",
  );
}

/**
 * Validates one credential-free readiness identity field.
 *
 * @example assertReadinessIdentifier("commit-1", "provider version")
 */
export function assertReadinessIdentifier(value: string, label: string): void {
  if (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    value.trim() === value &&
    /^[A-Za-z0-9._-]+$/.test(value)
  ) return;
  throw new Error(
    `${label} is invalid; expected 1-128 safe identifier characters.`,
  );
}

/**
 * Validates a deterministic readiness clock value.
 *
 * @example assertReadinessDate(new Date("2026-08-09T00:00:00.000Z"))
 */
export function assertReadinessDate(value: Date, label = "timestamp"): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `Readiness ${label} is invalid; expected a valid Date.`,
  );
}
