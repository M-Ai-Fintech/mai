import type {
  ClaimedJob,
  JobAuditAppendPort,
  JobExecutionContext,
  JobExecutor,
  JobFailurePolicy,
  JobInputVersionChecker,
  JobWorkerOutcome,
  JobWorkerStore,
  JobWorkerTransactions,
} from "../platform/jobs/v1.ts";
import { JobWorker } from "../platform/jobs/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import {
  FinancialRiskApplication,
  type FinancialRiskInputLoader,
} from "./application.ts";
import { parseFinancialRiskQueuedJob } from "./application_support.ts";

export const FINANCIAL_RISK_WORKER_JOB_TYPES = Object.freeze([
  "financial-risk.compute",
  "financial-risk.invalidate",
]);

export interface FinancialRiskWorkerConfig {
  readonly application: FinancialRiskApplication;
  readonly inputLoader: FinancialRiskInputLoader;
  readonly transactions: JobWorkerTransactions;
  readonly store: JobWorkerStore;
  readonly clock: Clock;
  readonly failurePolicy: JobFailurePolicy;
  readonly audit: JobAuditAppendPort;
}

export class FinancialRiskWorker {
  readonly registeredJobTypes = FINANCIAL_RISK_WORKER_JOB_TYPES;
  private readonly worker: JobWorker;
  private readonly readiness: () => Promise<void>;

  constructor(config: FinancialRiskWorkerConfig) {
    this.readiness = () => config.transactions.run(() => undefined);
    this.worker = new JobWorker({
      transactions: config.transactions,
      store: config.store,
      executor: new FinancialRiskJobExecutor(
        config.application,
        config.inputLoader,
      ),
      versions: new FinancialRiskJobVersionChecker(config.application),
      clock: config.clock,
      failurePolicy: config.failurePolicy,
      audit: config.audit,
      allowedJobTypes: FINANCIAL_RISK_WORKER_JOB_TYPES,
    });
  }

  executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<JobWorkerOutcome> {
    return this.worker.executeOne(workerId, leaseMilliseconds);
  }

  ready(): Promise<void> {
    return this.readiness();
  }
}

export class FinancialRiskJobExecutor implements JobExecutor {
  constructor(
    private readonly application: FinancialRiskApplication,
    private readonly inputLoader: FinancialRiskInputLoader,
  ) {}

  async execute(
    job: ClaimedJob,
    context: JobExecutionContext,
  ): Promise<{ readonly resultReference: string }> {
    const command = parseFinancialRiskQueuedJob(job);
    if (command === undefined) {
      throw new Error(
        `Financial-risk job "${job.jobId}" has an invalid durable payload; expected a persisted governed command.`,
      );
    }
    const result = await this.application.executeQueuedCommand(
      command,
      this.inputLoader,
      context,
      job,
    );
    return { resultReference: result.resultId };
  }
}

export class FinancialRiskJobVersionChecker implements JobInputVersionChecker {
  constructor(private readonly application: FinancialRiskApplication) {}

  async recheck(job: ClaimedJob): Promise<boolean> {
    const command = parseFinancialRiskQueuedJob(job);
    return command !== undefined &&
      await this.application.recheckQueuedCommand(command);
  }
}
