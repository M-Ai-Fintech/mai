import { assert, assertEquals, assertMatch } from "@std/assert";
import { migrationChecksum } from "../../src/platform/persistence/migration_runner.ts";
import {
  closingControlMigration,
  closingMigrations,
} from "../../src/closing/migrations/index.ts";

Deno.test("Closing migration is additive and owns only the Closing schema", async () => {
  assertEquals(closingMigrations, [closingControlMigration]);
  assertEquals(closingControlMigration.owner, "closing");
  assertEquals(closingControlMigration.schema, "closing");
  assertEquals(closingControlMigration.version, 1);
  assertMatch(closingControlMigration.forwardNotes, /additive/i);
  assertMatch(closingControlMigration.rollbackNotes, /retain/i);
  const sql = closingControlMigration.statements.map((statement) =>
    statement.sql
  ).join("\n");
  assert(sql.includes("closing.workspaces"));
  assert(sql.includes("closing.command_results"));
  assert(sql.includes("closing.effect_records"));
  assert(!/\b(?:DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(sql));
  assert(
    !/\b(?:platform|work_management|deal_management|evidence_knowledge)\s*\./i
      .test(sql),
  );
  assert(
    closingControlMigration.statements.every((statement) =>
      statement.schema === "closing"
    ),
  );
  assertEquals(
    await migrationChecksum(closingControlMigration),
    await migrationChecksum(closingControlMigration),
  );
});
