import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  type LocalMvpDatabasePort,
  resetLocalMvpScenario,
} from "../../src/local_mvp/reset.ts";

class RecordingResetDatabase implements LocalMvpDatabasePort {
  readonly statements: string[] = [];

  constructor(private readonly databaseName: string) {}

  query<TRow extends Record<string, unknown>>(text: string) {
    this.statements.push(text);
    const rows = text.startsWith("SELECT")
      ? [{ database_name: this.databaseName } as unknown as TRow]
      : [];
    return Promise.resolve({ rows, rowCount: rows.length });
  }
}

Deno.test("local reset truncates the enumerated scenario only on mai_local", async () => {
  const database = new RecordingResetDatabase("mai_local");
  await resetLocalMvpScenario(database);

  assertEquals(database.statements.length, 2);
  assertStringIncludes(database.statements[1], "TRUNCATE TABLE");
  assertStringIncludes(
    database.statements[1],
    "demo_readiness.workflow_snapshots",
  );
  assertStringIncludes(database.statements[1], "iam.institutions");
  assertStringIncludes(database.statements[1], "RESTART IDENTITY CASCADE");
});

Deno.test("local reset fails closed before mutation on another database", async () => {
  const database = new RecordingResetDatabase("production");
  await assertRejects(
    () => resetLocalMvpScenario(database),
    Error,
    'reset target "production" is unsafe',
  );
  assertEquals(database.statements.length, 1);
});
