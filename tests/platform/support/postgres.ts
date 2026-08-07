import pg from "pg";
import { assertApprovedPostgresDatabaseUrl } from "../../../scripts/postgres_test_state.ts";

const { Pool } = pg;

export function postgresIntegrationTestDatabaseUrl(): string | undefined {
  const databaseUrl = Deno.env.get("POSTGRES_INTEGRATION_TEST_DATABASE_URL");
  if (databaseUrl === undefined) return;
  assertApprovedPostgresDatabaseUrl(databaseUrl);
  return databaseUrl;
}

export function createPostgresIntegrationTestPool(
  databaseUrl: string,
): pg.Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 8,
    connectionTimeoutMillis: 3000,
    statement_timeout: 5000,
  });
}

/** Test-only preflight for the roles provisioned by platform operations. */
export async function ensureWorkManagementTestRoles(
  pool: pg.Pool,
): Promise<void> {
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_owner') THEN
        CREATE ROLE mai_work_management_owner NOLOGIN NOINHERIT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_runtime') THEN
        CREATE ROLE mai_work_management_runtime NOLOGIN NOINHERIT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_work_management_operator') THEN
        CREATE ROLE mai_work_management_operator NOLOGIN NOINHERIT;
      END IF;
    END $$;
  `);
}

export async function dropTaskSchema(
  pool: pg.Pool,
  schema: string,
): Promise<void> {
  if (!/^postgres_integration_[a-z_]+$/.test(schema)) {
    throw new Error(
      `Test schema "${schema}" is unsafe; expected a postgres_integration_ prefix.`,
    );
  }
  await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
}

export class PostgresTestTransactionPool {
  constructor(private readonly pool: pg.Pool) {}

  async connect() {
    const client = await this.pool.connect();
    return {
      query: async (text: string, parameters: readonly unknown[] = []) => {
        const result = await client.query(text, [...parameters]);
        return {
          rows: result.rows as Record<string, unknown>[],
          rowCount: result.rowCount,
        };
      },
      release: () => client.release(),
    };
  }
}
