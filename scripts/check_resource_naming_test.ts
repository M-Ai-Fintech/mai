import { assertEquals } from "@std/assert";
import {
  findForbiddenResourceNames,
  findForbiddenResourcePathNames,
} from "./check_resource_naming.ts";

Deno.test("resource naming guard rejects task-derived environment names", () => {
  const legacy = ["MAI", "106_DATABASE_URL"].join("");
  assertEquals(findForbiddenResourceNames(legacy, "fixture"), [{
    path: "fixture",
    token: legacy,
  }]);
});

Deno.test("resource naming guard rejects task-derived database and helper names", () => {
  assertEquals(
    findForbiddenResourceNames("mai_test_mai106", "fixture").length,
    1,
  );
  assertEquals(
    findForbiddenResourceNames("createMai106Pool", "fixture").length,
    1,
  );
});

Deno.test("resource naming guard accepts semantic names and governance references", () => {
  assertEquals(
    findForbiddenResourceNames(
      "POSTGRES_INTEGRATION_TEST_DATABASE_URL and MAI-114",
      "fixture",
    ),
    [],
  );
});

Deno.test("resource naming guard rejects task-derived file paths", () => {
  for (
    const path of [
      "gui/conformance/mai102-authority-matrix.json",
      "scripts/mai110_runtime.ts",
      ".github/workflows/mai98-review.yml",
    ]
  ) {
    assertEquals(findForbiddenResourcePathNames(path).length, 1);
  }
  assertEquals(
    findForbiddenResourcePathNames("backlog/tasks/MAI-114.md"),
    [],
  );
});
