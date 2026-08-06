import {
  createProtectedNotFoundError,
  type ErrorEnvelope,
  type RequestContext,
} from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { WorkManagementCommandUnitOfWork } from "./command_unit_of_work.ts";
import type {
  ApprovalRequestId,
  TaskId,
  WorkScope,
  WorkstreamId,
} from "./ids.ts";
import type { WorkAggregate } from "./model.ts";
import {
  projectApprovalRequest,
  projectTask,
  projectWorkstream,
  type WorkManagementReadDto,
} from "./read_models.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import { WorkManagementAuthorization } from "./authorization_service.ts";

export type WorkReadResult =
  | {
    readonly kind: "loaded";
    readonly value: WorkManagementReadDto;
    readonly version: number;
  }
  | { readonly kind: "protected_not_found"; readonly response: ErrorEnvelope };

export interface ReadInput<Id extends string> {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: WorkScope;
  readonly id: Id;
}

export class WorkManagementReadService {
  constructor(
    private readonly unitOfWork: WorkManagementCommandUnitOfWork,
    private readonly authorization: WorkManagementAuthorization,
  ) {}

  getWorkstream(input: ReadInput<WorkstreamId>): Promise<WorkReadResult> {
    return this.read(
      input,
      "workstream",
      (tx) => tx.findWorkstream(input.scope, input.id),
      projectWorkstream,
    );
  }

  getTask(input: ReadInput<TaskId>): Promise<WorkReadResult> {
    return this.read(
      input,
      "task",
      (tx) => tx.findTask(input.scope, input.id),
      projectTask,
    );
  }

  getApprovalRequest(
    input: ReadInput<ApprovalRequestId>,
  ): Promise<WorkReadResult> {
    return this.read(
      input,
      "approval_request",
      (tx) => tx.findApprovalRequest(input.scope, input.id),
      projectApprovalRequest,
    );
  }

  private async read<T extends WorkAggregate>(
    input: ReadInput<string>,
    kind: string,
    load: (tx: WorkManagementTransaction) => Promise<T | undefined>,
    project: (
      value: T,
      decision: import("../platform/authz/v1.ts").AuthorizationDecision,
    ) => WorkManagementReadDto,
  ): Promise<WorkReadResult> {
    const initial = await this.authorization.authorize(input, "read", kind);
    if (initial.outcome === "deny") return protectedNotFound(input.context);
    return await this.unitOfWork.read(async (tx) => {
      const value = await load(tx);
      if (value === undefined) return protectedNotFound(input.context);
      const final = await this.authorization.authorize(
        input,
        "read",
        kind,
        false,
        value.state,
      );
      if (final.outcome === "deny") return protectedNotFound(input.context);
      return {
        kind: "loaded",
        value: project(value, final),
        version: value.version,
      };
    });
  }
}

function protectedNotFound(context: RequestContext): WorkReadResult {
  return {
    kind: "protected_not_found",
    response: createProtectedNotFoundError(context.correlationId),
  };
}
