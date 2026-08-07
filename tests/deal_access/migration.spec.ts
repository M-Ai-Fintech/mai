import { assertEquals, assertMatch } from "@std/assert";
import { dealAccessMigrations } from "../../src/deal_access/migrations/index.ts";

Deno.test("Deal Access migration owns only additive scoped tables", () => {
  assertEquals(dealAccessMigrations.length, 1);
  const [migration] = dealAccessMigrations;
  assertEquals(migration.owner, "deal_access");
  assertEquals(migration.schema, "deal_access");
  assertEquals(migration.id, "deal_access-0001");
  assertMatch(migration.forwardNotes, /additive/i);
  assertMatch(migration.rollbackNotes, /retain/i);
  for (const statement of migration.statements) {
    assertEquals(statement.schema, "deal_access");
    assertEquals(/\bplatform\./i.test(statement.sql), false);
    assertEquals(/\b(?:DROP|TRUNCATE)\b/i.test(statement.sql), false);
  }
});

Deno.test("Deal Access migration defines human-only grants and immutable audit evidence", () => {
  const sql = dealAccessMigrations[0].statements.map((statement) =>
    statement.sql
  ).join("\n");
  assertMatch(
    sql,
    /sponsor_kind TEXT NOT NULL CHECK \(sponsor_kind = 'human'\)/i,
  );
  assertMatch(sql, /object_scopes JSONB NOT NULL/i);
  assertMatch(sql, /portal_receipts/i);
  assertMatch(sql, /deal_access_audit_events_no_update/i);
  assertMatch(sql, /command_claims/i);
});
