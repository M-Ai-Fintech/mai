import { assertEquals, assertStringIncludes } from "@std/assert";
import { CLEAN_BOOTSTRAP_STEPS } from "./infra_bootstrap.ts";

Deno.test("clean bootstrap plan includes the documented executable sequence", () => {
  assertEquals(CLEAN_BOOTSTRAP_STEPS[0], ["deno", "task", "local:prepare"]);
  assertStringIncludes(CLEAN_BOOTSTRAP_STEPS[1].join(" "), "postgres-local");
  assertStringIncludes(CLEAN_BOOTSTRAP_STEPS[1].join(" "), "storage-local");
  assertEquals(CLEAN_BOOTSTRAP_STEPS[4], ["deno", "task", "local:mvp:seed"]);
  assertStringIncludes(CLEAN_BOOTSTRAP_STEPS[5].join(" "), "--build");
  assertEquals(CLEAN_BOOTSTRAP_STEPS[6], ["deno", "task", "infra:smoke"]);
});
