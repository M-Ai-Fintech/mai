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
import {
  type IdempotencyClaim,
  IdempotencyRepository,
  payloadDigest,
} from "../platform/persistence/v1.ts";
import { JobRepository } from "../platform/jobs/v1.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { MatchingScope } from "./model.ts";
import type { RunId } from "./ids.ts";
import type { CriteriaId } from "./ids.ts";
import { MatchingError } from "./errors.ts";

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
  private readonly claims = new Map<
    string,
    { digest: string; receipt: MatchingJobReceipt }
  >();

  async enqueue(
    _transaction: TransactionHandle,
    input: Parameters<MatchingRunScheduler["enqueue"]>[1],
  ): Promise<MatchingJobReceipt> {
    const digest = await payloadDigest(input.payload);
    const key =
      `${input.scope.tenantId}:${input.actorId}:${input.idempotencyKey}:${input.runId}`;
    const previous = this.claims.get(key);
    if (previous !== undefined) {
      if (previous.digest !== digest) {
        throw new MatchingError(
          "IDEMPOTENCY_CONFLICT",
          `Matching run "${input.runId}" idempotency payload changed; expected the original command payload.`,
          input.runId,
        );
      }
      return previous.receipt;
    }
    const suffix = input.runId.replace(/^run_/, "");
    const receipt = {
      jobId: `job_matching-${suffix}` as JobId,
      operationId: `op_matching-${suffix}` as OperationId,
    };
    this.claims.set(key, { digest, receipt });
    this.jobs.push(receipt);
    return receipt;
  }
}

export class PostgresMatchingRunScheduler implements MatchingRunScheduler {
  constructor(
    private readonly jobs: JobRepository,
    private readonly idempotency: IdempotencyRepository,
  ) {}

  async enqueue(
    transaction: TransactionHandle,
    input: Parameters<MatchingRunScheduler["enqueue"]>[1],
  ): Promise<MatchingJobReceipt> {
    const receipt = idsForRun(input.runId);
    const digest = await payloadDigest(input.payload);
    const claim: IdempotencyClaim = {
      tenantId: input.scope.tenantId,
      actorId: input.actorId,
      commandType: "matching.run.start",
      targetType: "matching_run",
      targetId: input.runId,
      idempotencyKey: input.idempotencyKey,
      payloadDigest: digest,
      expiresAt: new Date(input.now.getTime() + 86_400_000),
    };
    const result = await this.idempotency.claim(transaction, claim);
    if (result.status === "replay") {
      return receipt;
    }
    if (result.status !== "claimed") {
      throw new MatchingError(
        "IDEMPOTENCY_CONFLICT",
        `Matching run "${input.runId}" already has an in-progress idempotency claim; expected one durable command owner.`,
        input.runId,
      );
    }
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
    await this.idempotency.complete(transaction, claim, receipt.operationId);
    return receipt;
  }
}

function idsForRun(runId: RunId): MatchingJobReceipt {
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
