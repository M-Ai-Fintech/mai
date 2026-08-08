import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  logOperationalEvent,
  redactDiagnostics,
} from "../../../src/platform/operations/diagnostics.ts";

Deno.test("diagnostics redact representative credentials recursively", () => {
  assertEquals(
    redactDiagnostics({
      password: "secret-value",
      nested: { authorization: "Bearer secret", safe: "visible" },
    }),
    {
      password: "[REDACTED]",
      nested: { authorization: "[REDACTED]", safe: "visible" },
    },
  );
});

Deno.test("operational events are structured JSON", () => {
  const original = console.log;
  let output = "";
  console.log = (message?: unknown): void => {
    output = String(message);
  };
  try {
    logOperationalEvent("test.event", { apiKey: "secret-value", count: 1 });
  } finally {
    console.log = original;
  }
  assertStringIncludes(output, '"event":"test.event"');
  assertStringIncludes(output, '"apiKey":"[REDACTED]"');
  assertStringIncludes(output, '"count":1');
});
