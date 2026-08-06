import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import pg from "pg";
import {
  defineMigration,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
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
  assert(
    notificationsMigration.statements.some((statement) =>
      statement.sql.includes("delivery_receipts_append_only")
    ),
  );
  assert(
    notificationsMigration.statements.some((statement) =>
      statement.sql.includes("idempotency_records") &&
      statement.sql.includes("deal_id TEXT NOT NULL")
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

Deno.test("PostgreSQL notification migration is idempotent and receipts are append-only", async () => {
  const databaseUrl = requiredDatabaseUrl();
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  const receiptId = `receipt_migration_${crypto.randomUUID()}`;
  try {
    const runner = new PostgresMigrationRunner(pool);
    await runner.apply(notificationMigrations);
    await runner.apply(notificationMigrations);
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'notifications' ORDER BY table_name`,
    );
    assertEquals(tables.rows.map((row) => row.table_name), [
      "delivery_receipts",
      "idempotency_records",
      "projections",
      "subscriptions",
    ]);
    const trigger = await pool.query<{ trigger_name: string }>(
      `SELECT DISTINCT trigger_name FROM information_schema.triggers
       WHERE event_object_schema = 'notifications'
         AND event_object_table = 'delivery_receipts'`,
    );
    assertEquals(trigger.rows.map((row) => row.trigger_name), [
      "delivery_receipts_append_only",
    ]);
    await pool.query(
      `INSERT INTO notifications.delivery_receipts (
        receipt_id, tenant_id, workspace_id, deal_id, recipient_id,
        notification_id, job_id, channel, attempt_number, outcome,
        failure_code, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        receiptId,
        "tenant_migration",
        "workspace_migration",
        "deal_migration",
        "actor_migration",
        "notif_migration",
        "job_migration",
        "in_app",
        1,
        "attempted",
        null,
        new Date("2026-08-04T12:00:00.000Z"),
      ],
    );
    await assertRejects(
      () =>
        pool.query(
          `UPDATE notifications.delivery_receipts
           SET outcome = 'succeeded' WHERE receipt_id = $1`,
          [receiptId],
        ),
      Error,
      "append-only",
    );
    await assertRejects(
      () =>
        pool.query(
          "DELETE FROM notifications.delivery_receipts WHERE receipt_id = $1",
          [receiptId],
        ),
      Error,
      "append-only",
    );
    const receipt = await pool.query<{ outcome: string }>(
      "SELECT outcome FROM notifications.delivery_receipts WHERE receipt_id = $1",
      [receiptId],
    );
    assertEquals(receipt.rows, [{ outcome: "attempted" }]);
  } finally {
    await pool.end();
  }
});

function requiredDatabaseUrl(): string {
  const databaseUrl = Deno.env.get(
    "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL",
  );
  if (databaseUrl === undefined) {
    throw new Error(
      "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL is required; expected a fresh isolated PostgreSQL database for MAI-123 integration evidence.",
    );
  }
  const parsed = new URL(databaseUrl);
  if (parsed.pathname !== "/mai_test_notifications_integration") {
    throw new Error(
      `NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL database "${parsed.pathname}" is unsafe; expected "/mai_test_notifications_integration".`,
    );
  }
  return databaseUrl;
}
