import { assertEquals, assertMatch } from "@std/assert";
import { dealAccessMigrations } from "../../src/deal_access/migrations/index.ts";

Deno.test("Deal Access migration owns only additive scoped tables", () => {
  assertEquals(dealAccessMigrations.length, 3);
  assertEquals(
    dealAccessMigrations.map((migration) => migration.id),
    [
      "deal_access-0001",
      "deal_access-0002",
      "deal_access-0003-delivery-identity",
    ],
  );
  for (const migration of dealAccessMigrations) {
    assertEquals(migration.owner, "deal_access");
    assertEquals(migration.schema, "deal_access");
    assertMatch(migration.forwardNotes, /additive/i);
    assertMatch(migration.rollbackNotes, /retain/i);
    for (const statement of migration.statements) {
      assertEquals(statement.schema, "deal_access");
      assertEquals(/\bplatform\./i.test(statement.sql), false);
      assertEquals(/\b(?:DROP|TRUNCATE)\b/i.test(statement.sql), false);
    }
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

Deno.test("Deal Access upgrade migration persists invitation and retry contracts", () => {
  const sql = dealAccessMigrations[1].statements.map((statement) =>
    statement.sql
  ).join("\n");
  assertMatch(sql, /invitation_token_digest CHAR\(64\)/i);
  assertMatch(sql, /repeat\('0', 64\)/i);
  assertMatch(sql, /state TEXT NOT NULL DEFAULT 'pending'/i);
  assertMatch(sql, /attempt_count INTEGER NOT NULL DEFAULT 0/i);
  assertMatch(sql, /last_error TEXT/i);
  assertMatch(sql, /completed_at TIMESTAMPTZ/i);
  assertMatch(sql, /session_invalidations_pending_idx/i);
});

Deno.test("Deal Access delivery migration preserves a stable retry identity", () => {
  const migration = dealAccessMigrations[2];
  const sql = migration.statements.map((statement) => statement.sql).join("\n");
  assertMatch(sql, /ADD COLUMN delivery_id TEXT/i);
  assertMatch(sql, /delivery_attempt_count INTEGER NOT NULL DEFAULT 0/i);
  assertMatch(sql, /last_delivery_error TEXT/i);
  assertMatch(sql, /delivery_completed_at TIMESTAMPTZ/i);
  assertMatch(sql, /delivery_id = submission_id/i);
  assertMatch(sql, /UNIQUE \(tenant_id, workspace_id, deal_id, delivery_id\)/i);
});
