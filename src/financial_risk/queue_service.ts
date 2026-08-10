import type {
  ActorReference,
  AllowedAuthorizationDecision,
} from "../platform/authz/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { DurableJob } from "../platform/jobs/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import {
  FinancialRiskError,
  FinancialRiskIdempotencyReplayError,
} from "./errors.ts";
import type {
  FinancialRiskAuthorizationPort,
  FinancialRiskComputeRequest,
  FinancialRiskInvalidationRequest,
  FinancialRiskQueuedCommandResult,
  FinancialRiskReferenceVerificationPort,
} from "./application_contracts.ts";
import type { FinancialRiskAssessmentId } from "./ids.ts";
import type { FinancialRiskReferences, FinancialRiskScope } from "./model.ts";
import type {
  FinancialRiskIdempotencyClaim,
  FinancialRiskRepository,
} from "./repository.ts";
import {
  assertActor,
  assertReferenceScope,
  commandDigest,
  protectedNotFound,
  queuedJob,
  requiredScope,
  systemClock,
} from "./application_support.ts";
import {
  assertExpectedVersion,
  createCommandClaim,
  normalizeCommandError,
} from "./application_internal.ts";
import {
  type FinancialRiskJobPort,
  type FinancialRiskQueueLookupResult,
} from "./job_port.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import { assertFinancialRiskInputAccess } from "./input_contract.ts";

export class FinancialRiskQueueService {
  constructor(
    private readonly authorization: FinancialRiskAuthorizationPort,
    private readonly references: FinancialRiskReferenceVerificationPort,
    private readonly repository: FinancialRiskRepository,
    private readonly jobs: FinancialRiskJobPort | undefined,
    private readonly clock: Clock = systemClock,
  ) {}

  async enqueueCompute(
    request: FinancialRiskComputeRequest,
  ): Promise<FinancialRiskQueuedCommandResult> {
    const authorized = await this.authorized(request, "compute");
    assertReferenceScope(authorized.scope, request.references);
    return await this.enqueue(
      request,
      authorized.scope,
      authorized.authorization,
      request.references,
      await commandDigest(request),
    );
  }

  async enqueueInvalidate(
    request: FinancialRiskInvalidationRequest,
  ): Promise<FinancialRiskQueuedCommandResult> {
    const authorized = await this.authorized(request, "invalidate");
    if (
      await this.repository.findLatestAuthorized(
        authorized.authorization.approvedScope,
        request.assessmentId,
      ) === undefined
    ) throw protectedNotFound(request.assessmentId);
    return await this.enqueue(
      request,
      authorized.scope,
      authorized.authorization,
      undefined,
      await invalidationDigest(request),
    );
  }

  private async authorized(
    request: QueueAuthorizationRequest,
    operation: "compute" | "invalidate",
  ): Promise<AuthorizedQueueScope> {
    const scope = requiredScope(request.context);
    assertActor(request.context, request.actor);
    const decision = await this.authorization.authorize({
      context: request.context,
      actor: request.actor,
      scope,
      resource: { kind: "financial-risk-assessment", id: request.assessmentId },
      action: `financial-risk.${operation}`,
    });
    if (
      decision.outcome === "allow" &&
      approvedScopeMatches(
        decision,
        request.actor,
        scope,
        request.assessmentId,
        operation,
      )
    ) {
      if (operation === "compute") {
        assertFinancialRiskInputAccess(decision, request.assessmentId);
      }
      return { scope, authorization: decision };
    }
    throw protectedNotFound(request.assessmentId);
  }

  private async enqueue(
    request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
    scope: FinancialRiskScope,
    authorization: AllowedAuthorizationDecision,
    references: FinancialRiskReferences | undefined,
    digest: string,
  ): Promise<FinancialRiskQueuedCommandResult> {
    try {
      return await this.enqueueInternal(
        request,
        scope,
        authorization,
        references,
        digest,
      );
    } catch (error) {
      throw queueError(error);
    }
  }

  private async enqueueInternal(
    request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
    scope: FinancialRiskScope,
    authorization: AllowedAuthorizationDecision,
    references: FinancialRiskReferences | undefined,
    digest: string,
  ): Promise<FinancialRiskQueuedCommandResult> {
    const commandClaim = createCommandClaim(request, scope, digest);
    const jobs = this.requiredJobs();
    const existing = await jobs.peek(commandClaim);
    if (existing.status !== "missing") {
      return await this.queueOutcome(existing, scope, request);
    }
    const job = await this.preflight(
      request,
      scope,
      authorization,
      references,
      commandClaim,
    );
    const result = await jobs.claimAndEnqueue(commandClaim, job);
    return await this.queueOutcome(result, scope, request, job);
  }

