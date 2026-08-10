import {
  type ActorReference,
  type AuthorizationDecision,
} from "../platform/authz/v1.ts";
import {
  type AggregateVersion,
  type IdempotencyKey,
  type RequestContext,
} from "../platform/api/v1.ts";
import type { DurableJob } from "../platform/jobs/v1.ts";
import { type Clock, payloadDigest } from "../platform/persistence/v1.ts";
import {
  createFinancialRiskResult,
  type FinancialRiskInput,
  type FinancialRiskProvenance,
  type FinancialRiskReferences,
  type FinancialRiskResult,
  type FinancialRiskScope,
} from "./model.ts";
import { FinancialRiskError } from "./errors.ts";
import type { FinancialRiskInferencePort } from "./ports.ts";
import {
  type FinancialRiskAssessmentId,
  type FinancialRiskInvalidationId,
  type FinancialRiskResultId,
} from "./ids.ts";
import type {
  FinancialRiskCommandType,
  FinancialRiskRepository,
} from "./repository.ts";
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
  staleVersion,
  systemClock,
} from "./application_support.ts";

export interface FinancialRiskAuthorizationPort {
  authorize(input: {
    readonly context: RequestContext;
    readonly actor: ActorReference;
    readonly scope: FinancialRiskScope;
    readonly resource: { readonly kind: string; readonly id: string };
    readonly action: string;
  }): Promise<AuthorizationDecision>;
}

export interface FinancialRiskReferenceVerificationPort {
  verify(
    context: RequestContext,
    scope: FinancialRiskScope,
    references: FinancialRiskReferences,
  ): Promise<void>;
}

export interface FinancialRiskInputLoader {
  load(
    context: RequestContext,
    scope: FinancialRiskScope,
    references: FinancialRiskReferences,
  ): Promise<FinancialRiskInput>;
}

export interface FinancialRiskComputeRequest {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly assessmentId: FinancialRiskAssessmentId;
  readonly resultId: FinancialRiskResultId;
  readonly operationId: import("../platform/api/v1.ts").OperationId;
  readonly jobId: import("../platform/api/v1.ts").JobId;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
  readonly references: FinancialRiskReferences;
  readonly loadInput: FinancialRiskInputLoader;
  readonly cancellationRequested?: () => Promise<boolean>;
}

export interface FinancialRiskInvalidationRequest {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly assessmentId: FinancialRiskAssessmentId;
  readonly resultId: FinancialRiskResultId;
  readonly invalidationId: FinancialRiskInvalidationId;
  readonly operationId: import("../platform/api/v1.ts").OperationId;
  readonly jobId: import("../platform/api/v1.ts").JobId;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
  readonly reason: string;
}

export interface FinancialRiskCommandResult {
  readonly status: "accepted" | "replayed";
  readonly result: FinancialRiskResult;
  readonly job: DurableJob;
}

