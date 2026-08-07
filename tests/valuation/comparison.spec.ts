import { assertEquals } from "@std/assert";
import { createValuationComparison } from "../../src/valuation/comparison.ts";
import type { ValuationResult } from "../../src/valuation/model.ts";
import {
  parseValuationComparisonId,
  parseValuationResultId,
} from "../../src/valuation/ids.ts";
import { computedScenario, NOW, scope } from "./fixtures.ts";

Deno.test("comparison projections retain basis, method, freshness, and baseline deltas", () => {
  const first = computedScenario().result;
  if (!first.outcome.ok) {
    throw new Error("Expected a successful fixture result.");
  }
  const second: ValuationResult = {
    ...first,
    id: required("valuation_result_upside", parseValuationResultId),
    outcome: {
      ...first.outcome,
      value: {
        method: "book-value" as const,
        value: { amount: 125, currency: "USD" },
        flags: [],
      },
    },
  };
  const comparison = createValuationComparison({
    id: required("valuation_comparison_base", parseValuationComparisonId),
    scope: scope(),
    baselineResultId: first.id,
    results: [first, second],
    freshness: { [first.id]: "current", [second.id]: "stale" },
    now: NOW,
  });
  assertEquals(comparison.entries[0].method, "book-value");
  assertEquals(comparison.entries[0].deltaFromBaseline, 0);
  assertEquals(comparison.entries[1].deltaFromBaseline, 25);
  assertEquals(comparison.entries[1].freshness, "stale");
  assertEquals(comparison.entries[1].basisDigest, first.basis.basisDigest);
});

function required<T>(
  value: string,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
