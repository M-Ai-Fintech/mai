import {
  createApiError,
  createProtectedNotFoundError,
  type ErrorEnvelope,
  formatEtag,
} from "../../platform/api/v1.ts";
import { WorkManagementError } from "../../work_management/model.ts";
import {
  type CommandInput,
  type CreateCommand,
  WorkManagementIdempotencyConflictError,
  type WorkManagementService,
} from "../../work_management/composition.ts";
import { WorkManagementVersionConflictError } from "../../work_management/repository.ts";
import type {
  ApprovalDecisionCommand,
  CreateApprovalRequestCommand,
  CreateTaskCommand,
  CreateWorkstreamCommand,
  TransitionTaskCommand,
  TransitionWorkstreamCommand,
  WorkManagementApiResult,
  WorkManagementCommandInput,
  WorkManagementReadInput,
  WorkManagementReadResult,
  WorkManagementReadView,
} from "./work_management_contracts.ts";

export * from "./work_management_contracts.ts";

export class WorkManagementV1Application {
  constructor(private readonly service: WorkManagementService) {}

  async readWorkstream(
    input: WorkManagementReadInput<
      import("../../work_management/v1.ts").WorkstreamId
    >,
  ): Promise<
    WorkManagementReadResult<import("../../work_management/v1.ts").Workstream>
  > {
    return await this.read(input, (value) => this.service.getWorkstream(value));
  }

  async readTask(
    input: WorkManagementReadInput<
      import("../../work_management/v1.ts").TaskId
    >,
  ): Promise<
    WorkManagementReadResult<import("../../work_management/v1.ts").Task>
  > {
    return await this.read(input, (value) => this.service.getTask(value));
  }

  async readApprovalRequest(
    input: WorkManagementReadInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ): Promise<
    WorkManagementReadResult<
      import("../../work_management/v1.ts").ApprovalRequest
    >
  > {
    return await this.read(
      input,
      (value) => this.service.getApprovalRequest(value),
    );
  }

