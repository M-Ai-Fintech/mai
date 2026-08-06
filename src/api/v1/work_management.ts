import {
  createApiError,
  createProtectedNotFoundError,
  type ErrorEnvelope,
  formatEtag,
} from "../../platform/api/v1.ts";
import { IdempotencyConflictError } from "../../platform/persistence/v1.ts";
import {
  type CommandInput,
  WorkManagementService,
} from "../../work_management/application_service.ts";
import {
  WorkManagementCommandsDisabledError,
  WorkManagementIdempotencyInProgressError,
} from "../../work_management/command_unit_of_work.ts";
import {
  type WorkAggregate,
  WorkManagementError,
} from "../../work_management/model.ts";
import type { WorkManagementReadDto } from "../../work_management/read_models.ts";
import {
  WorkManagementRecordConflictError,
  WorkManagementVersionConflictError,
} from "../../work_management/repository.ts";
import type {
  ApprovalDecisionCommand,
  CreateApprovalRequestCommand,
  CreateTaskCommand,
  CreateWorkstreamCommand,
  TransitionTaskCommand,
  TransitionWorkstreamCommand,
  WorkManagementApiResult,
  WorkManagementCommandInput,
  WorkManagementCommandReceipt,
  WorkManagementReadInput,
  WorkManagementReadResult,
  WorkManagementReadView,
} from "./work_management_contracts.ts";

export * from "./work_management_contracts.ts";

export class WorkManagementV1Application {
  constructor(private readonly service: WorkManagementService) {}

  readWorkstream(
    input: WorkManagementReadInput<
      import("../../work_management/v1.ts").WorkstreamId
    >,
  ): Promise<WorkManagementReadResult<WorkManagementReadDto>> {
    return this.read(input, () => this.service.getWorkstream(input));
  }

  readTask(
    input: WorkManagementReadInput<
      import("../../work_management/v1.ts").TaskId
    >,
  ): Promise<WorkManagementReadResult<WorkManagementReadDto>> {
    return this.read(input, () => this.service.getTask(input));
  }

  readApprovalRequest(
    input: WorkManagementReadInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ): Promise<WorkManagementReadResult<WorkManagementReadDto>> {
    return this.read(input, () => this.service.getApprovalRequest(input));
  }

  createWorkstream(input: CreateWorkstreamCommand) {
    return this.command(input, () =>
      this.service.createWorkstream({
        ...toCommandInput(input),
        name: input.name,
        ownerId: input.ownerId,
      }));
  }

  transitionWorkstream(input: TransitionWorkstreamCommand) {
    return this.command(input, () =>
      this.service.transitionWorkstream({
        ...toCommandInput(input),
        toState: input.toState,
      }));
  }

  createTask(input: CreateTaskCommand) {
    return this.command(input, () =>
      this.service.createTask({
        ...toCommandInput(input),
        workstreamId: input.workstreamId,
        parentTaskId: input.parentTaskId,
        title: input.title,
        assigneeId: input.assigneeId,
        target: input.target,
      }));
  }

  transitionTask(input: TransitionTaskCommand) {
    return this.command(input, () =>
      this.service.transitionTask({
        ...toCommandInput(input),
        toState: input.toState,
      }));
  }

  createApprovalRequest(input: CreateApprovalRequestCommand) {
    return this.command(input, () =>
      this.service.createApprovalRequest({
        ...toCommandInput(input),
        namedApproverId: input.namedApproverId,
        requestedAction: input.requestedAction,
        target: input.target,
        evidence: input.evidence,
        payload: input.payload,
        claimedDigest: input.claimedDigest,
      }));
  }

  openApprovalRequest(
    input: WorkManagementCommandInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ) {
    return this.command(
      input,
      () => this.service.openApprovalRequest(toCommandInput(input)),
    );
  }

  decideApprovalRequest(input: ApprovalDecisionCommand) {
    return this.command(input, () =>
      this.service.decideApprovalRequest({
        ...toCommandInput(input),
        outcome: input.outcome,
      }));
  }

  withdrawApprovalRequest(
    input: WorkManagementCommandInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ) {
    return this.command(
      input,
      () => this.service.withdrawApprovalRequest(toCommandInput(input)),
    );
  }

  invalidateApprovalRequest(
    input: WorkManagementCommandInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ) {
    return this.command(
      input,
      () => this.service.invalidateApprovalRequest(toCommandInput(input)),
    );
  }

  expireApprovalRequest(
    input: WorkManagementCommandInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ) {
    return this.command(
      input,
      () => this.service.expireApprovalRequest(toCommandInput(input)),
    );
  }

  private async read<Id extends string>(
    input: WorkManagementReadInput<Id>,
    loader: () => Promise<
      import("../../work_management/application_service.ts").WorkReadResult
    >,
  ): Promise<WorkManagementReadResult<WorkManagementReadDto>> {
    const scopeError = validateScope(input.context, input.scope);
    if (scopeError !== undefined) return scopeError;
    try {
      const result = await loader();
      if (result.kind === "protected_not_found") {
        return { kind: "error", error: result.response };
      }
      return {
        kind: "ok",
        value: {
          value: result.value,
          etag: formatEtag(
            result
              .version as import("../../platform/api/v1.ts").AggregateVersion,
          ),
        },
      };
    } catch (error) {
      return {
        kind: "error",
        error: mapError(error, input.context.correlationId),
      };
    }
  }

