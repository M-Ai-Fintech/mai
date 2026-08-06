import { assertEquals, assertRejects } from "@std/assert";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { evaluateApprovalAuthority } from "../../src/work_management/authority_evaluation.ts";
import { PostgresAuthorityEvaluationStore } from "../../src/work_management/authority_evaluation_store.ts";
import { workManagementMigrations } from "../../src/work_management/migrations/index.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  authorityFacts,
  authorityPackage,
  completeLimits,
} from "./authority_test_support.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "PostgreSQL authority evaluations persist once, replay exactly, and reject tampering",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ]);
    const runner = new PostgresTransactionRunner(pool);
    const packageValue = await authorityPackage(completeLimits);
    const evaluation = await evaluateApprovalAuthority({
      package: packageValue,
      expectedPackage: packageValue,
      facts: authorityFacts(),
      evaluatedAt: "2026-08-06T12:00:00.000Z",
    });
    await runner.run(async (transaction) => {
      const store = new PostgresAuthorityEvaluationStore(transaction);
      await store.append(evaluation);
      await store.append(evaluation);
      assertEquals(
        (await store.find(evaluation.evaluationId))?.digest,
        evaluation.digest,
      );
    });
    const count = await pool.query<{ readonly count: number }>(
      `SELECT count(*)::int AS count
       FROM work_management.authority_evaluations WHERE evaluation_id = $1`,
      [evaluation.evaluationId],
    );
    assertEquals(count.rows[0].count, 1);
    await assertRejects(
      () =>
        runner.run(async (transaction) => {
          await transaction.query(
            `UPDATE work_management.authority_evaluations
         SET evaluation = jsonb_set(evaluation, '{outcome}', '"denied"'::jsonb)
         WHERE evaluation_id = $1`,
            [evaluation.evaluationId],
          );
          await new PostgresAuthorityEvaluationStore(transaction).append(
            evaluation,
          );
        }),
      Error,
      "append-only",
    );
    const restored = await runner.run((transaction) =>
      new PostgresAuthorityEvaluationStore(transaction).find(
        evaluation.evaluationId,
      )
    );
    assertEquals(restored?.outcome, "allowed");
    await pool.end();
  },
});
