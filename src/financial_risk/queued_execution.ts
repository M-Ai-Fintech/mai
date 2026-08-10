import type {
  ActorReference,
  AllowedAuthorizationDecision,
} from "../platform/authz/v1.ts";
import type { AggregateVersion, RequestContext } from "../platform/api/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import {
  createFinancialRiskResult,
  type FinancialRiskResult,
  type FinancialRiskScope,
} from "./model.ts";
import { FinancialRiskError } from "./errors.ts";
import type {
  FinancialRiskAuthorizationPort,
  FinancialRiskInputLoader,
  FinancialRiskQueuedCommand,
  FinancialRiskQueuedComputeRequest,
  FinancialRiskReferenceVerificationPort,
} from "./application_contracts.ts";
import type { FinancialRiskInferencePort } from "./ports.ts";
import type { FinancialRiskRepository } from "./repository.ts";
import {
  assertActor,
  assertReferenceScope,
  cancelledProvenance,
  canonicalReferences,
  protectedNotFound,
  requiredScope,
  staleProvenance,
} from "./application_support.ts";
import {
  assertExpectedVersion,
  executionStatus,
  safeInference,
} from "./application_internal.ts";
import type { FinancialRiskInvalidationRequest } from "./application_contracts.ts";

export interface FinancialRiskQueuedExecutionDependencies {
  readonly authorization: FinancialRiskAuthorizationPort;
  readonly references: FinancialRiskReferenceVerificationPort;
  readonly inference: FinancialRiskInferencePort;
  readonly repository: FinancialRiskRepository;
  readonly clock: Clock;
}

export class FinancialRiskQueuedExecution {
  constructor(
    private readonly dependencies: FinancialRiskQueuedExecutionDependencies,
  ) {}

  async recheck(command: FinancialRiskQueuedCommand): Promise<boolean> {
    try {
      if (command.kind === "compute") {
        await this.recheckCompute(command.request);
      } else {
        await this.recheckInvalidation(command.request);
      }
      return true;
    } catch {
      return false;
    }
  }

  execute(
    command: FinancialRiskQueuedCommand,
    loadInput: FinancialRiskInputLoader,
    cancellationRequested?: () => Promise<boolean>,
  ): Promise<FinancialRiskResult> {
    return command.kind === "compute"
      ? this.executeCompute(command.request, loadInput, cancellationRequested)
      : this.executeInvalidation(command.request);
  }

  private async recheckCompute(
    request: FinancialRiskQueuedComputeRequest,
  ): Promise<void> {
    const authorized = await this.authorized(request, "compute");
    assertReferenceScope(authorized.scope, request.references);
    if (await this.existingResult(request, authorized.scope) !== undefined) {
      return;
    }
    await this.dependencies.references.verify(
      request.context,
      authorized.authorization,
      authorized.scope,
      request.references,
    );
    await this.assertVersion(request, authorized);
  }

  private async recheckInvalidation(
    request: FinancialRiskInvalidationRequest,
  ): Promise<void> {
    const authorized = await this.authorized(request, "invalidate");
    if (await this.existingResult(request, authorized.scope) !== undefined) {
      return;
    }
    const latest = await this.assertVersion(request, authorized);
    if (latest === undefined) throw protectedNotFound(request.assessmentId);
  }

  private async executeCompute(
    request: FinancialRiskQueuedComputeRequest,
    loadInput: FinancialRiskInputLoader,
    cancellationRequested?: () => Promise<boolean>,
  ): Promise<FinancialRiskResult> {
    const authorized = await this.authorized(request, "compute");
    assertReferenceScope(authorized.scope, request.references);
    const replayed = await this.existingResult(request, authorized.scope);
    if (replayed !== undefined) return replayed;
    await this.dependencies.references.verify(
      request.context,
      authorized.authorization,
      authorized.scope,
      request.references,
    );
    const latest = await this.assertVersion(request, authorized);
    const result = await this.infer(
      request,
      authorized.authorization,
      authorized.scope,
      latest,
      loadInput,
      cancellationRequested,
    );
    await this.dependencies.repository.commitQueuedResult(
      result,
      request.expectedVersion,
    );
    return result;
  }

