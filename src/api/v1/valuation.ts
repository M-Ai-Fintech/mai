import {
  createApiError,
  createProtectedNotFoundError,
  type ErrorEnvelope,
  formatEtag,
  type IdempotencyKey,
  type JobId,
  type OperationId,
  type RequestContext,
} from "../../platform/api/v1.ts";
import type { ActorReference } from "../../platform/authz/v1.ts";
import type { AggregateVersion } from "../../shared/contracts/aggregate_version.ts";
import type {
  ValuationApprovalId,
  ValuationComparisonId,
  ValuationInvalidationId,
  ValuationResultId,
  ValuationScenarioId,
} from "../../valuation/ids.ts";
import type { ValuationScope } from "../../valuation/basis.ts";
import type {
  ApproveValuationCommand,
  CommandResult,
  EnqueueValuationComputeCommand,
  InvalidateValuationCommand,
} from "../../valuation/commands.ts";
import type {
  ValuationAuthoritySnapshot,
  ValuationComparison,
  ValuationInvalidation,
  ValuationResult,
  ValuationScenario,
} from "../../valuation/model.ts";
import type { DurableJob } from "../../platform/jobs/v1.ts";
import type { ValuationReadPort } from "../../valuation/read.ts";

export type ValuationResource = "scenario" | "result" | "comparison";

export interface ValuationAuthenticatedContext {
  readonly context: RequestContext;
  readonly actor: ActorReference;
}

export interface ValuationAuthorizationRequest {
  readonly resource: ValuationResource;
  readonly resourceId: string;
  readonly context: RequestContext;
  readonly scope: ValuationScope;
}

export interface ValuationAuthorizationPort {
  authorize(request: ValuationAuthorizationRequest): Promise<boolean>;
}

export interface ValuationAuthorityPort {
  resolve(input: {
    readonly context: RequestContext;
    readonly actor: ActorReference;
    readonly scope: ValuationScope;
    readonly scenarioId: ValuationScenarioId;
    readonly resultId: ValuationResultId;
  }): Promise<ValuationAuthoritySnapshot | undefined>;
}

export interface ValuationCommandPort {
  enqueueCompute(
    command: EnqueueValuationComputeCommand,
  ): Promise<CommandResult<DurableJob>>;
  approve(
    command: ApproveValuationCommand,
  ): Promise<
    CommandResult<import("../../valuation/model.ts").ValuationApproval>
  >;
  invalidate(
    command: InvalidateValuationCommand,
  ): Promise<CommandResult<ValuationInvalidation>>;
}

export interface EnqueueValuationComputeRequest {
  readonly authenticated: ValuationAuthenticatedContext;
  readonly scenarioId: ValuationScenarioId;
  readonly jobId: JobId;
  readonly operationId: OperationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
  readonly timeoutMs?: number;
}

export interface ApproveValuationRequest {
  readonly authenticated: ValuationAuthenticatedContext;
  readonly scenarioId: ValuationScenarioId;
  readonly resultId: ValuationResultId;
  readonly approvalId: ValuationApprovalId;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
}

export interface InvalidateValuationRequest {
  readonly authenticated: ValuationAuthenticatedContext;
  readonly scenarioId: ValuationScenarioId;
  readonly resultId?: ValuationResultId;
  readonly invalidationId: ValuationInvalidationId;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion: AggregateVersion;
  readonly kind: "stale" | "invalidated";
  readonly reason: string;
  readonly sourceReference?: string;
}

export type ValuationApiResult<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "error"; readonly error: ErrorEnvelope };

export interface ValuationReadView<T> {
  readonly value: T;
  readonly etag: string;
}

export class ValuationV1Application {
  constructor(
    private readonly authorization: ValuationAuthorizationPort,
    private readonly reads: ValuationReadPort,
    private readonly commands: ValuationCommandPort,
    private readonly authority: ValuationAuthorityPort,
  ) {}

  readScenario(
    authenticated: ValuationAuthenticatedContext,
    id: ValuationScenarioId,
  ): Promise<ValuationApiResult<ValuationReadView<ValuationScenario>>> {
    return this.read(
      authenticated,
      "scenario",
      id,
      (scope) => this.reads.findScenario(scope, id),
      (value) => value.version,
    );
  }

