import { assertEquals, assertMatch } from "@std/assert";
import { documentsMigrations } from "../../src/documents/migrations/index.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test("documents migration is one owned additive stream with retention-safe notes", () => {
  assertEquals(documentsMigrations.length, 1);
  const [migration] = documentsMigrations;
  assertEquals(migration.owner, "documents");
  assertEquals(migration.schema, "documents");
  assertEquals(migration.id, "documents-0001");
  assertMatch(migration.forwardNotes, /additive/i);
  assertMatch(migration.rollbackNotes, /retain/i);
  for (const statement of migration.statements) {
    assertEquals(statement.schema, "documents");
    assertEquals(/\bplatform\./i.test(statement.sql), false);
  }
});

Deno.test({
  name: "documents migration creates append-only version and provenance tables",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await resetDocumentsSchema(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...documentsMigrations,
    ]);

    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'documents' ORDER BY table_name`,
    );
    assertEquals(tables.rows.map(({ table_name }) => table_name), [
      "derived_artifacts",
      "document_sources",
      "document_versions",
      "documents",
      "idempotency_keys",
      "object_references",
      "processing_runs",
      "provenance_links",
    ]);

    const triggers = await pool.query<{ trigger_name: string }>(
      `SELECT trigger_name FROM information_schema.triggers
       WHERE event_object_schema = 'documents'
       ORDER BY trigger_name`,
    );
    assertEquals(
      new Set(
        triggers.rows.filter(({ trigger_name }) =>
          trigger_name.endsWith("_no_update")
        ).map(({ trigger_name }) => trigger_name),
      ).size,
      4,
    );
    await resetDocumentsSchema(pool);
    await pool.end();
  },
});

async function resetDocumentsSchema(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS documents CASCADE");
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner = $1",
    ["documents"],
  ).catch(() => {});
}
