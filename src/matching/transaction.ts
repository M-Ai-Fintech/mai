import type { TransactionHandle } from "../platform/persistence/v1.ts";

export interface MatchingTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult>,
    metadata?: Readonly<Record<string, string>>,
  ): Promise<TResult>;
}

class InMemoryTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>>;

  constructor(metadata: Readonly<Record<string, string>>) {
    this.metadata = metadata;
  }

  query(): Promise<never> {
    return Promise.reject(
      new Error(
        "In-memory matching transaction cannot execute SQL; expected the named repository adapter.",
      ),
    );
  }
}

export class InMemoryMatchingTransactionRunner
  implements MatchingTransactionRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult>,
    metadata: Readonly<Record<string, string>> = {},
  ): Promise<TResult> {
    return callback(new InMemoryTransaction(metadata));
  }
}
