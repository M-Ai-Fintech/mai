import type { DurableJob, JobState, StoredJob } from "../platform/jobs/v1.ts";
import { JobRepository } from "../platform/jobs/repository.ts";
import type { ActorId, JobId, OperationId } from "../platform/api/v1.ts";
import type { PostgresTransactionRunner } from "../platform/persistence/v1.ts";
import type { FinancialRiskScope } from "./model.ts";
import type {
  FinancialRiskIdempotencyClaim,
  FinancialRiskIdempotencyClaimResult,
  FinancialRiskVersionConflictCode,
} from "./repository.ts";
import {
  type Clock,
  IdempotencyRepository,
} from "../platform/persistence/v1.ts";
import {
  durableFinancialRiskClaim,
  mapFinancialRiskClaimResult,
} from "./idempotency.ts";

export interface FinancialRiskJobPort {
  enqueue(job: DurableJob): Promise<void>;
  peek(
    claim: FinancialRiskIdempotencyClaim,
  ): Promise<FinancialRiskQueueLookupResult>;
  claimAndFail(
    claim: FinancialRiskIdempotencyClaim,
    failureCode: FinancialRiskVersionConflictCode,
  ): Promise<FinancialRiskIdempotencyClaimResult>;
  claimAndEnqueue(
    claim: FinancialRiskIdempotencyClaim,
    job: DurableJob,
  ): Promise<FinancialRiskIdempotencyClaimResult>;
  find(
    scope: FinancialRiskScope,
    jobId: string,
  ): Promise<DurableJob | undefined>;
  findStatus(
    scope: FinancialRiskScope,
    actorId: ActorId,
    jobId: JobId,
  ): Promise<FinancialRiskJobStatus | undefined>;
}

export interface FinancialRiskJobStatus {
  readonly schemaVersion: 1;
  readonly jobId: JobId;
  readonly operationId?: OperationId;
  readonly state: JobState;
  readonly progress: number;
  readonly attemptCount: number;
  readonly cancellationRequested: boolean;
  readonly createdAt: Date;
  readonly startedAt?: Date;
  readonly terminalAt?: Date;
}

export type FinancialRiskQueueLookupResult =
  | { readonly status: "missing" }
  | FinancialRiskIdempotencyClaimResult;

export class PostgresFinancialRiskJobPort implements FinancialRiskJobPort {
  private readonly idempotency: IdempotencyRepository;

  constructor(
    private readonly transactions: PostgresTransactionRunner,
    private readonly jobs: JobRepository = new JobRepository(),
    idempotency?: IdempotencyRepository,
    private readonly clock: Clock = defaultClock,
  ) {
    this.idempotency = idempotency ?? new IdempotencyRepository(this.clock);
  }

  enqueue(job: DurableJob): Promise<void> {
    return this.transactions.run((transaction) =>
      this.jobs.enqueue(transaction, job)
    );
  }

  peek(
    claim: FinancialRiskIdempotencyClaim,
  ): Promise<FinancialRiskQueueLookupResult> {
    return this.transactions.run(async (transaction) => {
      const result = await this.idempotency.peek(
        transaction,
        durableFinancialRiskClaim(claim, this.clock),
      );
      if (result.status === "missing") return result;
      return mapFinancialRiskClaimResult(result, claim.idempotencyKey);
    });
  }

  async claimAndFail(
    claim: FinancialRiskIdempotencyClaim,
    failureCode: FinancialRiskVersionConflictCode,
  ): Promise<FinancialRiskIdempotencyClaimResult> {
    return await this.transactions.run(async (transaction) => {
      const durable = durableFinancialRiskClaim(claim, this.clock);
      const result = await this.idempotency.claim(transaction, durable);
      const mapped = mapFinancialRiskClaimResult(result, claim.idempotencyKey);
      if (mapped.status !== "claimed") return mapped;
      await this.idempotency.fail(transaction, durable, failureCode);
      return { status: "failed", failureCode };
    });
  }

  async claimAndEnqueue(
    claim: FinancialRiskIdempotencyClaim,
    job: DurableJob,
  ): Promise<FinancialRiskIdempotencyClaimResult> {
    assertJobMatchesClaim(claim, job);
    return await this.transactions.run(async (transaction) => {
      const durable = durableFinancialRiskClaim(claim, this.clock);
      const result = await this.idempotency.claim(transaction, durable);
      const mapped = mapFinancialRiskClaimResult(result, claim.idempotencyKey);
      if (mapped.status !== "claimed") return mapped;
      await this.jobs.enqueue(transaction, job);
      await this.idempotency.complete(transaction, durable, job.jobId);
      return mapped;
    });
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

  findStatus(
    scope: FinancialRiskScope,
    actorId: ActorId,
    jobId: JobId,
  ): Promise<FinancialRiskJobStatus | undefined> {
    return this.transactions.run(async (transaction) => {
      const job = await this.jobs.find(transaction, scope.tenantId, jobId);
      if (job === undefined || !jobMatchesStatusRead(job, scope, actorId)) {
        return undefined;
      }
      return toFinancialRiskJobStatus(job);
    });
  }
}

const defaultClock: Clock = { now: () => new Date() };

function assertJobMatchesClaim(
  claim: FinancialRiskIdempotencyClaim,
  job: DurableJob,
): void {
  if (
    job.tenantId === claim.scope.tenantId &&
    job.workspaceId === claim.scope.workspaceId &&
    job.dealId === claim.scope.dealId &&
    job.initiatingActorId === claim.actorId &&
    job.idempotencyKey === claim.idempotencyKey &&
    job.jobType === claim.commandType &&
    job.payload.assessmentId === claim.assessmentId
  ) return;
  throw new Error(
    `Financial-risk job "${job.jobId}" does not match idempotency key "${claim.idempotencyKey}"; expected the exact tenant, deal, actor, command, and assessment identity.`,
  );
}

function jobMatchesStatusRead(
  job: DurableJob,
  scope: FinancialRiskScope,
  actorId: ActorId,
): boolean {
  return job.workspaceId === scope.workspaceId && job.dealId === scope.dealId &&
    job.initiatingActorId === actorId &&
    (job.jobType === "financial-risk.compute" ||
      job.jobType === "financial-risk.invalidate");
}

function toFinancialRiskJobStatus(job: StoredJob): FinancialRiskJobStatus {
  return {
    schemaVersion: 1,
    jobId: job.jobId,
    operationId: job.operationId,
    state: job.state,
    progress: job.progress,
    attemptCount: job.attemptCount,
    cancellationRequested: job.cancellationRequestedAt !== undefined,
    createdAt: job.createdAt,
    ...(job.startedAt === undefined ? {} : { startedAt: job.startedAt }),
    ...(job.terminalAt === undefined ? {} : { terminalAt: job.terminalAt }),
  };
}
