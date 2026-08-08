import pg from "pg";
import { PostgresMigrationRunner } from "../src/platform/persistence/v1.ts";
import { registeredMigrations } from "../src/platform/persistence/registered_migrations.ts";

/** Applies every registered migration once, before local API traffic. */
export async function runMigrations(
  environment: Readonly<Record<string, string | undefined>> = Deno.env
    .toObject(),
): Promise<void> {
  const connectionString = requiredLocalDatabaseUrl(environment.DATABASE_URL);
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });
  try {
    await preProvisionLocalRoles(pool, environment);
    const before = await ledgerCount(pool);
    const migrations = registeredMigrations();
    await new PostgresMigrationRunner(pool).apply(migrations);
    const after = await ledgerCount(pool);
    console.log(JSON.stringify({
      event: "migrations.applied",
      registered: migrations.length,
      ledgerBefore: before,
      ledgerAfter: after,
      rerunnable: true,
    }));
  } finally {
    await pool.end();
  }
}

async function preProvisionLocalRoles(
  pool: pg.Pool,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  if (environment.LOCAL_PREPROVISION_ROLES !== "true") return;
  await pool.query(`
    DO $$
    DECLARE
      role_name TEXT;
    BEGIN
      FOREACH role_name IN ARRAY ARRAY[
        'mai_work_management_owner',
        'mai_work_management_runtime',
        'mai_work_management_operator'
      ] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
          EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
        END IF;
      END LOOP;
    END
    $$;
  `);
}

function requiredLocalDatabaseUrl(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      "Migration database configuration is missing; expected DATABASE_URL for a local PostgreSQL target.",
    );
  }
  const url = new URL(value);
  if (
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    !["postgres:", "postgresql:"].includes(url.protocol)
  ) {
    throw new Error(
      `Migration database host/protocol "${url.hostname}/${url.protocol}" is not local; expected a local PostgreSQL target.`,
    );
  }
  return value;
}

async function ledgerCount(pool: pg.Pool): Promise<number> {
  try {
    const result = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM platform.migration_ledger",
    );
    return Number(result.rows[0]?.count ?? "0");
  } catch (error) {
    if (isMissingLedger(error)) return 0;
    throw error;
  }
}

function isMissingLedger(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "42P01";
}

if (import.meta.main) await runMigrations();
