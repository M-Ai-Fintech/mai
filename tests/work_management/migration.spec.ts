import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  workManagementMigration,
  workManagementMigrations,
} from "../../src/work_management/migrations/index.ts";

Deno.test("Work Management migration is additive, owned, and append-only", () => {
  assertEquals(workManagementMigrations, [workManagementMigration]);
  assertEquals(workManagementMigration.owner, "work_management");
  assertEquals(workManagementMigration.schema, "work_management");
  assertEquals(workManagementMigration.version, 1);
  const sql = workManagementMigration.statements.map((statement) =>
    statement.sql
  ).join("\n");
  assertStringIncludes(sql, "CREATE SCHEMA IF NOT EXISTS work_management");
  assertStringIncludes(sql, "approval_decision_history");
  assertStringIncludes(sql, "aggregate_history_no_update_or_delete");
  assertStringIncludes(sql, "approval_decision_history_no_update_or_delete");
  assert(!/\b(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(sql));
  assert(
    !/\b(?:platform|deal_management|evidence_knowledge|identity_access|notifications)\s*\./i
      .test(sql),
  );
});
