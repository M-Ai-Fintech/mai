import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";

export interface TransactionQueryResult<TRow> {
  readonly rows: TRow[];
  readonly rowCount: number | null;
}

export interface TransactionConnection {
  query(
    text: string,
    parameters?: readonly unknown[],
  ): Promise<TransactionQueryResult<Record<string, unknown>>>;
  release(): void;
}

export interface TransactionPool {
  connect(): Promise<TransactionConnection>;
}

export interface TransactionHandle {
  readonly metadata: Readonly<Record<string, string>>;
  query<TRow = Record<string, unknown>>(
    text: string,
    parameters?: readonly unknown[],
  ): Promise<TransactionQueryResult<TRow>>;
}

export interface TransactionScopeInstaller {
  install(
    transaction: TransactionHandle,
    metadata: Readonly<Record<string, string>>,
  ): Promise<void>;
}

export class NoopTransactionScopeInstaller
  implements TransactionScopeInstaller {
  /**
   * Leaves transaction-local scope untouched until verified RLS adoption.
   *
   * @example await installer.install(transaction, {})
   */
  install(): Promise<void> {
    return Promise.resolve();
  }
}

export class PostgresTransactionRunner {
  private readonly active = new AsyncLocalStorage<ActiveTransactionHandle>();
  private readonly pool: TransactionPool;
  private readonly scopeInstaller: TransactionScopeInstaller;

  constructor(
    pool: TransactionPool | pg.Pool,
    scopeInstaller: TransactionScopeInstaller =
      new NoopTransactionScopeInstaller(),
  ) {
    this.pool = pool instanceof pg.Pool ? new PgTransactionPool(pool) : pool;
    this.scopeInstaller = scopeInstaller;
  }

  /**
   * Runs one callback on one checked-out connection and closes its handle.
   *
   * @example await runner.run((transaction) => transaction.query("SELECT 1"))
   */
  async run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
    metadata: Readonly<Record<string, string>> = {},
  ): Promise<TResult> {
    this.assertNotNested();
    const connection = await this.pool.connect();
    const transaction = new ActiveTransactionHandle(connection, metadata);
    try {
      await connection.query("BEGIN");
      return await this.active.run(
        transaction,
        () => executeTransaction(transaction, callback, this.scopeInstaller),
      );
    } finally {
      transaction.complete();
      connection.release();
    }
  }

  private assertNotNested(): void {
    if (this.active.getStore() === undefined) return;
    throw new Error(
      "Nested transaction is unsafe; expected the existing callback handle to be reused.",
    );
  }
}

class PgTransactionPool implements TransactionPool {
  constructor(private readonly pool: pg.Pool) {}

  async connect(): Promise<TransactionConnection> {
    const client = await this.pool.connect();
    return {
      query: async (text, parameters = []) => {
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

class ActiveTransactionHandle implements TransactionHandle {
  private completed = false;

  constructor(
    private readonly connection: TransactionConnection,
    readonly metadata: Readonly<Record<string, string>>,
  ) {}

  query<TRow>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<TransactionQueryResult<TRow>> {
    if (this.completed) {
      return Promise.reject(
        new Error(
          `Transaction query "${
            text.slice(0, 80)
          }" cannot run; handle is already completed.`,
        ),
      );
    }
    return this.connection.query(text, parameters) as Promise<
      TransactionQueryResult<TRow>
    >;
  }

  complete(): void {
    this.completed = true;
  }
}

async function executeTransaction<TResult>(
  transaction: ActiveTransactionHandle,
  callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  installer: TransactionScopeInstaller,
): Promise<TResult> {
  try {
    await installer.install(transaction, transaction.metadata);
    const result = await callback(transaction);
    assertHandleDidNotEscape(result, transaction);
    await transaction.query("COMMIT");
    return result;
  } catch (error) {
    return await rollbackAndRethrow(transaction, error);
  }
}

function assertHandleDidNotEscape(
  result: unknown,
  transaction: TransactionHandle,
): void {
  if (result !== transaction) return;
  throw new Error(
    "Transaction handle escaped its callback; expected an application result.",
  );
}

async function rollbackAndRethrow(
  transaction: TransactionHandle,
  original: unknown,
): Promise<never> {
  try {
    await transaction.query("ROLLBACK");
  } catch (rollbackError) {
    throw new AggregateError(
      [original, rollbackError],
      "Transaction failed and rollback also failed.",
    );
  }
  throw original;
}
