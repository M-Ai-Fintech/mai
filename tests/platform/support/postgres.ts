import pg from "pg";

const { Pool } = pg;
const ISOLATED_DATABASE_NAME = "mai_test_mai106";

export function mai106DatabaseUrl(): string | undefined {
  const databaseUrl = Deno.env.get("MAI106_DATABASE_URL");
  if (databaseUrl === undefined) return;
  const parsed = new URL(databaseUrl);
  if (parsed.pathname !== `/${ISOLATED_DATABASE_NAME}`) {
    throw new Error(
      `MAI106_DATABASE_URL database "${parsed.pathname}" is unsafe; expected "/${ISOLATED_DATABASE_NAME}".`,
    );
  }
  return databaseUrl;
}

export function createMai106Pool(databaseUrl: string): pg.Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 8,
    connectionTimeoutMillis: 3000,
    statement_timeout: 5000,
  });
}

export async function dropTaskSchema(
  pool: pg.Pool,
  schema: string,
): Promise<void> {
  if (!/^mai106_[a-z_]+$/.test(schema)) {
    throw new Error(
      `Test schema "${schema}" is unsafe; expected a mai106_ prefix.`,
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
