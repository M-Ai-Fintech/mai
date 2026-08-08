import pg from "pg";
import { JobRepository } from "./repository.ts";
import type { JobWorkerOutcome } from "./worker.ts";
import { PostgresTransactionRunner } from "../persistence/transaction.ts";
import type { WorkerProcess } from "./worker_process.ts";
import { registeredMigrations } from "../persistence/registered_migrations.ts";
import {
  logOperationalEvent,
  safeErrorCode,
} from "../operations/diagnostics.ts";

const LOCAL_HEALTHCHECK_JOB_TYPE = "operations.healthcheck";

/**
 * Runs only the explicit local healthcheck job contract.
 * Domain-specific jobs remain owned by their bounded-context executors.
 */
export class LocalHealthcheckWorker implements WorkerProcess {
  readonly registeredJobTypes = [LOCAL_HEALTHCHECK_JOB_TYPE] as const;
  private readonly jobs = new JobRepository();
  private readonly transactions: PostgresTransactionRunner;

  constructor(private readonly pool: pg.Pool) {
    this.transactions = new PostgresTransactionRunner(pool);
    this.pool.on("error", (error: unknown) => {
      logOperationalEvent("worker.database.error", {
        errorCode: safeErrorCode(error),
      });
    });
  }

  async ready(): Promise<void> {
    const tables = await this.pool.query<{ jobs: string | null }>(
      `SELECT to_regclass('platform.jobs') AS jobs`,
    );
    if (tables.rows[0]?.jobs === null || tables.rows[0]?.jobs === undefined) {
      throw new Error(
        "Worker readiness database probe could not find platform.jobs; run migrations before traffic.",
      );
    }
    const migrationIds = registeredMigrations().map((migration) =>
      migration.id
    );
    const ledger = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM platform.migration_ledger WHERE migration_id = ANY($1::text[])`,
      [migrationIds],
    );
    if (Number(ledger.rows[0]?.count ?? "0") !== migrationIds.length) {
      throw new Error(
        `Worker readiness migration probe found ${
          ledger.rows[0]?.count ?? "0"
        }/${migrationIds.length} active migrations; expected a complete catalog.`,
      );
    }
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