  private async preflight(
    request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
    scope: FinancialRiskScope,
    authorization: AllowedAuthorizationDecision,
    references: FinancialRiskReferences | undefined,
    claim: FinancialRiskIdempotencyClaim,
  ): Promise<DurableJob> {
    try {
      const latest = await assertExpectedVersion(
        this.repository,
        authorization,
        scope,
        request.assessmentId,
        request.expectedVersion,
      );
      if (latest === undefined && !("loadInput" in request)) {
        throw protectedNotFound(request.assessmentId);
      }
      if (references !== undefined) {
        await this.references.verify(
          request.context,
          authorization,
          scope,
          references,
        );
      }
      return queuedJob(
        request,
        scope,
        references,
        this.clock.now(),
        authorization,
      );
    } catch (error) {
      const normalized = normalizeCommandError(error);
      if (!isVersionFailure(normalized)) throw normalized;
      const result = await this.requiredJobs().claimAndFail(
        claim,
        normalized.code,
      );
      if (result.status === "failed") throw normalized;
      if (result.status === "replayed") {
        return await this.replayedJob(scope, result.resultId);
      }
      throw new FinancialRiskError(
        "IDEMPOTENCY_IN_PROGRESS",
        `Idempotency key "${claim.idempotencyKey}" is already running.`,
      );
    }
  }

  private async queueOutcome(
    result: FinancialRiskQueueLookupResult,
    scope: FinancialRiskScope,
    request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
    acceptedJob?: DurableJob,
  ): Promise<FinancialRiskQueuedCommandResult> {
    if (result.status === "missing") {
      throw new FinancialRiskError(
        "DEPENDENCY_UNAVAILABLE",
        `Financial-risk queue lookup for idempotency key "${request.idempotencyKey}" returned no durable outcome.`,
      );
    }
    if (result.status === "claimed") {
      if (acceptedJob === undefined) {
        throw new FinancialRiskError(
          "DEPENDENCY_UNAVAILABLE",
          `Financial-risk queue accepted idempotency key "${request.idempotencyKey}" without a persisted job.`,
        );
      }
      return { status: "accepted", job: acceptedJob };
    }
    if (result.status === "replayed") {
      return {
        status: "replayed",
        job: await this.replayedJob(scope, result.resultId),
      };
    }
    if (result.status === "failed") {
      throw new FinancialRiskIdempotencyReplayError(
        result.failureCode,
        request.idempotencyKey,
      );
    }
    throw new FinancialRiskError(
      "IDEMPOTENCY_IN_PROGRESS",
      `Idempotency key "${request.idempotencyKey}" is already running.`,
    );
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

interface QueueAuthorizationRequest {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly assessmentId: FinancialRiskAssessmentId;
}

interface AuthorizedQueueScope {
  readonly scope: FinancialRiskScope;
  readonly authorization: AllowedAuthorizationDecision;
}

function approvedScopeMatches(
  decision: AllowedAuthorizationDecision,
  actor: ActorReference,
  scope: FinancialRiskScope,
  assessmentId: string,
  operation: "compute" | "invalidate",
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

function invalidationDigest(
  request: FinancialRiskInvalidationRequest,
): Promise<string> {
  return payloadDigest({
    assessmentId: request.assessmentId,
    resultId: request.resultId,
    invalidationId: request.invalidationId,
    operationId: request.operationId,
    jobId: request.jobId,
    expectedVersion: request.expectedVersion,
    reason: request.reason,
  });
}

function isVersionFailure(
  error: unknown,
): error is FinancialRiskError & {
  readonly code: "STALE_VERSION" | "VERSION_CONFLICT";
} {
  return error instanceof FinancialRiskError &&
    (error.code === "STALE_VERSION" || error.code === "VERSION_CONFLICT");
}

function queueError(error: unknown): unknown {
  if (
    error instanceof Error && error.message.startsWith("IDEMPOTENCY_CONFLICT")
  ) {
    return new FinancialRiskError("IDEMPOTENCY_CONFLICT", error.message);
  }
  return error;
}
