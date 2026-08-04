import { assert, assertEquals, assertThrows } from "@std/assert";
import { defineMigration } from "../../src/platform/persistence/v1.ts";
import {
  notificationMigrations,
  notificationsMigration,
} from "../../src/notifications/migrations/index.ts";

Deno.test("notification migration owns only its schema and records rollback evidence", () => {
  assertEquals(notificationMigrations, [notificationsMigration]);
  assertEquals(notificationsMigration.owner, "notifications");
  assertEquals(notificationsMigration.schema, "notifications");
  assert(notificationsMigration.forwardNotes.includes("MVP"));
  assert(notificationsMigration.rollbackNotes.includes("durable"));
  assert(
    notificationsMigration.statements.every((statement) =>
      statement.schema === "notifications"
    ),
  );
  assert(
    notificationsMigration.statements.some((statement) =>
      statement.sql.includes("delivery_receipts")
    ),
  );
  assert(
    notificationsMigration.statements.some((statement) =>
      statement.sql.includes("COALESCE(deal_id, '')")
    ),
  );
});

Deno.test("notification migration rejects foreign schema references", () => {
  assertThrows(
    () =>
      defineMigration({
        ...notificationsMigration,
        id: "notifications-9999",
        version: 9999,
        statements: [{
          schema: "notifications",
          sql: "CREATE TABLE platform.foreign_table (id TEXT)",
        }],
      }),
    Error,
    "references schema",
  );
});
