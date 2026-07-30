import { assertEquals, assertThrows } from "@std/assert";
import {
  assertJobTransition,
  isTerminalJobState,
  JobStateTransitionError,
} from "../../../src/platform/jobs/v1.ts";

Deno.test("job state machine validates execution, retry, and terminal paths", () => {
  assertJobTransition("queued", "running");
  assertJobTransition("running", "retry_scheduled");
  assertJobTransition("retry_scheduled", "running");
  assertJobTransition("running", "succeeded");
  assertJobTransition("running", "cancelled");
  assertJobTransition("running", "timed_out");
  assertJobTransition("running", "dead_lettered");
  assertEquals(isTerminalJobState("succeeded"), true);
  assertEquals(isTerminalJobState("dead_lettered"), true);
  assertEquals(isTerminalJobState("retry_scheduled"), false);
});

Deno.test("terminal jobs cannot return to running", () => {
  for (
    const state of [
      "succeeded",
      "failed",
      "cancelled",
      "timed_out",
      "dead_lettered",
    ] as const
  ) {
    assertThrows(
      () => assertJobTransition(state, "running"),
      JobStateTransitionError,
      `Job transition "${state}" -> "running"`,
    );
  }
});
