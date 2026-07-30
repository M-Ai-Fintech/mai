import { assertEquals, assertRejects } from "@std/assert";
import {
  parseActorId,
  parseCorrelationId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
  parseTenantId,
} from "../../../src/platform/api/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../../src/platform/persistence/v1.ts";
import {
  JobRepository,
  sanitizedJobFailure,
} from "../../../src/platform/jobs/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
  PostgresTestTransactionPool,
} from "../support/postgres.ts";
import pg from "pg";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name: "jobs survive repository recreation and claims are lease-exclusive",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await truncateJobs(pool);
    const transactions = transactionRunner(pool);
    const repository = new JobRepository();
    const job = fixtureJob("job_restart", "op_restart");
    await transactions.run((transaction) =>
      repository.enqueue(transaction, job)
    );
    const recreated = new JobRepository();
    const stored = await transactions.run((transaction) =>
      recreated.find(transaction, job.tenantId, job.jobId)
    );
    assertEquals(stored?.state, "queued");

    const claims = await Promise.all([
      claimJobs(
        transactions,
        recreated,
        "worker_a",
        "2026-07-30T12:00:00.000Z",
      ),
      claimJobs(
        transactions,
        recreated,
        "worker_b",
        "2026-07-30T12:00:00.000Z",
      ),
    ]);
    assertEquals(claims.map(({ length }) => length).sort(), [0, 1]);
    const winner = claims.find(({ length }) => length === 1)![0];
    assertEquals(winner.attemptNumber, 1);

    const early = await claimJobs(
      transactions,
      recreated,
      "worker_c",
      "2026-07-30T12:00:30.000Z",
    );
    const recovered = await claimJobs(
      transactions,
      recreated,
      "worker_c",
      "2026-07-30T12:01:01.000Z",
    );
    assertEquals(early, []);
    assertEquals(recovered[0].attemptNumber, 2);
    const attempts = await transactions.run((transaction) =>
      recreated.listAttemptRecords(transaction, job.tenantId, job.jobId)
    );
    assertEquals(
      attempts.map(({ attemptNumber, recordKind, outcome }) => ({
        attemptNumber,
        recordKind,
        outcome,
      })),
      [
        { attemptNumber: 1, recordKind: "started", outcome: undefined },
        {
          attemptNumber: 1,
          recordKind: "completed",
          outcome: "lease_expired",
        },
        { attemptNumber: 2, recordKind: "started", outcome: undefined },
      ],
    );
    await pool.end();
  },
});

Deno.test({
  name: "retry adds attempts and exhausted work remains dead-lettered",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await truncateJobs(pool);
    const transactions = transactionRunner(pool);
    const repository = new JobRepository();
    const job = fixtureJob("job_retry", "op_retry");
    await transactions.run((transaction) =>
      repository.enqueue(transaction, job)
    );
    const first = (await claimJobs(
      transactions,
      repository,
      "worker_a",
      "2026-07-30T12:00:00.000Z",
    ))[0];
    await transactions.run((transaction) =>
      repository.fail(transaction, first, {
        outcome: "retry_scheduled",
        failure: sanitizedJobFailure("EXECUTOR_RETRY"),
        completedAt: new Date("2026-07-30T12:00:10.000Z"),
        nextAttemptAt: new Date("2026-07-30T12:02:00.000Z"),
      })
    );
    const second = (await claimJobs(
      transactions,
      repository,
      "worker_b",
      "2026-07-30T12:02:00.000Z",
    ))[0];
    await transactions.run((transaction) =>
      repository.fail(transaction, second, {
        outcome: "dead_lettered",
        failure: sanitizedJobFailure("EXECUTOR_EXHAUSTED"),
        completedAt: new Date("2026-07-30T12:02:10.000Z"),
      })
    );
    const stored = await transactions.run((transaction) =>
      repository.find(transaction, job.tenantId, job.jobId)
    );
    const attempts = await transactions.run((transaction) =>
      repository.listAttemptRecords(transaction, job.tenantId, job.jobId)
    );
    assertEquals(stored?.state, "dead_lettered");
    assertEquals(stored?.operationId, job.operationId);
    assertEquals(attempts.length, 4);
    assertEquals(
      attempts.filter(({ recordKind }) => recordKind === "completed")
        .map(({ outcome }) => outcome),
      ["retry_scheduled", "dead_lettered"],
    );
    await pool.end();
  },
});

