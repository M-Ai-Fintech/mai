import type { DurableJob } from "../platform/jobs/v1.ts";
import { JobRepository } from "../platform/jobs/repository.ts";
import type { JobId } from "../platform/api/v1.ts";
import type { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import type { FinancialRiskScope } from "./model.ts";

export interface FinancialRiskJobPort {
  enqueue(job: DurableJob): Promise<void>;
  find(
    scope: FinancialRiskScope,
    jobId: string,
  ): Promise<DurableJob | undefined>;
}

export class PostgresFinancialRiskJobPort implements FinancialRiskJobPort {
  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly jobs: JobRepository = new JobRepository(),
  ) {}

  enqueue(job: DurableJob): Promise<void> {
    return this.transactions.run((transaction) =>
      this.jobs.enqueue(transaction, job)
    );
  }

  find(
    scope: FinancialRiskScope,
    jobId: string,
  ): Promise<DurableJob | undefined> {
    return this.transactions.run(async (transaction) => {
      const job = await this.jobs.find(
        transaction,
        scope.tenantId,
        jobId as JobId,
      );
      if (job === undefined) return undefined;
      if (
        job.workspaceId !== scope.workspaceId || job.dealId !== scope.dealId
      ) return undefined;
      return job;
    });
  }
}
