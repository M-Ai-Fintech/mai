import type { ValuationInvalidation } from "./model.ts";

export function invalidationIsStale(
  invalidation: ValuationInvalidation,
): boolean {
  return invalidation.kind === "stale";
}
