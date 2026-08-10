import type {
  ActorReference,
  AllowedAuthorizationDecision,
} from "../platform/authz/v1.ts";
import {
  type AggregateVersion,
  type RequestContext,
} from "../platform/api/v1.ts";
import { type Clock, payloadDigest } from "../platform/persistence/v1.ts";
import {
  createFinancialRiskResult,
  type FinancialRiskResult,
  type FinancialRiskScope,
} from "./model.ts";
import { FinancialRiskError } from "./errors.ts";
import type { FinancialRiskInferencePort } from "./ports.ts";
import type { FinancialRiskJobPort } from "./job_port.ts";
import { FinancialRiskQueuedExecution } from "./queued_execution.ts";
import { FinancialRiskQueueService } from "./queue_service.ts";
import type { FinancialRiskAssessmentId } from "./ids.ts";
import type { FinancialRiskRepository } from "./repository.ts";
import {
  assertActor,
  assertReferenceScope,
  cancelledProvenance,
  commandDigest,
  durableJob,
  protectedNotFound,
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
  normalizeCommandError,
  safeInference,
} from "./application_internal.ts";
import type {
  FinancialRiskAuthorizationPort,
  FinancialRiskAuthorizedRead,
  FinancialRiskCommandResult,
  FinancialRiskComputeRequest,
  FinancialRiskInputLoader,
  FinancialRiskInvalidationRequest,
  FinancialRiskQueuedCommand,
  FinancialRiskQueuedCommandResult,
  FinancialRiskReferenceVerificationPort,
} from "./application_contracts.ts";
export type {
  FinancialRiskAuthorizationPort,
  FinancialRiskAuthorizedRead,
  FinancialRiskCommandRequest,
  FinancialRiskCommandResult,
  FinancialRiskComputeRequest,
  FinancialRiskInputLoader,
  FinancialRiskInvalidationRequest,
  FinancialRiskQueuedCommand,
  FinancialRiskQueuedCommandResult,
  FinancialRiskQueuedComputeRequest,
  FinancialRiskReferenceVerificationPort,
} from "./application_contracts.ts";

export class FinancialRiskApplication {
  constructor(
    private readonly authorization: FinancialRiskAuthorizationPort,
    private readonly references: FinancialRiskReferenceVerificationPort,
    private readonly inference: FinancialRiskInferencePort,
    private readonly repository: FinancialRiskRepository,
    private readonly clock: Clock = systemClock,
    jobs?: FinancialRiskJobPort,
  ) {
    this.queuedExecution = new FinancialRiskQueuedExecution({
      authorization,
      references,
      inference,
      repository,
      clock,
    });
    this.queue = new FinancialRiskQueueService(
      authorization,
      references,
      repository,
      jobs,
      clock,
    );
  }

  private readonly queuedExecution: FinancialRiskQueuedExecution;
  private readonly queue: FinancialRiskQueueService;

  async read(
    context: RequestContext,
    actor: ActorReference,
    assessmentId: FinancialRiskAssessmentId,
  ): Promise<FinancialRiskAuthorizedRead> {
    const scope = requiredScope(context);
    assertActor(context, actor);
    const authorization = await this.authorize(
      context,
      actor,
      scope,
      assessmentId,
      "read",
    );
    const result = await this.repository.findLatestAuthorized(
      authorization.approvedScope,
      assessmentId,
    );
    if (result === undefined) throw protectedNotFound(assessmentId);
    return { result, authorization };
  }

  async compute(
    request: FinancialRiskComputeRequest,
  ): Promise<FinancialRiskCommandResult> {
    const scope = requiredScope(request.context);
    assertActor(request.context, request.actor);
    const authorization = await this.authorize(
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
      await this.references.verify(
        request.context,
        authorization,
        scope,
        request.references,
      );
      const latest = await assertExpectedVersion(
        this.repository,
        authorization,
        scope,
        request.assessmentId,
        request.expectedVersion,
      );
      const result = await this.executeCompute(
        request,
        authorization,
        scope,
        latest,
      );
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
    return await this.queue.enqueueCompute(request);
  }

  async recheckQueuedCommand(
    command: FinancialRiskQueuedCommand,
  ): Promise<boolean> {
    return await this.queuedExecution.recheck(command);
  }

  async executeQueuedCommand(
    command: FinancialRiskQueuedCommand,
    loadInput: FinancialRiskInputLoader,
    cancellationRequested?: () => Promise<boolean>,
  ): Promise<FinancialRiskResult> {
    return await this.queuedExecution.execute(
      command,
      loadInput,
      cancellationRequested,
    );
  }

  async invalidate(
    request: FinancialRiskInvalidationRequest,
  ): Promise<FinancialRiskCommandResult> {
    const scope = requiredScope(request.context);
    assertActor(request.context, request.actor);
    const authorization = await this.authorize(
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
        authorization,
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
    return await this.queue.enqueueInvalidate(request);
  }

  private async executeCompute(
    request: FinancialRiskComputeRequest,
    authorization: AllowedAuthorizationDecision,
    scope: FinancialRiskScope,
    latest: FinancialRiskResult | undefined,
  ): Promise<FinancialRiskResult> {
    if (await request.cancellationRequested?.()) {
      return this.appendCancelled(request, scope, latest);
    }
    const input = await request.loadInput.load(
      request.context,
      authorization,
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
  ): Promise<AllowedAuthorizationDecision> {
    const decision = await this.authorization.authorize({
      context,
      actor,
      scope,
      resource: { kind: "financial-risk-assessment", id: assessmentId },
      action: `financial-risk.${operation}`,
    });
    if (
      decision.outcome === "allow" &&
      approvedScopeMatches(decision, actor, scope, assessmentId, operation)
    ) return decision;
    throw protectedNotFound(assessmentId);
  }
}

function approvedScopeMatches(
  decision: AllowedAuthorizationDecision,
  actor: ActorReference,
  scope: FinancialRiskScope,
  assessmentId: string,
  operation: "read" | "compute" | "invalidate",
): boolean {
  const approved = decision.approvedScope;
  return approved.actorId === actor.id &&
    approved.tenantId === scope.tenantId &&
    approved.workspaceId === scope.workspaceId &&
    approved.dealId === scope.dealId &&
    approved.resource.kind === "financial-risk-assessment" &&
    approved.resource.id === assessmentId &&
    decision.allowedActions.some((allowed) =>
      allowed === `financial-risk.${operation}`
    );
}
