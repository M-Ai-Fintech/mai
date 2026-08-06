import { assertEquals, assertRejects } from "@std/assert";
import { PostgresTransactionRunner } from "../../src/platform/persistence/v1.ts";
import { evaluateApprovalAuthority } from "../../src/work_management/authority_evaluation.ts";
import { PostgresAuthorityEvaluationStore } from "../../src/work_management/authority_evaluation_store.ts";
import { WorkManagementError } from "../../src/work_management/model.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  authorityFacts,
  authorityPackage,
  completeLimits,
} from "./authority_test_support.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name:
    "PostgreSQL authority evaluations persist once, replay exactly, and reject tampering",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await ensureAuthorityEvaluationTable(pool);
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
    await assertRejects(() =>
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
      }), WorkManagementError);
    const restored = await runner.run((transaction) =>
      new PostgresAuthorityEvaluationStore(transaction).find(
        evaluation.evaluationId,
      )
    );
    assertEquals(restored?.outcome, "allowed");
    await pool.end();
  },
});

async function ensureAuthorityEvaluationTable(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS work_management`);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS work_management.authority_evaluations (
       evaluation_id TEXT PRIMARY KEY,
       evaluation_digest TEXT NOT NULL,
       approval_package_id TEXT NOT NULL,
       approval_package_version INTEGER NOT NULL,
       approval_package_digest TEXT NOT NULL,
       tenant_id TEXT NOT NULL,
       workspace_id TEXT NOT NULL,
       deal_id TEXT NOT NULL,
       target_aggregate_type TEXT NOT NULL,
       target_aggregate_id TEXT NOT NULL,
       expected_target_version BIGINT NOT NULL,
       evaluated_at TIMESTAMPTZ NOT NULL,
       evaluation JSONB NOT NULL
     )`,
  );
}