  private async command<T extends WorkAggregate>(
    input: WorkManagementCommandInput<string>,
    operation: () => Promise<T>,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<WorkManagementCommandReceipt>
    >
  > {
    const scopeError = validateScope(input.context, input.scope);
    if (scopeError !== undefined) return scopeError;
    try {
      const value = await operation();
      return {
        kind: "ok",
        value: {
          value: commandReceipt(value),
          etag: formatEtag(value.version),
        },
      };
    } catch (error) {
      return {
        kind: "error",
        error: mapError(error, input.context.correlationId),
      };
    }
  }
}

function toCommandInput<Id extends string>(
  input: WorkManagementCommandInput<Id>,
): CommandInput<Id> {
  return {
    context: input.context,
    actor: input.actor,
    scope: input.scope,
    id: input.id,
    idempotencyKey: input.idempotencyKey,
    expectedVersion: input.expectedVersion,
    reason: input.reason,
    commandPayload: input.commandPayload,
  };
}

function commandReceipt(value: WorkAggregate): WorkManagementCommandReceipt {
  return Object.freeze({
    id: value.id,
    aggregateType: value.aggregateType,
    state: value.state,
    version: value.version,
  });
}

function validateScope(
  context: import("../../platform/api/v1.ts").RequestContext,
  scope: import("../../work_management/v1.ts").WorkScope,
): WorkManagementApiResult<never> | undefined {
  if (
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId && context.tenantId === scope.tenantId
  ) return;
  return {
    kind: "error",
    error: createApiError({
      code: "VALIDATION_FAILED",
      message:
        "Work Management commands require the authenticated tenant, workspace, and deal scope.",
      correlationId: context.correlationId,
      retryable: false,
      fieldErrors: {
        scope: [{
          field: "scope",
          code: "INVALID_TYPE",
          message:
            "The requested scope must exactly match the authenticated scope.",
        }],
      },
    }),
  };
}

function mapError(
  error: unknown,
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
): ErrorEnvelope {
  if (error instanceof WorkManagementVersionConflictError) {
    return createApiError({
      code: "VERSION_CONFLICT",
      message:
        "The resource version no longer matches; retry with a fresh ETag.",
      correlationId,
      retryable: true,
      expectedVersion: error
        .expectedVersion as import("../../platform/api/v1.ts").AggregateVersion,
      currentVersion: (error.currentVersion ??
        error
          .expectedVersion) as import("../../platform/api/v1.ts").AggregateVersion,
    });
  }
  if (
    error instanceof IdempotencyConflictError ||
    error instanceof WorkManagementIdempotencyInProgressError ||
    error instanceof WorkManagementRecordConflictError
  ) {
    return createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message: "The idempotency key conflicts with an existing command.",
      correlationId,
      retryable: false,
    });
  }
  if (error instanceof WorkManagementCommandsDisabledError) {
    return createApiError({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Work Management commands are temporarily unavailable.",
      correlationId,
      retryable: true,
    });
  }
  if (error instanceof WorkManagementError) {
    return workError(error, correlationId);
  }
  return createApiError({
    code: "DEPENDENCY_UNAVAILABLE",
    message:
      "Work Management could not complete the command; expected a durable transaction boundary.",
    correlationId,
    retryable: true,
  });
}

function workError(
  error: WorkManagementError,
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
): ErrorEnvelope {
  const code = error.code === "INVALID_TRANSITION" ||
      error.code === "DECISION_ALREADY_RECORDED" ||
      error.code === "INCOMPLETE_WORK"
    ? "INVALID_TRANSITION"
    : error.code === "STALE_APPROVAL_PACKAGE"
    ? "STALE_VERSION"
    : error.code === "HUMAN_AUTHORITY_REQUIRED" ||
        error.code === "NAMED_APPROVER_REQUIRED" ||
        error.code === "SEPARATION_OF_DUTIES"
    ? "ACTION_FORBIDDEN"
    : error.code === "SCOPE_MISMATCH"
    ? "PROTECTED_NOT_FOUND"
    : "VALIDATION_FAILED";
  if (code === "PROTECTED_NOT_FOUND") {
    return createProtectedNotFoundError(correlationId);
  }
  if (code !== "VALIDATION_FAILED") {
    return createApiError({
      code,
      message: publicWorkErrorMessage(code, error),
      correlationId,
      retryable: false,
    });
  }
  return createApiError({
    code,
    message: publicWorkErrorMessage(code, error),
    correlationId,
    retryable: false,
    fieldErrors: {
      command: [{
        field: "command",
        code: "INVALID_TYPE",
        message: publicWorkErrorMessage(code, error),
      }],
    },
  });
}

function publicWorkErrorMessage(
  code: string,
  error?: WorkManagementError,
): string {
  if (error?.message.includes("cross-Deal")) {
    return "The requested cross-Deal reference is invalid.";
  }
  if (code === "ACTION_FORBIDDEN") {
    return "The requested action is not permitted.";
  }
  if (code === "INVALID_TRANSITION") {
    return "The requested state transition is invalid.";
  }
  if (code === "STALE_VERSION") {
    return "The approval package is stale; refresh the target and retry.";
  }
  return "The Work Management command is invalid.";
}

export function protectedNotFound(
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
): WorkManagementApiResult<never> {
  return { kind: "error", error: createProtectedNotFoundError(correlationId) };
}
