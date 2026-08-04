import { assertEquals, assertRejects } from "@std/assert";
import pg from "pg";
import {
  parseActorId,
  parseCorrelationId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
  parseTenantId,
} from "../../../src/platform/api/v1.ts";
import { JobRepository } from "../../../src/platform/jobs/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../../src/platform/persistence/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
  PostgresTestTransactionPool,
} from "../support/postgres.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name: "filtered claims lease only explicitly allowed job types",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await truncateJobs(pool);
    const transactions = new PostgresTransactionRunner(
      new PostgresTestTransactionPool(pool),
    );
    const repository = new JobRepository();
    const selected = fixtureJob(
      "job_filter-process",
      "op_filter-process",
      "documents.process",
    );
    const notification = fixtureJob(
      "job_filter-notification",
      "op_filter-notification",
      "notifications.send",
    );
    const reconciliation = fixtureJob(
      "job_filter-reconcile",
      "op_filter-reconcile",
      "deals.reconcile",
    );
    const unsupportedDocument = fixtureJob(
      "job_filter-sync",
      "op_filter-sync",
      "documents.sync",
    );
    for (
      const job of [selected, notification, reconciliation, unsupportedDocument]
    ) {
      await transactions.run((transaction) =>
        repository.enqueue(transaction, job)
      );
    }

    const claimed = await transactions.run((transaction) =>
      repository.claim(transaction, {
        workerId: "worker_documents",
        now: timestamp("2026-07-30T12:00:00.000Z"),
        leaseUntil: timestamp("2026-07-30T12:01:00.000Z"),
        limit: 1,
        allowedJobTypes: ["documents.process"],
      })
    );
    assertEquals(claimed.map(({ jobType }) => jobType), ["documents.process"]);
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.claim(transaction, {
            workerId: "worker_empty",
            now: timestamp("2026-07-30T12:00:01.000Z"),
            leaseUntil: timestamp("2026-07-30T12:01:01.000Z"),
            limit: 1,
            allowedJobTypes: [],
          })
        ),
      Error,
      "allowed types",
    );

    const jobs = await pool.query<{
      job_id: string;
      job_type: string;
      state: string;
      attempt_count: number;
    }>("SELECT job_id, job_type, state, attempt_count FROM platform.jobs");
    const storedJobs = jobs.rows
      .map(({ job_id, job_type, state, attempt_count }) => ({
        job_id,
        job_type,
        state,
        attempt_count,
      }))
      .sort((left, right) => left.job_id < right.job_id ? -1 : 1);
    assertEquals(storedJobs, [
      {
        job_id: notification.jobId,
        job_type: "notifications.send",
        state: "queued",
        attempt_count: 0,
      },
      {
        job_id: selected.jobId,
        job_type: "documents.process",
        state: "running",
        attempt_count: 1,
      },
      {
        job_id: reconciliation.jobId,
        job_type: "deals.reconcile",
        state: "queued",
        attempt_count: 0,
      },
      {
        job_id: unsupportedDocument.jobId,
        job_type: "documents.sync",
        state: "queued",
        attempt_count: 0,
      },
    ]);
    const attempts = await pool.query<{ job_id: string }>(
      "SELECT job_id FROM platform.job_attempts ORDER BY attempt_record_id",
    );
    assertEquals(attempts.rows, [{ job_id: selected.jobId }]);
    await pool.end();
  },
});

function fixtureJob(jobId: string, operationId: string, jobType: string) {
  return {
    jobId: requiredId(parseJobId(jobId)),
    operationId: requiredId(parseOperationId(operationId)),
    jobType,
    schemaVersion: 1,
    tenantId: requiredId(parseTenantId("tenant_mai106")),
    initiatingActorId: requiredId(parseActorId("actor_mai106")),
    correlationId: requiredId(parseCorrelationId("cor_filter")),
    idempotencyKey: requiredId(
      parseIdempotencyKey(`idem_${jobId.replaceAll("_", "-")}`),
    ),
    inputVersionReferences: [],
    payload: { fixture: true },
    timeoutAt: timestamp("2026-07-30T13:00:00.000Z"),
    createdAt: timestamp("2026-07-30T12:00:00.000Z"),
  };
}

async function truncateJobs(pool: pg.Pool): Promise<void> {
  await pool.query(
    "TRUNCATE platform.job_attempts, platform.jobs RESTART IDENTITY CASCADE",
  );
}

function timestamp(value: string): Date {
  return new Date(value);
}

function requiredId<TResult>(
  result: { ok: true; value: TResult } | { ok: false },
): TResult {
  if (result.ok) return result.value;
  throw new Error("Fixture identifier is invalid; expected a MAI-104 ID.");
}
