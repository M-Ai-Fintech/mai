import { assertEquals, assertStringIncludes } from "@std/assert";
import { runDocumentationCheck, validateMigrationMap } from "./check_docs.ts";

function validMap(): Record<string, unknown> {
  return {
    activeSystemOfRecord: "Linear",
    linearTeam: { key: "MAI" },
    counts: { tasks: 4, documents: 1 },
    tasks: [1, 2, 3, 4].map((index) => ({
      legacyId: `MAI-${index + 60}`,
      linearIssueId: `MAI-${index}`,
      ordinal: index + 1,
      originalRepositoryPath: `backlog/tasks/mai-${index + 60}.md`,
    })),
    documents: [{
      legacyDocumentKey: "doc-1",
      linearDocumentId: "document-1",
      originalRepositoryPath: "backlog/docs/doc-1.md",
    }],
  };
}

Deno.test("documentation check accepts a complete Linear migration map", () => {
  assertEquals(validateMigrationMap(validMap()), []);
});

Deno.test("documentation check rejects broken ordinal mapping", () => {
  const map = validMap();
  (map.tasks as Array<Record<string, unknown>>)[2].ordinal = 1;
  const diagnostics = validateMigrationMap(map);
  assertEquals(diagnostics.map((item) => item.code), ["invalid-task-order"]);
});

Deno.test("documentation check rejects missing migrated records", () => {
  const map = validMap();
  (map.counts as Record<string, unknown>).documents = 2;
  const diagnostics = validateMigrationMap(map);
  assertEquals(diagnostics.map((item) => item.code), [
    "migration-count-mismatch",
  ]);
});

Deno.test("documentation check reports a missing map path", async () => {
  const diagnostics = await runDocumentationCheck(
    "/tmp/mai-missing-linear-map.json",
  );
  assertEquals(diagnostics.length, 1);
  assertStringIncludes(
    diagnostics[0].message,
    "Cannot read or parse migration map",
  );
});