export class FinancialRiskApplication {
  constructor(
    private readonly authorization: FinancialRiskAuthorizationPort,
    private readonly references: FinancialRiskReferenceVerificationPort,
    private readonly inference: FinancialRiskInferencePort,
    private readonly repository: FinancialRiskRepository,
    private readonly clock: Clock = systemClock,
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
    await this.references.verify(request.context, scope, request.references);
    const claim = await this.claim(request, scope, digest);
    if (claim.status === "replayed") {
      return await replayed(this.repository, scope, claim.resultId, request);
    }
    if (claim.status === "failed") {
      throw new FinancialRiskError(
        claim.failureCode,
        `Idempotent financial-risk command "${request.idempotencyKey}" previously failed because its source version was stale.`,
      );
    }
    if (claim.status === "in_progress") {
      throw new FinancialRiskError(
        "IDEMPOTENCY_IN_PROGRESS",
        `Idempotency key "${request.idempotencyKey}" is already running.`,
      );
    }
    try {
      await this.assertExpectedVersion(
        scope,
        request.assessmentId,
        request.expectedVersion,
      );
      const result = await this.executeCompute(request, scope);
      await this.repository.completeIdempotency(claim.claim, result.resultId);
      return {
        status: "accepted",
        result,
        job: durableJob(request, scope, result),
      };
    } catch (error) {
      await this.failStaleClaim(claim.claim, error);
      throw error;
    }
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
    const claim = await this.claim(request, scope, digest);
    if (claim.status === "replayed") {
      return await replayed(this.repository, scope, claim.resultId, request);
    }
    if (claim.status === "failed") {
      throw new FinancialRiskError(
        claim.failureCode,
        `Idempotent financial-risk command "${request.idempotencyKey}" previously failed because its source version was stale.`,
      );
    }
    if (claim.status === "in_progress") {
      throw new FinancialRiskError(
        "IDEMPOTENCY_IN_PROGRESS",
        `Idempotency key "${request.idempotencyKey}" is already running.`,
      );
    }
    try {
      const latest = await this.assertExpectedVersion(
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
      await this.repository.append(result);
      await this.repository.completeIdempotency(claim.claim, result.resultId);
      return {
        status: "accepted",
        result,
        job: durableJob(request, scope, result),
      };
    } catch (error) {
      await this.failStaleClaim(claim.claim, error);
      throw error;
    }
  }

  private async executeCompute(
    request: FinancialRiskComputeRequest,
    scope: FinancialRiskScope,
  ): Promise<FinancialRiskResult> {
    const latest = await this.repository.findLatest(
      scope,
      request.assessmentId,
    );
    if (latest !== undefined && latest.version !== request.expectedVersion) {
      throw staleVersion(request.expectedVersion, latest.version);
    }
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
    const inference = await this.safeInference(input);
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
    await this.repository.append(result);
    return result;
  }

  private appendCancelled(
    request: FinancialRiskComputeRequest,
    scope: FinancialRiskScope,
    latest: FinancialRiskResult | undefined,
  ): Promise<FinancialRiskResult> {
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
    return this.repository.append(result).then(() => result);
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

  private async safeInference(
    input: FinancialRiskInput,
  ): Promise<Awaited<ReturnType<FinancialRiskInferencePort["infer"]>>> {
    try {
      return await this.inference.infer(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return {
        state: "failed",
        reason,
        provenance: failedProvenance(reason),
      };
    }
  }

  private claim(
    request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
    scope: FinancialRiskScope,
    digest: string,
  ) {
    return this.repository.claimIdempotency({
      commandType: commandType(request),
      scope,
      actorId: request.actor.id,
      assessmentId: request.assessmentId,
      idempotencyKey: request.idempotencyKey,
      payloadDigest: digest,
    }).catch((error) => {
      if (
        error instanceof Error &&
        error.message.startsWith("IDEMPOTENCY_CONFLICT")
      ) {
        throw new FinancialRiskError("IDEMPOTENCY_CONFLICT", error.message);
      }
      throw error;
    }).then((value) => ({
      ...value,
      claim: {
        commandType: commandType(request),
        scope,
        actorId: request.actor.id,
        assessmentId: request.assessmentId,
        idempotencyKey: request.idempotencyKey,
        payloadDigest: digest,
      },
    }));
  }

  private async assertExpectedVersion(
    scope: FinancialRiskScope,
    assessmentId: FinancialRiskAssessmentId,
    expectedVersion: AggregateVersion,
  ): Promise<FinancialRiskResult | undefined> {
    const latest = await this.repository.findLatest(scope, assessmentId);
    if (latest === undefined || latest.version === expectedVersion) {
      return latest;
    }
    throw staleVersion(expectedVersion, latest.version);
  }

  private async failStaleClaim(
    claim: Parameters<FinancialRiskRepository["completeIdempotency"]>[0],
    error: unknown,
  ): Promise<void> {
    if (
      !(error instanceof FinancialRiskError) || error.code !== "STALE_VERSION"
    ) {
      return;
    }
    await this.repository.failIdempotency(claim, "STALE_VERSION");
  }
}

function commandType(
  request: FinancialRiskComputeRequest | FinancialRiskInvalidationRequest,
): FinancialRiskCommandType {
  return "loadInput" in request
    ? "financial-risk.compute"
    : "financial-risk.invalidate";
}

function executionStatus(
  state: Awaited<ReturnType<FinancialRiskInferencePort["infer"]>>["state"],
): "completed" | "failed" | "cancelled" {
  if (state === "cancelled") return "cancelled";
  if (state === "failed" || state === "unavailable") return "failed";
  return "completed";
}

function failedProvenance(reason: string): FinancialRiskProvenance {
  return {
    kind: "failed",
    reason,
    readiness: "unavailable",
    runtimeIdentity: "financial-risk-domain",
    adapterIdentity: "financial-risk-port",
  };
}
