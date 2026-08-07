import { assert, assertEquals } from "@std/assert";
import { agentRuntimeMigrations } from "../../src/agent_runtime/migrations/index.ts";

Deno.test("Agent Runtime migration is context-owned and retention-safe", () => {
  const migration = agentRuntimeMigrations[0];
  assert(migration !== undefined);
  assertEquals(migration.owner, "agent_runtime");
  assertEquals(migration.schema, "agent_runtime");
  assert(migration.rollbackNotes.includes("retain"));
  assert(
    migration.statements.every((statement) =>
      statement.schema === "agent_runtime"
    ),
  );
  assert(
    !migration.statements.some((statement) =>
      /MAI-\d+|backlog/i.test(statement.sql)
    ),
  );
});
