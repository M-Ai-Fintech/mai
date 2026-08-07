import { assertEquals, assertStringIncludes } from "@std/assert";
import { checkDenoCache } from "./preflight_dependencies.ts";

Deno.test("Deno cache preflight includes runtime-only agent dependencies", async () => {
  let cacheExpression = "";
  const result = await checkDenoCache((_command, args) => {
    cacheExpression = args.at(-1) ?? "";
    return Promise.resolve({ success: true, output: "" });
  }, false);

  assertEquals(result.status, "passed");
  assertStringIncludes(
    cacheExpression,
    'import("./src/agent/tools/ai_tools.ts")',
  );
  assertStringIncludes(
    cacheExpression,
    'import("npm:ai@4.3.19")',
  );
});
