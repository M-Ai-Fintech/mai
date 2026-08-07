import { assertEquals, assertThrows } from "@std/assert";
import {
  assertCostMetadata,
  assertRunTransition,
  assertStepTransition,
  sameSourceVersion,
  SourceVersionInvalidatedError,
} from "../../src/agent_runtime/model.ts";
import { parseMissionId } from "../../src/agent_runtime/ids.ts";

Deno.test("runtime identifiers require their context-owned prefix", () => {
  assertEquals(parseMissionId("mission_alpha").ok, true);
  assertEquals(parseMissionId("run_alpha").ok, false);
  assertEquals(parseMissionId("mission_").ok, false);
});

Deno.test("runtime state machines preserve terminal attempts", () => {
  assertRunTransition("queued", "running");
  assertRunTransition("running", "invalidated");
  assertStepTransition("retry_scheduled", "running");
  assertThrows(
    () => assertRunTransition("succeeded", "running"),
    Error,
    "succeeded",
  );
  assertThrows(
    () => assertStepTransition("invalidated", "running"),
    Error,
    "invalidated",
  );
});

Deno.test("source invalidation compares the exact recorded version and checksum", () => {
  const recorded = {
    sourceType: "document",
    sourceId: "document_alpha",
    version: 2 as never,
    checksum: "a".repeat(64),
  };
  assertEquals(sameSourceVersion(recorded, { ...recorded }), true);
  assertEquals(
    sameSourceVersion(recorded, { ...recorded, version: 3 as never }),
    false,
  );
  assertEquals(
    sameSourceVersion(recorded, { ...recorded, checksum: "b".repeat(64) }),
    false,
  );
  assertThrows(
    () => {
      throw new SourceVersionInvalidatedError(recorded);
    },
    Error,
    "document:document_alpha",
  );
});

Deno.test("cost metadata rejects negative or understated totals", () => {
  assertCostMetadata({
    currency: "USD",
    inputTokens: 10,
    outputTokens: 5,
    inputCost: 1,
    outputCost: 2,
    totalCost: 3,
  });
  assertThrows(
    () =>
      assertCostMetadata({
        currency: "USD",
        inputTokens: -1,
        outputTokens: 5,
        inputCost: 1,
        outputCost: 2,
        totalCost: 3,
      }),
    Error,
    "input tokens",
  );
  assertThrows(
    () =>
      assertCostMetadata({
        currency: "USD",
        inputTokens: 10,
        outputTokens: 5,
        inputCost: 1,
        outputCost: 2,
        totalCost: 2,
      }),
    Error,
    "total cost",
  );
});
