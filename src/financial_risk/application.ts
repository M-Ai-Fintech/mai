import type { ActorReference } from "../platform/authz/v1.ts";
import {
  type AggregateVersion,
  type RequestContext,
} from "../platform/api/v1.ts";
import type { DurableJob } from "../platform/jobs/v1.ts";
import { type Clock, payloadDigest } from "../platform/persistence/v1.ts";
import {
  createFinancialRiskResult,
  type FinancialRiskReferences,
  type FinancialRiskResult,
  type FinancialRiskScope,
} from "./model.ts";
import { FinancialRiskError } from "./errors.ts";
import type { FinancialRiskInferencePort } from "./ports.ts";
import type { FinancialRiskJobPort } from "./job_port.ts";
import type { FinancialRiskAssessmentId } from "./ids.ts";
import type { FinancialRiskRepository } from "./repository.ts";
import {
  assertActor,
  assertReferenceScope,
  cancelledProvenance,
  commandDigest,
  durableJob,
  protectedNotFound,
  queuedJob,
  replayed,
  requiredScope,
  staleProvenance,
  systemClock,
} from "./application_support.ts";
import {
  assertExpectedVersion,
  claim,
  executionStatus,
  failVersionClaim,
  type FinancialRiskClaim,
  normalizeCommandError,
  safeInference,
} from "./application_internal.ts";
import type {
  FinancialRiskAuthorizationPort,
  FinancialRiskCommandResult,
  FinancialRiskComputeRequest,
  FinancialRiskInvalidationRequest,
  FinancialRiskQueuedCommandResult,
  FinancialRiskReferenceVerificationPort,
} from "./application_contracts.ts";
export type {
  FinancialRiskAuthorizationPort,
  FinancialRiskCommandRequest,
  FinancialRiskCommandResult,
  FinancialRiskComputeRequest,
  FinancialRiskInputLoader,
  FinancialRiskInvalidationRequest,
  FinancialRiskQueuedCommandResult,
  FinancialRiskReferenceVerificationPort,
} from "./application_contracts.ts";

export class FinancialRiskApplication {
  constructor(
    private readonly authorization: FinancialRiskAuthorizationPort,
    private readonly references: FinancialRiskReferenceVerificationPort,
    private readonly inference: FinancialRiskInferencePort,
    private readonly repository: FinancialRiskRepository,
    private readonly clock: Clock = systemClock,
    private readonly jobs?: FinancialRiskJobPort,
  ) {}

