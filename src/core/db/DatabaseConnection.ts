import pg from "pg";
import { describeError } from "../../shared/errors.ts";

const { Pool } = pg;
const TRANSIENT_DATABASE_CODES = new Set([
  "08000",
  "08003",
  "08006",
  "57P01",
  "ECONNRESET",
  "ECONNREFUSED",
]);

export interface DatabaseQueryResult<TRow> {
  rows: TRow[];
}

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return;
  return typeof error.code === "string" ? error.code : undefined;
}

function retryDelay(attempt: number): number {
  return Math.min(
    1000 * Math.pow(2, attempt) + Math.random() * 1000,
    10000,
  );
}

export class DatabaseConnection {
  protected isDbAvailable: boolean | null = null;

  constructor(
    protected readonly pool: pg.Pool = createDatabasePool(),
  ) {}

  /**
   * Verifies database connectivity without failing application startup.
   *
   * @example
   * const connected = await connection.connect();
   */
  async connect(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      client.release();
      this.isDbAvailable = true;
      return true;
    } catch (error) {
      console.error("Failed to connect to the database:", describeError(error));
      this.isDbAvailable = false;
      return false;
    }
  }

  /**
   * Executes a parameterized query and retries transient database failures.
   *
   * @example
   * const result = await connection.query<{ id: string }>("SELECT id");
   */
  async query<TRow = Record<string, unknown>>(
    text: string,
    params: unknown[] = [],
    retries = 3,
  ): Promise<DatabaseQueryResult<TRow>> {
    this.assertConnectionAvailable(text);
    return await this.queryWithRetry<TRow>(text, params, retries);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private assertConnectionAvailable(queryText: string): void {
    if (this.isDbAvailable !== false) return;
    throw new Error(
      `Database query "${
        queryText.slice(0, 80)
      }" cannot run; expected an available connection pool.`,
    );
  }

  private async queryWithRetry<TRow>(
    text: string,
    params: unknown[],
    retries: number,
  ): Promise<DatabaseQueryResult<TRow>> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.pool.query(text, params);
        this.isDbAvailable = true;
        return result as DatabaseQueryResult<TRow>;
      } catch (error) {
        if (!this.shouldRetry(error, attempt, retries)) throw error;
        await this.waitBeforeRetry(error, attempt + 1, retries);
      }
    }
    throw exhaustedRetries(text, retries);
  }

  private shouldRetry(
    error: unknown,
    attempt: number,
    retries: number,
  ): boolean {
    const code = databaseErrorCode(error);
    if (code === "ECONNREFUSED") this.isDbAvailable = false;
    return attempt < retries && code !== undefined &&
      TRANSIENT_DATABASE_CODES.has(code);
  }

  private async waitBeforeRetry(
    error: unknown,
    attempt: number,
    retries: number,
  ): Promise<void> {
    const delay = retryDelay(attempt);
    console.warn(
      `Database query failed with code "${
        databaseErrorCode(error) ?? "unknown"
      }"; retrying in ${Math.round(delay)}ms (${attempt}/${retries}).`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

function exhaustedRetries(text: string, retries: number): Error {
  return new Error(
    `Database query "${
      text.slice(0, 80)
    }" exhausted ${retries} retries; expected a query result.`,
  );
}

function createDatabasePool(): pg.Pool {
  const connectionString = Deno.env.get("DATABASE_URL") ||
    "postgres://postgres:postgres@localhost:5432/mai";
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  pool.on("error", (error) => {
    console.error("Unexpected error on idle database client:", error.message);
  });
  return pool;
}
