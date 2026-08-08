import pg from "pg";
import { JobRepository } from "./repository.ts";
import type { JobWorkerOutcome } from "./worker.ts";
import { PostgresTransactionRunner } from "../persistence/transaction.ts";
import type { WorkerProcess } from "./worker_process.ts";

const LOCAL_HEALTHCHECK_JOB_TYPE = "operations.healthcheck";

/**
 * Runs only the explicit local healthcheck job contract.
 * Domain-specific jobs remain owned by their bounded-context executors.
 */
export class LocalHealthcheckWorker implements WorkerProcess {
  private readonly jobs = new JobRepository();
  private readonly transactions: PostgresTransactionRunner;

  constructor(private readonly pool: pg.Pool) {
    this.transactions = new PostgresTransactionRunner(pool);
  }

  async executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<JobWorkerOutcome> {
    const now = new Date();
    return await this.transactions.run(async (transaction) => {
      const claimed = await this.jobs.claim(transaction, {
        workerId,
        now,
        leaseUntil: new Date(now.getTime() + leaseMilliseconds),
        limit: 1,
        allowedJobTypes: [LOCAL_HEALTHCHECK_JOB_TYPE],
      });
      const job = claimed[0];
      if (job === undefined) return { status: "idle" };
      await this.jobs.complete(
        transaction,
        job,
        `local-healthcheck:${job.jobId}`,
        new Date(),
      );
      return { status: "succeeded", jobId: job.jobId };
    });
  }

  close(): Promise<void> {
    return this.pool.end();
  }
}

export function createWorker(): LocalHealthcheckWorker {
  const connectionString = requiredEnvironment("DATABASE_URL");
  return new LocalHealthcheckWorker(
    new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 3_000 }),
  );
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (value) return value;
  throw new Error(
    `Local worker environment "${name}" is missing; expected an explicit local configuration value.`,
  );
}