  readResult(
    authenticated: ValuationAuthenticatedContext,
    id: ValuationResultId,
  ): Promise<ValuationApiResult<ValuationReadView<ValuationResult>>> {
    return this.read(
      authenticated,
      "result",
      id,
      (scope) => this.reads.findResult(scope, id),
      (value) => value.scenarioVersion,
    );
  }

  readComparison(
    authenticated: ValuationAuthenticatedContext,
    id: ValuationComparisonId,
  ): Promise<ValuationApiResult<ValuationReadView<ValuationComparison>>> {
    return this.read(
      authenticated,
      "comparison",
      id,
      (scope) => this.reads.findComparison(scope, id),
      (value) => value.projectionVersion,
    );
  }

  async enqueueCompute(
    request: EnqueueValuationComputeRequest,
  ): Promise<ValuationApiResult<DurableJob>> {
    const access = await this.authorize(
      request.authenticated,
      "scenario",
      request.scenarioId,
    );
    if (access.kind === "error") return access;
    try {
      const result = await this.commands.enqueueCompute({
        context: request.authenticated.context,
        actor: request.authenticated.actor,
        scenarioId: request.scenarioId,
        jobId: request.jobId,
        operationId: request.operationId,
        idempotencyKey: request.idempotencyKey,
        expectedScenarioVersion: request.expectedVersion,
        timeoutMs: request.timeoutMs,
      });
      return { kind: "ok", value: result.value };
    } catch (error) {
      return {
        kind: "error",
        error: valuationApiError(
          error,
          request.authenticated.context.correlationId,
        ),
      };
    }
  }

  async approve(
    request: ApproveValuationRequest,
  ): Promise<
    ValuationApiResult<import("../../valuation/model.ts").ValuationApproval>
  > {
    const access = await this.authorize(
      request.authenticated,
      "result",
      request.resultId,
    );
    if (access.kind === "error") return access;
    const scope = requestScope(request.authenticated.context);
    if (scope === undefined) {
      return validationScope(request.authenticated.context);
    }
    const authority = await this.authority.resolve({
      context: request.authenticated.context,
      actor: request.authenticated.actor,
      scope,
      scenarioId: request.scenarioId,
      resultId: request.resultId,
    });
    if (authority === undefined) {
      return forbidden(request.authenticated.context);
    }
    try {
      const result = await this.commands.approve({
        context: request.authenticated.context,
        actor: request.authenticated.actor,
        authority,
        scenarioId: request.scenarioId,
        resultId: request.resultId,
        approvalId: request.approvalId,
        expectedScenarioVersion: request.expectedVersion,
        idempotencyKey: request.idempotencyKey,
      });
      return { kind: "ok", value: result.value };
    } catch (error) {
      return {
        kind: "error",
        error: valuationApiError(
          error,
          request.authenticated.context.correlationId,
        ),
      };
    }
  }

  async invalidate(
    request: InvalidateValuationRequest,
  ): Promise<ValuationApiResult<ValuationInvalidation>> {
    const access = await this.authorize(
      request.authenticated,
      "scenario",
      request.scenarioId,
    );
    if (access.kind === "error") return access;
    try {
      const result = await this.commands.invalidate({
        context: request.authenticated.context,
        actor: request.authenticated.actor,
        scenarioId: request.scenarioId,
        resultId: request.resultId,
        invalidationId: request.invalidationId,
        expectedScenarioVersion: request.expectedVersion,
        idempotencyKey: request.idempotencyKey,
        kind: request.kind,
        reason: request.reason,
        sourceReference: request.sourceReference,
      });
      return { kind: "ok", value: result.value };
    } catch (error) {
      return {
        kind: "error",
        error: valuationApiError(
          error,
          request.authenticated.context.correlationId,
        ),
      };
    }
  }

  private async read<T>(
    authenticated: ValuationAuthenticatedContext,
    resource: ValuationResource,
    id: string,
    loader: (scope: ValuationScope) => Promise<T | undefined>,
    version: (value: T) => number,
  ): Promise<ValuationApiResult<ValuationReadView<T>>> {
    const access = await this.authorize(authenticated, resource, id);
    if (access.kind === "error") return access;
    const scope = requestScope(authenticated.context);
    if (scope === undefined) return validationScope(authenticated.context);
    const value = await loader(scope);
    if (value === undefined) return protectedNotFound(authenticated.context);
    return { kind: "ok", value: { value, etag: formatEtag(version(value)) } };
  }

