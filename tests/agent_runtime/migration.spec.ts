import { assert, assertEquals } from "@std/assert";
import { agentRuntimeMigrations } from "../../src/agent_runtime/migrations/index.ts";

Deno.test("Agent Runtime migration is context-owned and retention-safe", () => {
  assertEquals(agentRuntimeMigrations.map(({ id }) => id), [
    "agent_runtime-0001-mission-run",
    "agent_runtime-0002-deal-scope",
  ]);
  const migration = agentRuntimeMigrations[1];
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
  assert(
    migration.statements.some((statement) =>
      statement.sql.includes("unscoped_records_quarantine")
    ),
  );
  assert(
    migration.statements.some((statement) =>
      statement.sql.includes("ALTER COLUMN workspace_id SET NOT NULL") &&
      statement.sql.includes("ALTER COLUMN deal_id SET NOT NULL")
    ),
  );
});