Deno.test({
  name:
    "stale job attempts cannot mutate a recovered lease with reused worker ID",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await truncateJobs(pool);
    const transactions = transactionRunner(pool);
    const repository = new JobRepository();
    const job = fixtureJob("job_fencing", "op_fencing");
    await transactions.run((transaction) =>
      repository.enqueue(transaction, job)
    );
    const stale = (await claimJobs(
      transactions,
      repository,
      "worker_reused",
      "2026-07-30T12:00:00.000Z",
    ))[0];
    const recovered = (await claimJobs(
      transactions,
      repository,
      "worker_reused",
      "2026-07-30T12:01:01.000Z",
    ))[0];

    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.complete(
            transaction,
            stale,
            "stale_result",
            new Date("2026-07-30T12:01:02.000Z"),
          )
        ),
      Error,
      "did not match",
    );
    await transactions.run((transaction) =>
      repository.complete(
        transaction,
        recovered,
        "current_result",
        new Date("2026-07-30T12:01:03.000Z"),
      )
    );
    const attemptTenants = await pool.query<{ tenant_id: string }>(
      "SELECT DISTINCT tenant_id FROM platform.job_attempts",
    );
    assertEquals(attemptTenants.rows, [{ tenant_id: "tenant_mai106" }]);
    await pool.end();
  },
});

Deno.test({
  name:
    "expired workers cannot transition or renew while recovered attempts remain fenced",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await truncateJobs(pool);
    const transactions = transactionRunner(pool);
    const repository = new JobRepository();
    const expiredAt = new Date("2026-07-30T12:01:00.000Z");
    const complete = await claimedFixture(
      transactions,
      repository,
      "job_expired-complete",
    );
    const failed = await claimedFixture(
      transactions,
      repository,
      "job_expired-fail",
    );
    const cancelled = await claimedFixture(
      transactions,
      repository,
      "job_expired-cancel",
    );
    const timedOutJob = {
      ...fixtureJob("job_expired-timeout", "op_job-expired-timeout"),
      timeoutAt: new Date("2026-07-30T12:00:30.000Z"),
    };
    await transactions.run((transaction) =>
      repository.enqueue(transaction, timedOutJob)
    );
    const timedOut = (await claimJobs(
      transactions,
      repository,
      "worker_job_expired_timeout",
      "2026-07-30T12:00:00.000Z",
    ))[0];

    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.complete(transaction, complete, "late_result", expiredAt)
        ),
      Error,
      "did not match",
    );
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.fail(transaction, failed, {
            outcome: "dead_lettered",
            failure: sanitizedJobFailure("LATE_FAILURE"),
            completedAt: expiredAt,
          })
        ),
      Error,
      "did not match",
    );
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.cancel(transaction, cancelled, expiredAt)
        ),
      Error,
      "did not match",
    );
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.timeout(transaction, timedOut, expiredAt)
        ),
      Error,
      "did not match",
    );
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.extendLease(
            transaction,
            complete,
            expiredAt,
            new Date("2026-07-30T12:02:00.000Z"),
          )
        ),
      Error,
      "invalid",
    );

    await truncateJobs(pool);
    const renewable = await claimedFixture(
      transactions,
      repository,
      "job_renewed",
    );

    const renewed = await transactions.run((transaction) =>
      repository.extendLease(
        transaction,
        renewable,
        new Date("2026-07-30T12:00:30.000Z"),
        new Date("2026-07-30T12:02:00.000Z"),
      )
    );
    assertEquals(
      await claimJobs(
        transactions,
        repository,
        "worker_recover",
        "2026-07-30T12:01:01.000Z",
      ),
      [],
    );
    const recovered = (await claimJobs(
      transactions,
      repository,
      "worker_recover",
      "2026-07-30T12:02:01.000Z",
    ))[0];
    assertEquals(recovered.attemptNumber, 2);
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.complete(
            transaction,
            renewed,
            "stale_renewed_result",
            new Date("2026-07-30T12:02:02.000Z"),
          )
        ),
      Error,
      "did not match",
    );
    await transactions.run((transaction) =>
      repository.complete(
        transaction,
        recovered,
        "recovered_result",
        new Date("2026-07-30T12:02:02.000Z"),
      )
    );
    await assertAppendOnlyAttempts(pool);
    await pool.end();
  },
});

