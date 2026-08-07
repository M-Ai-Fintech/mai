import pg from "pg";
import type { TransactionPool } from "../platform/persistence/transaction.ts";
import { PostgresTransactionRunner } from "../platform/persistence/transaction.ts";
import type {
  AgentRuntimeStore,
  RuntimeEventSink,
  RuntimeTransaction,
} from "./repository.ts";
import { PostgresRuntimeTransaction } from "./postgres_runtime_transaction.ts";

export class PostgresAgentRuntimeStore implements AgentRuntimeStore {
  private readonly transactions: PostgresTransactionRunner;

  constructor(
    pool: TransactionPool | pg.Pool,
    private readonly eventSink?: RuntimeEventSink,
  ) {
    this.transactions = new PostgresTransactionRunner(pool);
  }

  transaction<TResult>(
    work: (transaction: RuntimeTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.transactions.run((transaction) =>
      work(new PostgresRuntimeTransaction(transaction, this.eventSink))
    );
  }
}
