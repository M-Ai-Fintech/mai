import { assertEquals } from "@std/assert";
import { findActiveBacklogReferences } from "./check_linear_policy.ts";

Deno.test("policy check catches removed Backlog workflow dependencies", () => {
  const diagnostics = findActiveBacklogReferences(
    "Backlog is the system of record; use backlog/tasks for task records.",
    "prompt.md",
  );
  assertEquals(diagnostics.length, 2);
});

Deno.test("policy check allows runtime backlog terminology and migration metadata", () => {
  assertEquals(
    findActiveBacklogReferences(
      "The job backlog is bounded. Legacy Backlog IDs live in the migration map.",
      "docs/migrations/backlog-to-linear-map.json",
    ),
    [],
  );
});