Deno.test({
  name:
    "job completion, cancellation, timeout, and append-only attempts persist",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await truncateJobs(pool);
    const transactions = transactionRunner(pool);
    const repository = new JobRepository();
    const cancelledJob = fixtureJob("job_cancel", "op_cancel");
    await transactions.run(async (transaction) => {
      await repository.enqueue(transaction, cancelledJob);
      await repository.requestCancellation(
        transaction,
        cancelledJob.tenantId,
        cancelledJob.jobId,
        new Date("2026-07-30T12:00:01.000Z"),
      );
    });
    const cancelledClaim = (await claimJobs(
      transactions,
      repository,
      "worker_cancel",
      "2026-07-30T12:00:02.000Z",
    ))[0];
    assertEquals(
      await transactions.run((transaction) =>
        repository.cancellationRequested(
          transaction,
          cancelledClaim,
          new Date("2026-07-30T12:00:03.000Z"),
        )
      ),
      true,
    );
    await transactions.run((transaction) =>
      repository.cancel(
        transaction,
        cancelledClaim,
        new Date("2026-07-30T12:00:03.000Z"),
      )
    );

    const timedOutJob = {
      ...fixtureJob("job_timeout", "op_timeout"),
      timeoutAt: new Date("2026-07-30T12:00:05.000Z"),
    };
    await transactions.run((transaction) =>
      repository.enqueue(transaction, timedOutJob)
    );
    const timedOutClaim = (await claimJobs(
      transactions,
      repository,
      "worker_timeout",
      "2026-07-30T12:00:04.000Z",
    ))[0];
    await transactions.run((transaction) =>
      repository.timeout(
        transaction,
        timedOutClaim,
        new Date("2026-07-30T12:00:06.000Z"),
      )
    );

    const succeededJob = fixtureJob("job_success", "op_success");
    await transactions.run((transaction) =>
      repository.enqueue(transaction, succeededJob)
    );
    const succeededClaim = (await claimJobs(
      transactions,
      repository,
      "worker_success",
      "2026-07-30T12:00:07.000Z",
    ))[0];
    await transactions.run(async (transaction) => {
      const extended = await repository.extendLease(
        transaction,
        succeededClaim,
        new Date("2026-07-30T12:00:08.000Z"),
        new Date("2026-07-30T12:02:00.000Z"),
      );
      await repository.complete(
        transaction,
        extended,
        "result_success",
        new Date("2026-07-30T12:00:08.000Z"),
      );
    });
    const states = await Promise.all(
      [cancelledJob, timedOutJob, succeededJob].map((job) =>
        transactions.run((transaction) =>
          repository.find(transaction, job.tenantId, job.jobId)
        )
      ),
    );
    assertEquals(states.map((job) => job?.state), [
      "cancelled",
      "timed_out",
      "succeeded",
    ]);
    await assertAppendOnlyAttempts(pool);
    await pool.end();
  },
});

async function claimedFixture(
  transactions: PostgresTransactionRunner,
  repository: JobRepository,
  jobId: string,
) {
  const job = fixtureJob(jobId, `op_${jobId.slice(4).replaceAll("_", "-")}`);
  await transactions.run((transaction) => repository.enqueue(transaction, job));
  return (await claimJobs(
    transactions,
    repository,
    `worker_${jobId}`,
    "2026-07-30T12:00:00.000Z",
  ))[0];
}

function transactionRunner(pool: pg.Pool): PostgresTransactionRunner {
  return new PostgresTransactionRunner(new PostgresTestTransactionPool(pool));
}

function claimJobs(
  transactions: PostgresTransactionRunner,
  repository: JobRepository,
  workerId: string,
  now: string,
) {
  const claimedAt = new Date(now);
  return transactions.run((transaction) =>
    repository.claim(transaction, {
      workerId,
      now: claimedAt,
      leaseUntil: new Date(claimedAt.getTime() + 60_000),
      limit: 1,
    })
  );
}

async function truncateJobs(pool: pg.Pool): Promise<void> {
  await pool.query(
    "TRUNCATE platform.job_attempts, platform.jobs RESTART IDENTITY CASCADE",
  );
}

async function assertAppendOnlyAttempts(pool: pg.Pool): Promise<void> {
  let rejected = false;
  try {
    await pool.query(
      `UPDATE platform.job_attempts SET outcome = 'rewritten'
       WHERE attempt_record_id = (
         SELECT MIN(attempt_record_id) FROM platform.job_attempts
       )`,
    );
  } catch (error) {
    rejected = String(error).includes("append-only");
  }
  assertEquals(rejected, true);
}

function fixtureJob(jobId: string, operationId: string) {
  return {
    jobId: requiredId(parseJobId(jobId)),
    operationId: requiredId(parseOperationId(operationId)),
    jobType: "fixture.execute",
    schemaVersion: 1,
    tenantId: requiredId(parseTenantId("tenant_mai106")),
    initiatingActorId: requiredId(parseActorId("actor_mai106")),
    correlationId: requiredId(parseCorrelationId("cor_mai106")),
    idempotencyKey: requiredId(
      parseIdempotencyKey(`idem_${jobId.replaceAll("_", "-")}`),
    ),
    inputVersionReferences: [],
    payload: { fixture: true },
    timeoutAt: new Date("2026-07-30T13:00:00.000Z"),
    createdAt: new Date("2026-07-30T12:00:00.000Z"),
  };
}

function requiredId<TResult>(
  result: { ok: true; value: TResult } | { ok: false },
): TResult {
  if (result.ok) return result.value;
  throw new Error("Fixture identifier is invalid; expected a MAI-104 ID.");
}
