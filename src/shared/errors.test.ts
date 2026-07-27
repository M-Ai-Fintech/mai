import { assertEquals } from "@std/assert";
import { describeError } from "./errors.ts";

Deno.test("describeError returns Error messages", () => {
  assertEquals(
    describeError(new Error("network unavailable")),
    "network unavailable",
  );
});

Deno.test("describeError stringifies non-Error values", () => {
  assertEquals(describeError({ reason: "offline" }), "[object Object]");
});