  async createWorkstream(
    input: CreateWorkstreamCommand,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<import("../../work_management/v1.ts").Workstream>
    >
  > {
    return await this.command(input, () =>
      this.service.createWorkstream({
        ...toCreateCommand(input, "workstream.created"),
        name: input.name,
        ownerId: input.ownerId,
      }));
  }

  async transitionWorkstream(
    input: TransitionWorkstreamCommand,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<import("../../work_management/v1.ts").Workstream>
    >
  > {
    return await this.command(input, () =>
      this.service.transitionWorkstream({
        ...toCommandInput(input, "workstream.state_changed"),
        toState: input.toState,
      }));
  }

  async createTask(
    input: CreateTaskCommand,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<import("../../work_management/v1.ts").Task>
    >
  > {
    return await this.command(input, () =>
      this.service.createTask({
        ...toCreateCommand(input, "task.created"),
        workstreamId: input.workstreamId,
        parentTaskId: input.parentTaskId,
        title: input.title,
        assigneeId: input.assigneeId,
        target: input.target,
      }));
  }

  async transitionTask(
    input: TransitionTaskCommand,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<import("../../work_management/v1.ts").Task>
    >
  > {
    return await this.command(input, () =>
      this.service.transitionTask({
        ...toCommandInput(input, "task.state_changed"),
        toState: input.toState,
      }));
  }

  async createApprovalRequest(
    input: CreateApprovalRequestCommand,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<
        import("../../work_management/v1.ts").ApprovalRequest
      >
    >
  > {
    return await this.command(input, () =>
      this.service.createApprovalRequest({
        ...toCreateCommand(input, "approval.requested"),
        requesterId: input.requesterId,
        namedApproverId: input.namedApproverId,
        package: input.package,
      }));
  }

  async openApprovalRequest(
    input: WorkManagementCommandInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<
        import("../../work_management/v1.ts").ApprovalRequest
      >
    >
  > {
    return await this.command(input, () =>
      this.service.openApprovalRequest(
        toCommandInput(input, "approval.requested"),
      ));
  }

  async decideApprovalRequest(
    input: ApprovalDecisionCommand,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<
        import("../../work_management/v1.ts").ApprovalRequest
      >
    >
  > {
    return await this.command(input, () =>
      this.service.decideApprovalRequest({
        ...toCommandInput(input, "approval.decision_recorded"),
        package: input.package,
        outcome: input.outcome,
        decisionId: input.decisionId,
      }));
  }

  async withdrawApprovalRequest(
    input: WorkManagementCommandInput<
      import("../../work_management/v1.ts").ApprovalRequestId
    >,
  ): Promise<
    WorkManagementApiResult<
      WorkManagementReadView<
        import("../../work_management/v1.ts").ApprovalRequest
      >
    >
  > {
    return await this.command(input, () =>
      this.service.withdrawApprovalRequest(
        toCommandInput(input, "approval.withdrawn"),
      ));
  }

  private async read<T extends { readonly version: number }, Id extends string>(
    input: WorkManagementReadInput<Id>,
    loader: (
      value: WorkManagementReadInput<Id>,
    ) => Promise<
      | { readonly kind: "loaded"; readonly value: T }
      | {
        readonly kind: "protected_not_found";
        readonly response: ErrorEnvelope;
      }
    >,
  ): Promise<WorkManagementReadResult<T>> {
    const scopeError = validateScope(input.context, input.scope);
    if (scopeError !== undefined) return scopeError;
    try {
      const result = await loader(input);
      if (result.kind === "protected_not_found") {
        return { kind: "error", error: result.response };
      }
      return {
        kind: "ok",
        value: { value: result.value, etag: formatEtag(result.value.version) },
      };
    } catch (error) {
      return {
        kind: "error",
        error: mapError(error, input.context.correlationId),
      };
    }
  }

  private async command<T extends { readonly version: number }>(
    input: WorkManagementCommandInput<string>,
    operation: () => Promise<T>,
  ): Promise<WorkManagementApiResult<WorkManagementReadView<T>>> {
    const scopeError = validateScope(input.context, input.scope);
    if (scopeError !== undefined) return scopeError;
    try {
      const value = await operation();
      return { kind: "ok", value: { value, etag: formatEtag(value.version) } };
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
  eventType: import("../../work_management/v1.ts").WorkManagementEventType,
): CommandInput<Id> {
  return {
    context: input.context,
    actor: input.actor,
    scope: input.scope,
    id: input.id,
    idempotencyKey: input.idempotencyKey,
    eventId: input.eventId,
    eventType,
    expectedVersion: input.expectedVersion,
    currentTargetVersion: input.currentTargetVersion,
    reason: input.reason,
    commandPayload: input.commandPayload,
  };
}

function toCreateCommand<Id extends string>(
  input: WorkManagementCommandInput<Id>,
  eventType: import("../../work_management/v1.ts").WorkManagementEventType,
): CreateCommand<Id> {
  return toCommandInput(input, eventType);
}

function validateScope(
  context: import("../../platform/api/v1.ts").RequestContext,
  scope: import("../../work_management/v1.ts").WorkScope,
): WorkManagementApiResult<never> | undefined {
  if (
    context.workspaceId === scope.workspaceId &&
    context.dealId === scope.dealId &&
    context.tenantId === scope.tenantId
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
      message: error.message,
      correlationId,
      retryable: true,
      expectedVersion: error
        .expectedVersion as import("../../platform/api/v1.ts").AggregateVersion,
      currentVersion: (error.currentVersion ??
        error
          .expectedVersion) as import("../../platform/api/v1.ts").AggregateVersion,
    });
  }
  if (error instanceof WorkManagementIdempotencyConflictError) {
    return createApiError({
      code: "IDEMPOTENCY_CONFLICT",
      message: error.message,
      correlationId,
      retryable: false,
    });
  }
  if (error instanceof WorkManagementError) {
    const code = error.code === "INVALID_TRANSITION" ||
        error.code === "DECISION_ALREADY_RECORDED"
      ? "INVALID_TRANSITION"
      : error.code === "STALE_APPROVAL_PACKAGE"
      ? "STALE_VERSION"
      : error.code === "HUMAN_AUTHORITY_REQUIRED" ||
          error.code === "NAMED_APPROVER_REQUIRED" ||
          error.code === "SEPARATION_OF_DUTIES"
      ? "ACTION_FORBIDDEN"
      : "VALIDATION_FAILED";
    if (code === "VALIDATION_FAILED") {
      return createApiError({
        code,
        message: error.message,
        correlationId,
        retryable: false,
        fieldErrors: {
          command: [{
            field: "command",
            code: "INVALID_TYPE",
            message: error.message,
          }],
        },
      });
    }
    return createApiError({
      code,
      message: error.message,
      correlationId,
      retryable: false,
    });
  }
  return createApiError({
    code: "DEPENDENCY_UNAVAILABLE",
    message:
      "Work Management could not complete the command; expected a durable transaction boundary.",
    correlationId,
    retryable: true,
  });
}

export function protectedNotFound(
  correlationId: import("../../platform/api/v1.ts").CorrelationId,
): WorkManagementApiResult<never> {
  return { kind: "error", error: createProtectedNotFoundError(correlationId) };
}
