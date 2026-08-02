import { assertEquals, assertThrows } from "@std/assert";
import {
  percentile,
  REFERENCE_RUN_COUNT,
  runReferenceBenchmark,
} from "./verify_fast_benchmark.ts";
import type {
  FastCheckDefinition,
  FastCheckExecution,
  FastCheckExecutor,
} from "./verify_fast.ts";

Deno.test("reference benchmark uses at least ten runs", () => {
  assertEquals(REFERENCE_RUN_COUNT >= 10, true);
});

Deno.test("reference benchmark p95 uses the nearest-rank sample", () => {
  assertEquals(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95), 100);
  assertThrows(() => percentile([], 95), Error, "at least one");
});

Deno.test("reference benchmark executes all ten requested runs", async () => {
  const executor = new CountingFastCheckExecutor();
  const result = await runReferenceBenchmark(executor, REFERENCE_RUN_COUNT);

  assertEquals(result.runs, REFERENCE_RUN_COUNT);
  assertEquals(result.durationsMs.length, REFERENCE_RUN_COUNT);
  assertEquals(executor.runCount > REFERENCE_RUN_COUNT, true);
});

class CountingFastCheckExecutor implements FastCheckExecutor {
  runCount = 0;

  execute(_check: FastCheckDefinition): Promise<FastCheckExecution> {
    this.runCount += 1;
    return Promise.resolve({ success: true, output: "" });
  }
}
