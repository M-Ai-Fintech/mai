import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  matchingMigration,
  matchingMigrations,
} from "../../src/matching/v1.ts";

Deno.test("Matching migration owns additive scoped tables and retention-safe rollback", () => {
  assertEquals(matchingMigrations.map((migration) => migration.id), [
    "matching-0001",
  ]);
  assertEquals(matchingMigration.owner, "matching");
  assertEquals(matchingMigration.schema, "matching");
  assertStringIncludes(matchingMigration.forwardNotes, "candidate projections");
  assertStringIncludes(matchingMigration.rollbackNotes, "preserve");
  for (const statement of matchingMigration.statements) {
    assertEquals(statement.schema, "matching");
    assertEquals(statement.sql.includes("MAI-41"), false);
    assertEquals(statement.sql.includes("MAI-117"), false);
  }
  const sql = matchingMigration.statements.map((statement) => statement.sql)
    .join("\n");
  assert(sql.includes("matching.shortlist_decisions"));
  assert(sql.includes("matching.outreach_authorizations"));
  assert(sql.includes("append-only"));
});