  private async authorize(
    authenticated: ValuationAuthenticatedContext,
    resource: ValuationResource,
    resourceId: string,
  ): Promise<ValuationApiResult<ValuationScope>> {
    const scope = requestScope(authenticated.context);
    if (scope === undefined) return validationScope(authenticated.context);
    const allowed = await this.authorization.authorize({
      resource,
      resourceId,
      context: authenticated.context,
      scope,
    });
    return allowed
      ? { kind: "ok", value: scope }
      : protectedNotFound(authenticated.context);
  }
}

function requestScope(context: RequestContext): ValuationScope | undefined {
  if (context.workspaceId === undefined || context.dealId === undefined) {
    return undefined;
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    dealId: context.dealId,
  };
}

function validationScope(context: RequestContext): ValuationApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "VALIDATION_FAILED",
      message: "Valuation requests require tenant, workspace, and deal scope.",
      correlationId: context.correlationId,
      retryable: false,
      fieldErrors: {
        scope: [{
          field: "scope",
          code: "INVALID_TYPE",
          message: "Workspace and Deal scope are required.",
        }],
      },
    }),
  };
}

function protectedNotFound(context: RequestContext): ValuationApiResult<never> {
  return {
    kind: "error",
    error: createProtectedNotFoundError(context.correlationId),
  };
}

function forbidden(context: RequestContext): ValuationApiResult<never> {
  return {
    kind: "error",
    error: createApiError({
      code: "ACTION_FORBIDDEN",
      message: "The requested valuation action is not permitted.",
      correlationId: context.correlationId,
      retryable: false,
    }),
  };
}

function valuationApiError(
  error: unknown,
  correlationId: RequestContext["correlationId"],
): ErrorEnvelope {
  if (!(error instanceof Error)) return dependencyError(correlationId);
  const valuation = error as Error & { readonly code?: string };
  if (
    valuation.code === "PROTECTED_NOT_FOUND" ||
    valuation.code === "SCOPE_MISMATCH"
  ) return createProtectedNotFoundError(correlationId);
  if (
    valuation.code === "HUMAN_AUTHORITY_REQUIRED" ||
    valuation.code === "ACTOR_DENIED" ||
    valuation.code === "SEPARATION_OF_DUTIES"
  ) {
    return createApiError({
      code: "ACTION_FORBIDDEN",
      message: "The requested valuation action is not permitted.",
      correlationId,
      retryable: false,
    });
  }
  if (
    valuation.code === "VERSION_CONFLICT" ||
    valuation.code === "REFERENCED_VERSION_MISMATCH" ||
    valuation.code === "STALE_INPUT" || valuation.code === "STALE_RESULT"
  ) {
    return createApiError({
      code: "STALE_VERSION",
      message:
        "The valuation references are stale; refresh the exact versioned basis and retry.",
      correlationId,
      retryable: true,
    });
  }
  if (
    valuation.code === "IDEMPOTENCY_CONFLICT" ||
    valuation.code === "IDEMPOTENCY_IN_PROGRESS"
  ) {
    return createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message:
        "The valuation command conflicts with an existing idempotency record.",
      correlationId,
      retryable: valuation.code === "IDEMPOTENCY_IN_PROGRESS",
    });
  }
  if (
    valuation.code === "DEPENDENCY_UNAVAILABLE" ||
    valuation.code === "FEATURE_DISABLED"
  ) return dependencyError(correlationId);
  if (valuation.code === "JOB_FAILED") {
    return createApiError({
      code: "ASYNC_OPERATION_FAILED",
      message: "The valuation calculation could not be completed.",
      correlationId,
      retryable: false,
    });
  }
  return createApiError({
    code: "VALIDATION_FAILED",
    message: "The valuation command is invalid.",
    correlationId,
    retryable: false,
    fieldErrors: {
      command: [{
        field: "command",
        code: "INVALID_TYPE",
        message: "The valuation command is invalid.",
      }],
    },
  });
}

function dependencyError(
  correlationId: RequestContext["correlationId"],
): ErrorEnvelope {
  return createApiError({
    code: "DEPENDENCY_UNAVAILABLE",
    message: "Valuation is temporarily unavailable.",
    correlationId,
    retryable: true,
  });
}
