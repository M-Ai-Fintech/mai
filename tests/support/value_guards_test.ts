import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { requireArray, requireRecord } from "./value_guards.ts";

Deno.test("requireRecord returns object-shaped tool output", () => {
  const output = { success: true };
  assertStrictEquals(requireRecord(output), output);
});

Deno.test("requireRecord rejects arrays with the offending value", () => {
  const error = assertThrows(() => requireRecord(["wrong"]), TypeError);
  assertEquals(
    error.message,
    'Expected an object-shaped tool result, received ["wrong"].',
  );
});

Deno.test("requireArray returns the named array field", () => {
  const files = [{ name: "document.pdf" }];
  assertStrictEquals(requireArray(files, "files"), files);
});

Deno.test("requireArray rejects non-arrays with field context", () => {
  const error = assertThrows(() => requireArray("wrong", "files"), TypeError);
  assertEquals(
    error.message,
    "Expected 'files' to be an array, received \"wrong\".",
  );
});
