import type { ActorReference } from "../../platform/authz/v1.ts";
import type { AggregateVersion } from "../../platform/api/v1.ts";
import type { IdempotencyKey, RequestContext } from "../../platform/api/v1.ts";
import type {
  ApprovalRequest,
  EvidenceSnapshotReference,
  TargetReference,
  Task,
  TaskState,
  Workstream,
  WorkstreamState,
} from "../../work_management/v1.ts";
import type {
  ApprovalRequestId,
  TaskId,
  WorkScope,
  WorkstreamId,
} from "../../work_management/v1.ts";

export type WorkManagementResource =
  | "workstream"
  | "task"
  | "approval_request";

export type WorkManagementCommand =
  | "create_workstream"
  | "transition_workstream"
  | "create_task"
  | "transition_task"
  | "create_approval_request"
  | "open_approval_request"
  | "approve_approval_request"
  | "reject_approval_request"
  | "withdraw_approval_request"
  | "invalidate_approval_request"
  | "expire_approval_request";

export interface WorkManagementAuthenticatedContext {
  readonly context: RequestContext;
  readonly actor: ActorReference;
}

export interface WorkManagementContextPort {
  contextFor(
    request: Request,
  ):
    | Promise<WorkManagementAuthenticatedContext>
    | WorkManagementAuthenticatedContext;
}

export interface WorkManagementReadInput<Id extends string> {
  readonly context: RequestContext;
  readonly actor: ActorReference;
  readonly scope: WorkScope;
  readonly id: Id;
}

export interface WorkManagementCommandMetadata {
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: AggregateVersion;
  readonly reason?: string;
}

export interface WorkManagementCommandInput<Id extends string>
  extends WorkManagementReadInput<Id>, WorkManagementCommandMetadata {
  readonly commandPayload?: Readonly<Record<string, unknown>>;
}

export interface CreateWorkstreamCommand
  extends WorkManagementCommandInput<WorkstreamId> {
  readonly name: string;
  readonly ownerId: Workstream["ownerId"];
}

export interface TransitionWorkstreamCommand
  extends WorkManagementCommandInput<WorkstreamId> {
  readonly toState: WorkstreamState;
}

export interface CreateTaskCommand extends WorkManagementCommandInput<TaskId> {
  readonly workstreamId: Workstream["id"];
  readonly parentTaskId?: Task["parentTaskId"];
  readonly title: string;
  readonly assigneeId: Task["assigneeId"];
  readonly target?: Task["target"];
}

export interface TransitionTaskCommand
  extends WorkManagementCommandInput<TaskId> {
  readonly toState: TaskState;
}

export interface CreateApprovalRequestCommand
  extends WorkManagementCommandInput<ApprovalRequestId> {
  readonly namedApproverId: ApprovalRequest["namedApproverId"];
  readonly target: TargetReference;
  readonly evidence: readonly EvidenceSnapshotReference[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly claimedDigest?: string;
}

export interface ApprovalDecisionCommand
  extends WorkManagementCommandInput<ApprovalRequestId> {
  readonly outcome: "approved" | "rejected";
  readonly reason?: string;
}

export interface WorkManagementCommandReceipt {
  readonly id: string;
  readonly aggregateType: WorkManagementResource;
  readonly state: string;
  readonly version: AggregateVersion;
}

export interface WorkManagementReadView<T> {
  readonly value: T;
  readonly etag: string;
}

export type WorkManagementApiResult<T> =
  | { readonly kind: "ok"; readonly value: T; readonly replayed?: boolean }
  | {
    readonly kind: "error";
    readonly error: import("../../platform/api/v1.ts").ErrorEnvelope;
  };

export type WorkManagementReadResult<T> = WorkManagementApiResult<
  WorkManagementReadView<T>
>;

export class WorkManagementValidationError extends Error {
  readonly code = "VALIDATION_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "WorkManagementValidationError";
  }
}
