import { assertEquals, assertThrows } from "@std/assert";
import {
  assertClosingTransition,
  type ClosingStatus,
} from "../../src/closing/transitions.ts";

Deno.test("closing lifecycle accepts the controlled path to completion", () => {
  const lifecycle: readonly ClosingStatus[] = [
    "setup",
    "preparing_signing",
    "signing_ready",
    "signed",
    "gap_period",
    "preparing_closing",
    "closing_review",
    "authorized_to_close",
    "closing_in_progress",
    "closed_pending_evidence",
    "closed",
    "post_closing",
    "completed",
  ];

  for (let index = 1; index < lifecycle.length; index += 1) {
    assertClosingTransition(lifecycle[index - 1], lifecycle[index]);
  }

  assertEquals(lifecycle.at(-1), "completed");
});

Deno.test("closing lifecycle rejects reopening an irreversible completion", () => {
  assertThrows(
    () => assertClosingTransition("closed", "closing_review"),
    Error,
    'Closing transition "closed" -> "closing_review" is invalid',
  );
});
