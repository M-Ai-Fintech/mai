import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import { JobRepository } from "../platform/jobs/v1.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { MatchingScope } from "./model.ts";
import type { RunId } from "./ids.ts";
import type { CriteriaId } from "./ids.ts";

export interface MatchingJobReceipt {
  readonly jobId: JobId;
  readonly operationId: OperationId;
}

export interface MatchingRunScheduler {
  enqueue(
    transaction: TransactionHandle,
    input: {
      readonly scope: MatchingScope;
      readonly runId: RunId;
      readonly criteriaId: CriteriaId;
      readonly criteriaVersion: number;
      readonly actorId: ActorId;
      readonly correlationId: CorrelationId;
      readonly idempotencyKey: IdempotencyKey;
      readonly now: Date;
      readonly payload: Readonly<Record<string, unknown>>;
    },
  ): Promise<MatchingJobReceipt>;
}

export class RecordingMatchingRunScheduler implements MatchingRunScheduler {
  readonly jobs: MatchingJobReceipt[] = [];

  enqueue(
    _transaction: TransactionHandle,
    input: Parameters<MatchingRunScheduler["enqueue"]>[1],
  ): Promise<MatchingJobReceipt> {
    const receipt = matchingJobReceiptForRun(input.runId);
    this.jobs.push(receipt);
    return Promise.resolve(receipt);
  }
}

export class PostgresMatchingRunScheduler implements MatchingRunScheduler {
  constructor(
    private readonly jobs: JobRepository,
  ) {}

  async enqueue(
    transaction: TransactionHandle,
    input: Parameters<MatchingRunScheduler["enqueue"]>[1],
  ): Promise<MatchingJobReceipt> {
    const receipt = matchingJobReceiptForRun(input.runId);
    await this.jobs.enqueue(transaction, {
      jobId: receipt.jobId,
      operationId: receipt.operationId,
      jobType: "matching.compute",
      schemaVersion: 1,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      dealId: input.scope.dealId,
      initiatingActorId: input.actorId,
      authoritySnapshotReference: undefined,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      inputVersionReferences: [{
        aggregateType: "matching_run",
        aggregateId: input.runId,
        version: 1 as AggregateVersion,
      }, {
        aggregateType: "matching_criteria",
        aggregateId: input.criteriaId,
        version: input.criteriaVersion as AggregateVersion,
      }],
      payload: input.payload,
      timeoutAt: new Date(input.now.getTime() + 300_000),
      createdAt: input.now,
    });
    return receipt;
  }
}

export function matchingJobReceiptForRun(runId: RunId): MatchingJobReceipt {
  const suffix = runId.replace(/^run_/, "");
  return {
    jobId: `job_matching-${suffix}` as JobId,
    operationId: `op_matching-${suffix}` as OperationId,
  };
}

export type MatchingJobScope = MatchingScope & {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
};
