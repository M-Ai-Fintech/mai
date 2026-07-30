import pg from "pg";
import {
  ContextMigration,
  defineMigration,
  orderMigrations,
} from "./migration.ts";

const MIGRATION_LOCK_NAME = "mai:context-migrations:v1";

interface LedgerRow {
  checksum: string;
}

export class PostgresMigrationRunner {
  constructor(private readonly pool: pg.Pool) {}

  /**
   * Applies owner streams under one session-level PostgreSQL advisory lock.
   *
   * @example await runner.apply(platformMigrations)
   */
  async apply(migrations: readonly ContextMigration[]): Promise<void> {
    const validated = migrations.map(defineMigration);
    const client = await this.pool.connect();
    try {
      await lockMigrations(client);
      await ensureMigrationLedger(client);
      for (const migration of orderMigrations(validated)) {
        await applyMigration(client, migration);
      }
    } finally {
      await unlockMigrations(client).catch(() => {});
      client.release();
    }
  }
}

/**
 * Produces the stable SHA-256 recorded for one migration definition.
 *
 * @example await migrationChecksum(migration)
 */
export async function migrationChecksum(
  migration: ContextMigration,
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalMigration(migration));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), toHex).join("");
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function canonicalMigration(migration: ContextMigration): string {
  return JSON.stringify({
    owner: migration.owner,
    schema: migration.schema,
    id: migration.id,
    version: migration.version,
    forwardNotes: migration.forwardNotes,
    rollbackNotes: migration.rollbackNotes,
    statements: migration.statements,
  });
}

async function applyMigration(
  client: pg.PoolClient,
  migration: ContextMigration,
): Promise<void> {
  const checksum = await migrationChecksum(migration);
  const applied = await appliedMigration(client, migration);
  if (applied !== undefined) {
    assertMatchingChecksum(migration, applied.checksum, checksum);
    return;
  }
  await executeMigrationTransaction(client, migration, checksum);
}

async function appliedMigration(
  client: pg.PoolClient,
  migration: ContextMigration,
): Promise<LedgerRow | undefined> {
  const result = await client.query<LedgerRow>(
    `SELECT checksum FROM platform.migration_ledger
     WHERE context_owner = $1 AND migration_id = $2`,
    [migration.owner, migration.id],
  );
  return result.rows[0];
}

function assertMatchingChecksum(
  migration: ContextMigration,
  applied: string,
  requested: string,
): void {
  if (applied === requested) return;
  throw new Error(
    `Migration "${migration.id}" checksum mismatch "${requested}"; expected applied checksum "${applied}".`,
  );
}

async function executeMigrationTransaction(
  client: pg.PoolClient,
  migration: ContextMigration,
  checksum: string,
): Promise<void> {
  await client.query("BEGIN");
  try {
    await installOwnedSearchPath(client, migration.schema);
    for (const statement of migration.statements) {
      await client.query(statement.sql);
    }
    await recordMigration(client, migration, checksum);
    await client.query("COMMIT");
  } catch (error) {
    await rollbackMigration(client, error);
  }
}

function installOwnedSearchPath(
  client: pg.PoolClient,
  schema: string,
): Promise<pg.QueryResult> {
  return client.query(
    "SELECT set_config('search_path', $1, true)",
    [`"${schema}",pg_catalog`],
  );
}

async function rollbackMigration(
  client: pg.PoolClient,
  original: unknown,
): Promise<never> {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    throw new AggregateError(
      [original, rollbackError],
      "Migration failed and rollback also failed.",
    );
  }
  throw original;
}

function recordMigration(
  client: pg.PoolClient,
  migration: ContextMigration,
  checksum: string,
): Promise<pg.QueryResult> {
  return client.query(
    `INSERT INTO platform.migration_ledger (
       context_owner, schema_name, migration_id, version, checksum,
       forward_notes, rollback_notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      migration.owner,
      migration.schema,
      migration.id,
      migration.version,
      checksum,
      migration.forwardNotes,
      migration.rollbackNotes,
    ],
  );
}

function lockMigrations(client: pg.PoolClient): Promise<pg.QueryResult> {
  return client.query("SELECT pg_advisory_lock(hashtext($1))", [
    MIGRATION_LOCK_NAME,
  ]);
}

function unlockMigrations(client: pg.PoolClient): Promise<pg.QueryResult> {
  return client.query("SELECT pg_advisory_unlock(hashtext($1))", [
    MIGRATION_LOCK_NAME,
  ]);
}

async function ensureMigrationLedger(client: pg.PoolClient): Promise<void> {
  await client.query("CREATE SCHEMA IF NOT EXISTS platform");
  await client.query(`
    CREATE TABLE IF NOT EXISTS platform.migration_ledger (
      context_owner TEXT NOT NULL,
      schema_name TEXT NOT NULL,
      migration_id TEXT NOT NULL,
      version BIGINT NOT NULL CHECK (version > 0),
      checksum CHAR(64) NOT NULL,
      forward_notes TEXT NOT NULL,
      rollback_notes TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (context_owner, migration_id),
      UNIQUE (context_owner, version)
    )
  `);
}
