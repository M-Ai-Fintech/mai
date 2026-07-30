import { assertEquals, assertRejects } from "@std/assert";
import {
  PostgresTransactionRunner,
  TransactionHandle,
} from "../../../src/platform/persistence/v1.ts";

Deno.test("transaction callback failure rolls back and closes its handle", async () => {
  const connection = new FailureInjectionTransactionConnection();
  const runner = new PostgresTransactionRunner(
    new FailureInjectionTransactionPool(connection),
  );
  let captured: TransactionHandle | undefined;

  await assertRejects(
    () =>
      runner.run(async (transaction) => {
        captured = transaction;
        await transaction.query("INSERT INTO fixture VALUES ($1)", ["value"]);
        throw new Error("callback failure");
      }),
    Error,
    "callback failure",
  );
  assertEquals(connection.commands, [
    "BEGIN",
    "INSERT INTO fixture VALUES ($1)",
    "ROLLBACK",
    "RELEASE",
  ]);
  await assertRejects(
    () => captured!.query("SELECT 1"),
    Error,
    "already completed",
  );
});

Deno.test("commit and rollback failures retain the original failure", async () => {
  const commitConnection = new FailureInjectionTransactionConnection({
    COMMIT: new Error("commit failure"),
  });
  const commitRunner = new PostgresTransactionRunner(
    new FailureInjectionTransactionPool(commitConnection),
  );
  await assertRejects(
    () => commitRunner.run(() => Promise.resolve("done")),
    Error,
    "commit failure",
  );
  assertEquals(commitConnection.commands, [
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
    "RELEASE",
  ]);

  const rollbackConnection = new FailureInjectionTransactionConnection({
    ROLLBACK: new Error("rollback failure"),
  });
  const rollbackRunner = new PostgresTransactionRunner(
    new FailureInjectionTransactionPool(rollbackConnection),
  );
  const failure = await assertRejects(
    () =>
      rollbackRunner.run(() => {
        throw new Error("original failure");
      }),
    AggregateError,
    "rollback also failed",
  );
  assertEquals(failure.errors.map((error) => error.message), [
    "original failure",
    "rollback failure",
  ]);
});

Deno.test("nested transaction attempts fail safely", async () => {
  const connection = new FailureInjectionTransactionConnection();
  const runner = new PostgresTransactionRunner(
    new FailureInjectionTransactionPool(connection),
  );

  await assertRejects(
    () =>
      runner.run(async () => {
        await runner.run(() => Promise.resolve());
      }),
    Error,
    "Nested transaction",
  );
  assertEquals(connection.commands, ["BEGIN", "ROLLBACK", "RELEASE"]);
});

Deno.test("transaction metadata installs through an injected future-scope port", async () => {
  const connection = new FailureInjectionTransactionConnection();
  const installer = new RecordingScopeInstaller();
  const runner = new PostgresTransactionRunner(
    new FailureInjectionTransactionPool(connection),
    installer,
  );

  await runner.run(
    (transaction) => transaction.query("SELECT 1"),
    { tenant: "tenant_mai106" },
  );
  assertEquals(installer.metadata, [{ tenant: "tenant_mai106" }]);
  assertEquals(connection.commands, ["BEGIN", "SELECT 1", "COMMIT", "RELEASE"]);
});

Deno.test("a transaction handle cannot be returned from its callback", async () => {
  const connection = new FailureInjectionTransactionConnection();
  const runner = new PostgresTransactionRunner(
    new FailureInjectionTransactionPool(connection),
  );

  await assertRejects(
    () => runner.run((transaction) => transaction),
    Error,
    "escaped its callback",
  );
  assertEquals(connection.commands, ["BEGIN", "ROLLBACK", "RELEASE"]);
});

interface FailurePlan {
  readonly [command: string]: Error | undefined;
}

class FailureInjectionTransactionConnection {
  readonly commands: string[] = [];

  constructor(private readonly failures: FailurePlan = {}) {}

  query(
    text: string,
    _parameters: readonly unknown[] = [],
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    this.commands.push(text);
    const failure = this.failures[text];
    if (failure !== undefined) return Promise.reject(failure);
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  release(): void {
    this.commands.push("RELEASE");
  }
}

class FailureInjectionTransactionPool {
  constructor(
    private readonly connection: FailureInjectionTransactionConnection,
  ) {}

  connect(): Promise<FailureInjectionTransactionConnection> {
    return Promise.resolve(this.connection);
  }
}

class RecordingScopeInstaller {
  readonly metadata: Array<Readonly<Record<string, string>>> = [];

  install(
    _transaction: TransactionHandle,
    metadata: Readonly<Record<string, string>>,
  ): Promise<void> {
    this.metadata.push(metadata);
    return Promise.resolve();
  }
}