  async read(
    context: RequestContext,
    actor: ActorReference,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<FinancialRiskResult> {
    const scope = requiredScope(context);
    assertActor(context, actor);
    await this.authorize(context, actor, scope, assessmentId, "read");
    const result = await this.repository.findLatest(scope, assessmentId);
    if (result === undefined) throw protectedNotFound(assessmentId);
    return result;
  }

  async compute(
    request: FinancialRiskComputeRequest,
  ): Promise<FinancialRiskCommandResult> {
    const scope = requiredScope(request.context);
    assertActor(request.context, request.actor);
    await this.authorize(
      request.context,
      request.actor,
      scope,
      request.assessmentId,
      "compute",
    );
    assertReferenceScope(scope, request.references);
    const digest = await commandDigest(request);
    const claimResult = await claim(this.repository, request, scope, digest);
    if (claimResult.status === "replayed") {
      return await replayed(
        this.repository,
        scope,
        claimResult.resultId,
        request,
      );
    }
    if (claimResult.status === "failed") {
      throw new FinancialRiskError(
        claimResult.failureCode,
        `Idempotent financial-risk command "${request.idempotencyKey}" previously failed with version conflict "${claimResult.failureCode}".`,
      );
    }
    if (claimResult.status === "in_progress") {
      throw new FinancialRiskError(
        "IDEMPOTENCY_IN_PROGRESS",
        `Idempotency key "${request.idempotencyKey}" is already running.`,
      );
    }
    try {
      await this.references.verify(request.context, scope, request.references);
      const latest = await assertExpectedVersion(
        this.repository,
        scope,
        request.assessmentId,
        request.expectedVersion,
      );
      const result = await this.executeCompute(request, scope, latest);
      await this.repository.commitResult(
        claimResult.claim,
        result,
        request.expectedVersion,
      );
      return {
        status: "accepted",
        result,
        job: durableJob(request, scope, result),
      };
    } catch (error) {
      const normalized = normalizeCommandError(error);
      await failVersionClaim(this.repository, claimResult.claim, normalized);
      throw normalized;
    }
  }

  async enqueueCompute(
    request: FinancialRiskComputeRequest,
  ): Promise<FinancialRiskQueuedCommandResult> {
    const scope = await this.authorizedCommandScope(
      request,
      request.assessmentId,
      "compute",
    );
    assertReferenceScope(scope, request.references);
    const claimResult = await claim(
      this.repository,
      request,
      scope,
      await commandDigest(request),
    );
    return await this.enqueueClaim(
      claimResult,
      request,
      scope,
      request.references,
    );
  }

  async invalidate(
    request: FinancialRiskInvalidationRequest,
  ): Promise<FinancialRiskCommandResult> {
    const scope = requiredScope(request.context);
    assertActor(request.context, request.actor);
    await this.authorize(
      request.context,
      request.actor,
      scope,
      request.assessmentId,
      "invalidate",
    );
    const digest = await payloadDigest({
      assessmentId: request.assessmentId,
      resultId: request.resultId,
      invalidationId: request.invalidationId,
      operationId: request.operationId,
      jobId: request.jobId,
      expectedVersion: request.expectedVersion,
      reason: request.reason,
    });
    const claimResult = await claim(this.repository, request, scope, digest);
    if (claimResult.status === "replayed") {
      return await replayed(
        this.repository,
        scope,
        claimResult.resultId,
        request,
      );
    }
    if (claimResult.status === "failed") {
      throw new FinancialRiskError(
        claimResult.failureCode,
        `Idempotent financial-risk command "${request.idempotencyKey}" previously failed with version conflict "${claimResult.failureCode}".`,
      );
    }
    if (claimResult.status === "in_progress") {
      throw new FinancialRiskError(
        "IDEMPOTENCY_IN_PROGRESS",
        `Idempotency key "${request.idempotencyKey}" is already running.`,
      );
    }
    try {
      const latest = await assertExpectedVersion(
        this.repository,
        scope,
        request.assessmentId,
        request.expectedVersion,
      );
      if (latest === undefined) throw protectedNotFound(request.assessmentId);
      const now = this.clock.now();
      const result = createFinancialRiskResult({
        aggregateType: "financial_risk_result",
        resultId: request.resultId,
        assessmentId: request.assessmentId,
        scope,
        version: (latest.version + 1) as AggregateVersion,
        state: "stale",
        provenance: staleProvenance(request.reason, latest.provenance),
        references: latest.references,
        actor: request.actor,
        correlationId: request.context.correlationId,
        idempotencyKey: request.idempotencyKey,
        execution: {
          operationId: request.operationId,
          jobId: request.jobId,
          status: "completed",
        },
        supersedesResultId: latest.resultId,
        reason: request.reason,
        createdAt: now,
        updatedAt: now,
      });
      await this.repository.commitResult(
        claimResult.claim,
        result,
        request.expectedVersion,
      );
      return {
        status: "accepted",
        result,
        job: durableJob(request, scope, result),
      };
    } catch (error) {
      const normalized = normalizeCommandError(error);
      await failVersionClaim(this.repository, claimResult.claim, normalized);
      throw normalized;
    }
  }

  async enqueueInvalidate(
    request: FinancialRiskInvalidationRequest,
  ): Promise<FinancialRiskQueuedCommandResult> {
    const scope = await this.authorizedCommandScope(
      request,
      request.assessmentId,
      "invalidate",
    );
    if (
      await this.repository.findLatest(scope, request.assessmentId) ===
        undefined
    ) throw protectedNotFound(request.assessmentId);
    const claimResult = await claim(
      this.repository,
      request,
      scope,
      await payloadDigest({
        assessmentId: request.assessmentId,
        resultId: request.resultId,
        invalidationId: request.invalidationId,
        operationId: request.operationId,
        jobId: request.jobId,
        expectedVersion: request.expectedVersion,
        reason: request.reason,
      }),
    );
    return await this.enqueueClaim(claimResult, request, scope);
  }

  private async executeCompute(
    request: FinancialRiskComputeRequest,
    scope: FinancialRiskScope,
    latest: FinancialRiskResult | undefined,
  ): Promise<FinancialRiskResult> {
    if (await request.cancellationRequested?.()) {
      return this.appendCancelled(request, scope, latest);
    }
    const input = await request.loadInput.load(
      request.context,
      scope,
      request.references,
    );
    if (await request.cancellationRequested?.()) {
      return this.appendCancelled(request, scope, latest);
    }
    const inference = await safeInference(this.inference, input);
    const now = this.clock.now();
    const result = createFinancialRiskResult({
      aggregateType: "financial_risk_result",
      resultId: request.resultId,
      assessmentId: request.assessmentId,
      scope,
      version: ((latest?.version ?? 0) + 1) as AggregateVersion,
      state: inference.state,
      ...(inference.state === "completed" || inference.state === "fallback"
        ? { outputs: inference.outputs }
        : {}),
      provenance: inference.provenance,
      references: request.references,
      actor: request.actor,
      correlationId: request.context.correlationId,
      idempotencyKey: request.idempotencyKey,
      execution: {
        operationId: request.operationId,
        jobId: request.jobId,
        status: executionStatus(inference.state),
      },
      reason: "reason" in inference ? inference.reason : undefined,
      createdAt: now,
      updatedAt: now,
    });
    return result;
  }

  private appendCancelled(
    request: FinancialRiskComputeRequest,
    scope: FinancialRiskScope,
    latest: FinancialRiskResult | undefined,
  ): FinancialRiskResult {
    const now = this.clock.now();
    const result = createFinancialRiskResult({
      aggregateType: "financial_risk_result",
      resultId: request.resultId,
      assessmentId: request.assessmentId,
      scope,
      version: ((latest?.version ?? 0) + 1) as AggregateVersion,
      state: "cancelled",
      provenance: cancelledProvenance(
        "Cancellation requested before inference.",
      ),
      references: request.references,
      actor: request.actor,
      correlationId: request.context.correlationId,
      idempotencyKey: request.idempotencyKey,
      execution: {
        operationId: request.operationId,
        jobId: request.jobId,
        status: "cancelled",
      },
      reason: "Cancellation requested before inference.",
      createdAt: now,
      updatedAt: now,
    });
    return result;
  }

  private async authorize(
    context: RequestContext,
    actor: ActorReference,
    scope: FinancialRiskScope,
    assessmentId: string,
    operation: "read" | "compute" | "invalidate",
  ): Promise<void> {
    const decision = await this.authorization.authorize({
      context,
      actor,
      scope,
      resource: { kind: "financial-risk-assessment", id: assessmentId },
      action: `financial-risk.${operation}`,
    });
    if (decision.outcome === "allow") return;
    throw protectedNotFound(assessmentId);
  }

  private async authorizedCommandScope(
    request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
    assessmentId: FinancialRiskAssessmentId,
    operation: "compute" | "invalidate",
  ): Promise<FinancialRiskScope> {
    const scope = requiredScope(request.context);
    assertActor(request.context, request.actor);
    await this.authorize(
      request.context,
      request.actor,
      scope,
      assessmentId,
      operation,
    );
    return scope;
  }

  private async enqueueClaim(
    claim: FinancialRiskClaim,
    request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
    scope: FinancialRiskScope,
    references?: FinancialRiskReferences,
  ): Promise<FinancialRiskQueuedCommandResult> {
    if (claim.status === "replayed") {
      return {
        status: "replayed",
        job: await this.replayedJob(scope, claim.resultId),
      };
    }
    if (claim.status === "failed") {
      throw new FinancialRiskError(
        claim.failureCode,
        `Idempotent financial-risk command "${request.idempotencyKey}" previously failed with version conflict "${claim.failureCode}".`,
      );
    }
    if (claim.status === "in_progress") {
      throw new FinancialRiskError(
        "IDEMPOTENCY_IN_PROGRESS",
        `Idempotency key "${request.idempotencyKey}" is already running.`,
      );
    }
    try {
      const latest = await assertExpectedVersion(
        this.repository,
        scope,
        request.assessmentId,
        request.expectedVersion,
      );
      if (latest === undefined && !("loadInput" in request)) {
        throw protectedNotFound(request.assessmentId);
      }
      if (references !== undefined) {
        await this.references.verify(request.context, scope, references);
      }
      const job = queuedJob(
        request,
        scope,
        references,
        this.clock.now(),
      );
      await this.requiredJobs().enqueue(job);
      await this.repository.completeIdempotency(claim.claim, job.jobId);
      return { status: "accepted", job };
    } catch (error) {
      const normalized = normalizeCommandError(error);
      await failVersionClaim(this.repository, claim.claim, normalized);
      throw normalized;
    }
  }

  private async replayedJob(
    scope: FinancialRiskScope,
    jobId: string,
  ): Promise<DurableJob> {
    const job = await this.requiredJobs().find(scope, jobId);
    if (job !== undefined) return job;
    throw protectedNotFound(jobId);
  }

  private requiredJobs(): FinancialRiskJobPort {
    if (this.jobs !== undefined) return this.jobs;
    throw new FinancialRiskError(
      "DEPENDENCY_UNAVAILABLE",
      "Financial-risk durable job queue is not configured; expected an injected job port.",
    );
  }
}
