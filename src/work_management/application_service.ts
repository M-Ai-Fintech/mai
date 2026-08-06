import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "./approval_package_factory.ts";
import { ApprovalApplicationService } from "./application_approval_service.ts";
import {
  createWorkManagementApplicationContext,
  type WorkManagementApplicationOptions,
} from "./application_types.ts";
import { TaskApplicationService } from "./application_task_service.ts";
import { WorkstreamApplicationService } from "./application_workstream_service.ts";
import type { CommandInput, CreateCommand } from "./command_execution.ts";
import type { ApprovalRequestId, TaskId, WorkstreamId } from "./ids.ts";
import type {
  ApprovalRequest,
  EvidenceSnapshotReference,
  TargetReference,
  Task,
  Workstream,
} from "./model.ts";
import {
  type ReadInput,
  WorkManagementReadService,
  type WorkReadResult,
} from "./read_service.ts";
import type { WorkManagementTransactionalEffects } from "./transactional_effects.ts";

export class WorkManagementService {
  private readonly reads: WorkManagementReadService;
  private readonly workstreams: WorkstreamApplicationService;
  private readonly tasks: TaskApplicationService;
  private readonly approvals: ApprovalApplicationService;

  constructor(options: WorkManagementApplicationOptions) {
    const context = createWorkManagementApplicationContext(options);
    this.reads = new WorkManagementReadService(
      options.unitOfWork,
      context.authorization,
    );
    this.workstreams = new WorkstreamApplicationService(context);
    this.tasks = new TaskApplicationService(context);
    this.approvals = new ApprovalApplicationService(context);
  }

  getWorkstream(input: ReadInput<WorkstreamId>): Promise<WorkReadResult> {
    return this.reads.getWorkstream(input);
  }

  getTask(input: ReadInput<TaskId>): Promise<WorkReadResult> {
    return this.reads.getTask(input);
  }

  getApprovalRequest(
    input: ReadInput<ApprovalRequestId>,
  ): Promise<WorkReadResult> {
    return this.reads.getApprovalRequest(input);
  }

  createWorkstream(
    input: CreateCommand<WorkstreamId> & {
      readonly name: string;
      readonly ownerId: Workstream["ownerId"];
    },
  ): Promise<Workstream> {
    return this.workstreams.createWorkstream(input);
  }

  transitionWorkstream(
    input: CommandInput<WorkstreamId> & {
      readonly toState: Workstream["state"];
    },
  ): Promise<Workstream> {
    return this.workstreams.transitionWorkstream(input);
  }

  createTask(
    input: CreateCommand<TaskId> & {
      readonly workstreamId: WorkstreamId;
      readonly title: string;
      readonly assigneeId: Task["assigneeId"];
      readonly parentTaskId?: TaskId;
      readonly target?: TargetReference;
    },
  ): Promise<Task> {
    return this.tasks.createTask(input);
  }

  transitionTask(
    input: CommandInput<TaskId> & { readonly toState: Task["state"] },
  ): Promise<Task> {
    return this.tasks.transitionTask(input);
  }

  createApprovalRequest(
    input: CreateCommand<ApprovalRequestId> & {
      readonly namedApproverId: ApprovalRequest["namedApproverId"];
      readonly requestedAction: string;
      readonly target: TargetReference;
      readonly evidence: readonly EvidenceSnapshotReference[];
      readonly payload: Readonly<Record<string, unknown>>;
      readonly claimedDigest?: string;
    },
  ): Promise<ApprovalRequest> {
    return this.approvals.createApprovalRequest(input);
  }

  openApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.approvals.openApprovalRequest(input);
  }

  decideApprovalRequest(
    input: CommandInput<ApprovalRequestId> & {
      readonly outcome: "approved" | "rejected";
    },
  ): Promise<ApprovalRequest> {
    return this.approvals.decideApprovalRequest(input);
  }

  withdrawApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.approvals.withdrawApprovalRequest(input);
  }

  invalidateApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.approvals.invalidateApprovalRequest(input);
  }

  expireApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.approvals.expireApprovalRequest(input);
  }
}

export type { WorkManagementApplicationOptions } from "./application_types.ts";
export type {
  CommandInput,
  CreateCommand,
  WorkManagementClock,
} from "./command_execution.ts";
export type { ReadInput, WorkReadResult } from "./read_service.ts";
export type {
  WorkManagementAuthorizationInput,
  WorkManagementAuthorizationPort,
} from "./authorization_service.ts";
export type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
  WorkManagementTransactionalEffects,
};
