import { assert, assertEquals } from "@std/assert";
import {
  auditActivityEventsMigration,
  auditActivityMigrations,
} from "../../src/audit_activity/v1.ts";

Deno.test("audit migration owns append-only events and redaction overlays", () => {
  assertEquals(auditActivityMigrations, [auditActivityEventsMigration]);
  assertEquals(auditActivityEventsMigration.owner, "audit_activity");
  assertEquals(auditActivityEventsMigration.schema, "audit_activity");
  assertEquals(auditActivityEventsMigration.version, 1);

  const sql = auditActivityEventsMigration.statements.map((statement) =>
    statement.sql
  ).join("\n");
  assert(sql.includes("CREATE TABLE audit_activity.audit_events"));
  assert(sql.includes("CREATE TABLE audit_activity.redaction_overlays"));
  assert(
    sql.includes("BEFORE UPDATE OR DELETE ON audit_activity.audit_events"),
  );
  assert(
    sql.includes(
      "BEFORE UPDATE OR DELETE ON audit_activity.redaction_overlays",
    ),
  );
  assert(sql.includes("audit_activity history is append-only"));
  assert(sql.includes("FOREIGN KEY (tenant_id, target_event_id)"));
  assert(!/DROP\s+(TABLE|SCHEMA|FUNCTION)/i.test(sql));
  assert(!/DELETE\s+FROM/i.test(sql));
});

Deno.test("audit migration notes retain history on rollback", () => {
  assert(auditActivityEventsMigration.forwardNotes.includes("append-only"));
  assert(auditActivityEventsMigration.rollbackNotes.includes("retaining"));
});
