import { assertEquals, assertThrows } from "@std/assert";
import { createExecutableApiServer } from "../../src/api/server.ts";

Deno.test("executable API bootstrap fails startup without database configuration", () => {
  const error = assertThrows(
    () => createExecutableApiServer({}),
    Error,
    "expected MAI106_DATABASE_URL or DATABASE_URL",
  );
  assertEquals(error.message.includes("password"), false);
});

Deno.test("executable API bootstrap rejects non-PostgreSQL configuration", () => {
  assertThrows(
    () => createExecutableApiServer({ DATABASE_URL: "https://db.invalid" }),
    Error,
    "expected postgres or postgresql",
  );
});
