import { assertEquals, assertThrows } from "@std/assert";
import { calculateValuation } from "../../src/engines/valuation/index.ts";
import {
  DeterministicValuationAdapter,
  ensureSuccessfulCalculation,
} from "../../src/valuation/compute.ts";
import { modelDefinition } from "./fixtures.ts";

Deno.test("deterministic adapter preserves provenance and model rounding", () => {
  const model = modelDefinition();
  const outcome = new DeterministicValuationAdapter().compute({
    model,
    request: {
      method: "book-value",
      input: {
        totalAssets: { amount: 1_000, currency: "USD" },
        intangibleAssets: { amount: 100, currency: "USD" },
        totalLiabilities: { amount: 400, currency: "USD" },
        options: { rounding: model.rounding },
      },
    },
  });
  if (!outcome.ok) {
    throw new Error("Expected the deterministic calculation to succeed.");
  }
  assertEquals(outcome.provenance.algorithm, "mai.deterministic-valuation");
  assertEquals(outcome.provenance.algorithmVersion, "1.0.0");
  assertEquals(outcome.provenance.rounding, model.rounding);
  const value = outcome.value as {
    readonly value: { readonly amount: number };
  };
  assertEquals(value.value.amount, 500);
});

Deno.test("adapter rejects a model algorithm version it cannot execute", () => {
  assertThrows(
    () =>
      new DeterministicValuationAdapter().compute({
        model: { ...modelDefinition(), algorithmVersion: "2.0.0" },
        request: { method: "book-value", input: {} },
      }),
    Error,
    "unsupported",
  );
});

Deno.test("failed deterministic outcomes expose a safe Valuation error", () => {
  const failure = calculateValuation({ method: "unsupported", input: {} });
  assertThrows(
    () => ensureSuccessfulCalculation(failure, "unsupported"),
    Error,
    "failed with",
  );
});
