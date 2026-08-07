import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  valuationMigration,
  valuationMigrations,
} from "../../src/valuation/v1.ts";
import { PostgresValuationRepository } from "../../src/valuation/repository.ts";
import {
  attachValuationInput,
  type ValuationScenario,
} from "../../src/valuation/model.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import { activeModel, input, NOW, scenario } from "./fixtures.ts";

Deno.test("valuation migration owns only the valuation schema and preserves forward-only rollback notes", () => {
  assertEquals(valuationMigration.owner, "valuation");
  assertEquals(valuationMigration.schema, "valuation");
  assertStringIncludes(valuationMigration.rollbackNotes, "retaining");
  for (const statement of valuationMigration.statements) {
    assertEquals(statement.schema, "valuation");
    assertEquals(/\bplatform\./i.test(statement.sql), false);
  }
  assertEquals(valuationMigrations.length, 1);
});

Deno.test({
  name:
    "PostgreSQL valuation repository round-trips exact versions and rejects stale scenario writes",
  ignore: postgresIntegrationTestDatabaseUrl() === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(
      postgresIntegrationTestDatabaseUrl()!,
    );
    const migrations = new PostgresMigrationRunner(pool);
    await migrations.apply([...platformMigrations, ...valuationMigrations]);
    const repository = new PostgresValuationRepository();
    const transactions = new PostgresTransactionRunner(pool);
    const model = activeModel();
    const currentScenario = scenario();
    const valueInput = input();
    const readyScenario = attachValuationInput(
      currentScenario,
      valueInput,
      NOW,
    );
    await transactions.run(async (transaction) => {
      await repository.insertModel(transaction, model);
      await repository.insertScenario(transaction, currentScenario);
      await repository.insertInput(transaction, valueInput);
      await repository.updateScenario(
        transaction,
        readyScenario,
        currentScenario.version,
      );
    });
    const stored = await transactions.run((transaction) =>
      repository.findScenario(
        transaction,
        readyScenario.scope,
        readyScenario.id,
      )
    );
    assertEquals(stored?.currentInputId, valueInput.id);
    await transactions.run((transaction) =>
      repository.findModel(transaction, model.scope, model.id, model.version)
    );
    await assertRejectsStaleWrite(transactions, repository, readyScenario);
    await pool.query("DROP SCHEMA IF EXISTS valuation CASCADE");
    await pool.query(
      "DELETE FROM platform.migration_ledger WHERE context_owner = 'valuation'",
    );
    await pool.end();
  },
});

async function assertRejectsStaleWrite(
  transactions: PostgresTransactionRunner,
  repository: PostgresValuationRepository,
  scenarioValue: ValuationScenario,
): Promise<void> {
  try {
    await transactions.run((transaction) =>
      repository.updateScenario(
        transaction,
        scenarioValue,
        scenarioValue.version - 1,
      )
    );
    throw new Error("Expected the stale scenario write to fail.");
  } catch (error) {
    assertStringIncludes(String(error), "expected version");
  }
}