  private async executeInvalidation(
    request: FinancialRiskInvalidationRequest,
  ): Promise<FinancialRiskResult> {
    const authorized = await this.authorized(request, "invalidate");
    const replayed = await this.existingResult(request, authorized.scope);
    if (replayed !== undefined) return replayed;
    const latest = await this.assertVersion(request, authorized);
    if (latest === undefined) throw protectedNotFound(request.assessmentId);
    const result = staleResult(
      request,
      authorized.scope,
      latest,
      this.dependencies.clock,
    );
    await this.dependencies.repository.commitQueuedResult(
      result,
      request.expectedVersion,
    );
    return result;
  }

  private async infer(
    request: FinancialRiskQueuedComputeRequest,
    authorization: AllowedAuthorizationDecision,
    scope: FinancialRiskScope,
    latest: FinancialRiskResult | undefined,
    loadInput: FinancialRiskInputLoader,
    cancellationRequested?: () => Promise<boolean>,
  ): Promise<FinancialRiskResult> {
    if (await cancellationRequested?.()) {
      return cancelledResult(request, scope, latest, this.dependencies.clock);
    }
    const input = await loadInput.load(
      request.context,
      authorization,
      scope,
      request.references,
    );
    if (await cancellationRequested?.()) {
      return cancelledResult(request, scope, latest, this.dependencies.clock);
    }
    const inference = await safeInference(this.dependencies.inference, input);
    const now = this.dependencies.clock.now();
    return createFinancialRiskResult({
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
  }

  private async authorized(
    request: QueuedAuthorizationRequest,
    operation: "compute" | "invalidate",
  ): Promise<AuthorizedQueuedScope> {
    const scope = requiredScope(request.context);
    assertActor(request.context, request.actor);
    const decision = await this.dependencies.authorization.authorize({
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
    ) return { scope, authorization: decision };
    throw protectedNotFound(request.assessmentId);
  }

  private assertVersion(
    request: QueuedAuthorizationRequest,
    authorized: AuthorizedQueuedScope,
  ): Promise<FinancialRiskResult | undefined> {
    return assertExpectedVersion(
      this.dependencies.repository,
      authorized.authorization,
      authorized.scope,
      request.assessmentId,
      request.expectedVersion,
    );
  }

  private async existingResult(
    request: QueuedAuthorizationRequest,
    scope: FinancialRiskScope,
  ): Promise<FinancialRiskResult | undefined> {
    const result = await this.dependencies.repository.findById(
      scope,
      request.resultId,
    );
    if (result === undefined) return undefined;
    if (
      result.assessmentId === request.assessmentId &&
      result.idempotencyKey === request.idempotencyKey &&
      result.execution.jobId === request.jobId &&
      result.execution.operationId === request.operationId &&
      (request.references === undefined ||
        JSON.stringify(canonicalReferences(result.references)) ===
          JSON.stringify(canonicalReferences(request.references)))
    ) return result;
    throw new FinancialRiskError(
      "VERSION_CONFLICT",
      `Financial-risk result "${request.resultId}" exists for another queued command; expected the exact assessment, job, operation, and idempotency identity.`,
    );
  }
}

type QueuedAuthorizationRequest = {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly assessmentId: FinancialRiskQueuedComputeRequest["assessmentId"];
  readonly resultId: FinancialRiskQueuedComputeRequest["resultId"];
  readonly idempotencyKey: FinancialRiskQueuedComputeRequest["idempotencyKey"];
  readonly jobId: FinancialRiskQueuedComputeRequest["jobId"];
  readonly operationId: FinancialRiskQueuedComputeRequest["operationId"];
  readonly expectedVersion: AggregateVersion;
  readonly references?: FinancialRiskQueuedComputeRequest["references"];
};

interface AuthorizedQueuedScope {
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

function cancelledResult(
  request: FinancialRiskQueuedComputeRequest,
  scope: FinancialRiskScope,
  latest: FinancialRiskResult | undefined,
  clock: Clock,
): FinancialRiskResult {
  const now = clock.now();
  return createFinancialRiskResult({
    aggregateType: "financial_risk_result",
    resultId: request.resultId,
    assessmentId: request.assessmentId,
    scope,
    version: ((latest?.version ?? 0) + 1) as AggregateVersion,
    state: "cancelled",
    provenance: cancelledProvenance("Cancellation requested before inference."),
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
}

function staleResult(
  request: FinancialRiskInvalidationRequest,
  scope: FinancialRiskScope,
  latest: FinancialRiskResult,
  clock: Clock,
): FinancialRiskResult {
  const now = clock.now();
  return createFinancialRiskResult({
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
}
