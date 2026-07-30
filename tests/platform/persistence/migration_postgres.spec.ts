import { assertEquals, assertRejects } from "@std/assert";
import {
  ContextMigration,
  defineMigration,
  PostgresMigrationRunner,
} from "../../../src/platform/persistence/v1.ts";
import {
  createMai106Pool,
  dropTaskSchema,
  mai106DatabaseUrl,
} from "../support/postgres.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name: "PostgreSQL migrations apply once and reject checksum drift",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    const schema = "mai106_checksum";
    await dropTaskSchema(pool, schema);
    const runner = new PostgresMigrationRunner(pool);
    await clearMigrationEvidence(pool, schema);
    const migration = tableMigration(schema, "TEXT");
    await runner.apply([migration]);
    await runner.apply([migration]);

    const ledger = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM platform.migration_ledger
       WHERE context_owner = $1 AND migration_id = $2`,
      [schema, `${schema}-0001`],
    );
    assertEquals(ledger.rows[0].count, "1");
    await assertRejects(
      () => runner.apply([tableMigration(schema, "BIGINT")]),
      Error,
      "checksum mismatch",
    );
    await dropTaskSchema(pool, schema);
    await clearMigrationEvidence(pool, schema);
    await pool.end();
  },
});

Deno.test({
  name: "failed PostgreSQL migration rolls back its context changes",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    const schema = "mai106_failure";
    await dropTaskSchema(pool, schema);
    const runner = new PostgresMigrationRunner(pool);
    const migration = defineMigration({
      owner: schema,
      schema,
      id: `${schema}-0001`,
      version: 1,
      forwardNotes: "Prove transactional migration rollback.",
      rollbackNotes: "No consumer can observe the failed table.",
      statements: [
        { schema, sql: `CREATE SCHEMA ${schema}` },
        { schema, sql: `CREATE TABLE ${schema}.fixture (id TEXT PRIMARY KEY)` },
        { schema, sql: "SELECT missing_column FROM missing_table" },
      ],
    });

    await assertRejects(() => runner.apply([migration]));
    const table = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'fixture'`,
      [schema],
    );
    assertEquals(table.rows, []);
    await dropTaskSchema(pool, schema);
    await pool.end();
  },
});

Deno.test({
  name: "concurrent migration runners serialize one owner stream",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    const schema = "mai106_locking";
    await dropTaskSchema(pool, schema);
    await clearMigrationEvidence(pool, schema);
    const migration = tableMigration(schema, "TEXT");
    await Promise.all([
      new PostgresMigrationRunner(pool).apply([migration]),
      new PostgresMigrationRunner(pool).apply([migration]),
    ]);
    const count = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM platform.migration_ledger
       WHERE context_owner = $1`,
      [schema],
    );
    assertEquals(count.rows[0].count, "1");
    await dropTaskSchema(pool, schema);
    await clearMigrationEvidence(pool, schema);
    await pool.end();
  },
});

Deno.test({
  name: "migration runner enforces ownership on structural inputs",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    const migration: ContextMigration = {
      owner: "platform",
      schema: "platform",
      id: "platform-unsafe",
      version: 99,
      forwardNotes: "Unsafe structural input.",
      rollbackNotes: "Not applicable.",
      statements: [{
        schema: "deals",
        sql: "CREATE TABLE deals.unsafe(id TEXT)",
      }],
    };

    await assertRejects(
      () => new PostgresMigrationRunner(pool).apply([migration]),
      Error,
      'statement schema "deals"',
    );
    await pool.end();
  },
});

function tableMigration(schema: string, columnType: string) {
  return defineMigration({
    owner: schema,
    schema,
    id: `${schema}-0001`,
    version: 1,
    forwardNotes: "Create an isolated migration fixture.",
    rollbackNotes: "Disable consumers and retain successful rows.",
    statements: [
      { schema, sql: `CREATE SCHEMA ${schema}` },
      {
        schema,
        sql: `CREATE TABLE ${schema}.fixture (id ${columnType} PRIMARY KEY)`,
      },
    ],
  });
}

async function clearMigrationEvidence(
  pool: ReturnType<typeof createMai106Pool>,
  owner: string,
): Promise<void> {
  await pool.query(
    "DELETE FROM platform.migration_ledger WHERE context_owner = $1",
    [owner],
  ).catch(() => {});
}
