import { assertThrows } from "@std/assert";
import { integrationConfig } from "./verify_integration.ts";

Deno.test("live integration profile rejects missing configuration instead of using mocks", () => {
  assertThrows(
    () => integrationConfig({}),
    Error,
    "verify:integration requires real service configuration",
  );
});
