import type {
  ApprovalAuthoritySnapshotPort,
  ApprovalEvidencePort,
  ApprovalTargetPort,
} from "./approval_package_factory.ts";
import {
  buildServerApprovalPackageWithAuthority,
} from "./approval_package_factory.ts";
import { evaluateApprovalAuthority } from "./authority_evaluation.ts";
import {
  createApprovalRequest,
  decideApprovalRequest,
  expireApprovalRequest,
  invalidateApprovalRequest,
  openApprovalRequest,
  withdrawApprovalRequest,
} from "./approval_requests.ts";
import {
  assertExpectedVersion,
  assertParentChain,
  requireApproval,
  requireTask,
  requireVersion,
  requireWorkstream,
  requireWorkstreamById,
} from "./application_helpers.ts";
import {
  WorkManagementAuthorization,
  type WorkManagementAuthorizationPort,
} from "./authorization_service.ts";
import {
  type CommandInput,
  type CreateCommand,
  outcome,
  semanticId,
  taskPayload,
  withPayload,
  type WorkManagementClock,
  WorkManagementCommandExecutor,
} from "./command_execution.ts";
import type { WorkManagementCommandUnitOfWork } from "./command_unit_of_work.ts";
import { approvalDecisionId } from "./ids.ts";
import type {
  ApprovalRequestId,
  TargetCommandType,
  TaskId,
  WorkstreamId,
} from "./ids.ts";
import {
  type ApprovalRequest,
  assertAuthorityEffective,
  type EvidenceSnapshotReference,
  type TargetReference,
  type Task,
  WorkManagementError,
  type Workstream,
} from "./model.ts";
import {
  type ReadInput,
  WorkManagementReadService,
  type WorkReadResult,
} from "./read_service.ts";
import { createTask, transitionTask } from "./tasks.ts";
import type { WorkManagementTransactionalEffects } from "./transactional_effects.ts";
import {
  attachTask,
  createWorkstream,
  transitionWorkstream,
} from "./workstreams.ts";

export interface WorkManagementApplicationOptions {
  readonly unitOfWork: WorkManagementCommandUnitOfWork;
  readonly authorization: WorkManagementAuthorizationPort;
  readonly effects: WorkManagementTransactionalEffects;
  readonly targets: ApprovalTargetPort;
  readonly evidence: ApprovalEvidencePort;
  readonly authority: ApprovalAuthoritySnapshotPort;
  readonly requireAuthorityEvaluation?: boolean;
  readonly clock: WorkManagementClock;
}

export class WorkManagementService {
  private readonly authorization: WorkManagementAuthorization;
  private readonly reads: WorkManagementReadService;
  private readonly commands: WorkManagementCommandExecutor;

  constructor(private readonly options: WorkManagementApplicationOptions) {
    this.authorization = new WorkManagementAuthorization(options.authorization);
    this.reads = new WorkManagementReadService(
      options.unitOfWork,
      this.authorization,
    );
    this.commands = new WorkManagementCommandExecutor(
      options.unitOfWork,
      options.effects,
      options.clock,
      options.requireAuthorityEvaluation === true,
    );
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

  async createWorkstream(
    input: CreateCommand<WorkstreamId> & {
      readonly name: string;
      readonly ownerId: Workstream["ownerId"];
    },
  ): Promise<Workstream> {
    await this.authorization.requireAllowed(
      input,
      "create",
      "workstream",
      true,
    );
    return await this.commands.execute(
      withPayload(input, { name: input.name, ownerId: input.ownerId }),
      "create_workstream",
      "workstream",
      async (transaction) => {
        const value = createWorkstream({
          ...input.scope,
          id: input.id,
          name: input.name,
          ownerId: input.ownerId,
          now: this.options.clock.now(),
        });
        await transaction.saveWorkstream(value, 0);
        return outcome(value, "workstream.created");
      },
    );
  }

  async transitionWorkstream(
    input: CommandInput<WorkstreamId> & {
      readonly toState: Workstream["state"];
    },
  ): Promise<Workstream> {
    await this.authorization.requireAllowed(
      input,
      "transition",
      "workstream",
      true,
    );
    await this.reauthorizeWorkstreamState(input, input.toState);
    return await this.commands.execute(
      withPayload(input, { toState: input.toState }),
      "transition_workstream",
      "workstream",
      async (transaction) => {
        const current = await requireWorkstream(transaction, input);
        await this.authorization.requireAllowed(
          input,
          "transition",
          "workstream",
          true,
          current.state,
        );
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const tasks = input.toState === "completed"
          ? await transaction.listTasksByWorkstream(input.scope, current.id)
          : [];
        const next = transitionWorkstream(current, {
          toState: input.toState,
          actor: input.actor,
          now: this.options.clock.now(),
          tasks,
        });
        await transaction.saveWorkstream(next, current.version);
        return outcome(next, "workstream.state_changed");
      },
    );
  }

  async createTask(
    input: CreateCommand<TaskId> & {
      readonly workstreamId: WorkstreamId;
      readonly title: string;
      readonly assigneeId: Task["assigneeId"];
      readonly parentTaskId?: TaskId;
      readonly target?: TargetReference;
    },
  ): Promise<Task> {
    await this.authorization.requireAllowed(input, "create", "task", true);
    requireVersion(input.workstreamId, input.expectedVersion);
    await this.reauthorizeTaskAttachment(input);
    return await this.commands.execute(
      withPayload(input, taskPayload(input)),
      "create_task",
      "task",
      async (transaction) => {
        const workstream = await requireWorkstreamById(
          transaction,
          input.scope,
          input.workstreamId,
        );
        await this.authorization.requireAllowed(
          { ...input, id: workstream.id },
          "attach_task",
          "workstream",
          true,
          workstream.state,
        );
        assertExpectedVersion(
          workstream.id,
          workstream.version,
          input.expectedVersion,
        );
        const task = createTask({
          ...input.scope,
          id: input.id,
          workstreamId: input.workstreamId,
          parentTaskId: input.parentTaskId,
          title: input.title,
          assigneeId: input.assigneeId,
          target: input.target,
          now: this.options.clock.now(),
        });
        await assertParentChain(transaction, task);
        const owner = attachTask(workstream, task);
        await transaction.saveTask(task, 0);
        await transaction.saveWorkstream(owner, workstream.version);
        return {
          value: task,
          events: [
            { aggregate: task, eventType: "task.created" },
            { aggregate: owner, eventType: "workstream.task_attached" },
          ],
        };
      },
    );
  }

  async transitionTask(
    input: CommandInput<TaskId> & { readonly toState: Task["state"] },
  ): Promise<Task> {
    await this.authorization.requireAllowed(input, "transition", "task", true);
    await this.reauthorizeTaskState(input, input.toState);
    return await this.commands.execute(
      withPayload(input, { toState: input.toState }),
      "transition_task",
      "task",
      async (transaction) => {
        const current = await requireTask(transaction, input);
        await this.authorization.requireAllowed(
          input,
          "transition",
          "task",
          true,
          current.state,
        );
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const next = transitionTask(current, {
          toState: input.toState,
          actor: input.actor,
          now: this.options.clock.now(),
        });
        await transaction.saveTask(next, current.version);
        return outcome(next, "task.state_changed");
      },
    );
  }

  async createApprovalRequest(
    input: CreateCommand<ApprovalRequestId> & {
      readonly namedApproverId: ApprovalRequest["namedApproverId"];
      readonly requestedAction: TargetCommandType;
      readonly target: TargetReference;
      readonly evidence: readonly EvidenceSnapshotReference[];
      readonly payload: Readonly<Record<string, unknown>>;
      readonly claimedDigest?: string;
    },
  ): Promise<ApprovalRequest> {
    const authorization = await this.authorization.requireAllowed(
      input,
      "create",
      "approval_request",
      true,
    );
    return await this.commands.execute(
      withPayload(input, {
        namedApproverId: input.namedApproverId,
        requestedAction: input.requestedAction,
        target: input.target,
        evidence: input.evidence,
        payload: input.payload,
        claimedDigest: input.claimedDigest,
      }),
      "create_approval_request",
      "approval_request",
      async (transaction) => {
        const packageResult = await buildServerApprovalPackageWithAuthority({
          requestId: input.id,
          scope: input.scope,
          requester: input.actor,
          now: this.options.clock.now(),
          namedApproverId: input.namedApproverId,
          requestedAction: input.requestedAction,
          target: input.target,
          evidence: input.evidence,
          payload: input.payload,
          claimedDigest: input.claimedDigest,
          authorization,
        }, this.options);
        if (
          this.options.requireAuthorityEvaluation === true &&
          packageResult.facts === undefined
        ) {
          throw new WorkManagementError(
            "HUMAN_AUTHORITY_REQUIRED",
            `Approval Request "${input.id}" authority facts are unavailable; expected a trusted server authority evaluation before persistence.`,
          );
        }
        const packageValue = packageResult.packageValue;
        if (packageResult.facts !== undefined) {
          const evaluation = await evaluateApprovalAuthority({
            package: packageValue,
            expectedPackage: packageValue,
            facts: packageResult.facts,
            evaluatedAt: this.options.clock.now(),
          });
          if (evaluation.outcome !== "allowed") {
            throw new WorkManagementError(
              "HUMAN_AUTHORITY_REQUIRED",
              `Approval Request "${input.id}" authority evaluation denied; reasons: ${
                evaluation.reasons.join(", ")
              }.`,
            );
          }
          await transaction.appendAuthorityEvaluation(evaluation);
        }
        const value = createApprovalRequest({
          ...input.scope,
          id: input.id,
          requesterId: input.actor.id,
          namedApproverId: input.namedApproverId,
          package: packageValue,
          now: this.options.clock.now(),
        });
        await transaction.saveApprovalRequest(value, 0);
        return outcome(value, "approval.draft_created");
      },
    );
  }

  openApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.transitionApproval(
      input,
      "open",
      "approval.requested",
      (current) =>
        openApprovalRequest(current, {
          actor: input.actor,
          now: this.options.clock.now(),
        }),
    );
  }

  async decideApprovalRequest(
    input: CommandInput<ApprovalRequestId> & {
      readonly outcome: "approved" | "rejected";
    },
  ): Promise<ApprovalRequest> {
    const actionName = input.outcome === "approved" ? "approve" : "reject";
    await this.authorization.requireAllowed(
      input,
      actionName,
      "approval_request",
      true,
    );
    await this.reauthorizeApprovalState(input, actionName);
    const commandType = `${actionName}_approval_request`;
    return await this.commands.execute(
      withPayload(input, { outcome: input.outcome, reason: input.reason }),
      commandType,
      "approval_request",
      async (transaction, digest) => {
        const current = await requireApproval(transaction, input);
        await this.authorization.requireAllowed(
          input,
          actionName,
          "approval_request",
          true,
          current.state,
        );
        assertAuthorityEffective(
          current.package.authority,
          this.options.clock.now(),
          current.package.id,
        );
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const targetVersion = await this.options.targets.currentVersion(
          current.package.target,
        );
        const decisionId = approvalDecisionId(
          await semanticId(
            "decision",
            input,
            commandType,
            "approval_request",
            digest,
            `decision:${input.outcome}`,
          ),
        );
        const next = decideApprovalRequest(current, {
          actor: input.actor,
          expectedPackage: current.package,
          outcome: input.outcome,
          decisionId,
          currentTargetVersion: targetVersion,
          reason: input.reason,
          now: this.options.clock.now(),
        });
        await transaction.saveApprovalRequest(next, current.version);
        await transaction.appendApprovalDecision(next, next.decision!);
        return {
          ...outcome(
            next,
            input.outcome === "approved"
              ? "approval.approved"
              : "approval.rejected",
          ),
          ...(input.outcome === "approved" ? { dispatchRequest: next } : {}),
        };
      },
    );
  }

  withdrawApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.transitionApproval(
      input,
      "withdraw",
      "approval.withdrawn",
      (current) =>
        withdrawApprovalRequest(current, {
          actor: input.actor,
          now: this.options.clock.now(),
        }),
    );
  }

  invalidateApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    if (input.reason === undefined) {
      throw new WorkManagementError(
        "INVALID_INPUT",
        `Approval Request "${input.id}" invalidation reason is missing; expected governed dependency evidence.`,
      );
    }
    return this.transitionApproval(
      input,
      "invalidate",
      "approval.invalidated",
      (current) =>
        invalidateApprovalRequest(current, {
          reason: input.reason!,
          now: this.options.clock.now(),
        }),
      false,
    );
  }

  expireApprovalRequest(
    input: CommandInput<ApprovalRequestId>,
  ): Promise<ApprovalRequest> {
    return this.transitionApproval(
      input,
      "expire",
      "approval.expired",
      (current) =>
        expireApprovalRequest(current, { now: this.options.clock.now() }),
      false,
    );
  }

  private async transitionApproval(
    input: CommandInput<ApprovalRequestId>,
    actionName: string,
    eventType: import("./events.ts").WorkManagementEventType,
    transition: (current: ApprovalRequest) => ApprovalRequest,
    humanOnly = true,
  ): Promise<ApprovalRequest> {
    await this.authorization.requireAllowed(
      input,
      actionName,
      "approval_request",
      humanOnly,
    );
    await this.reauthorizeApprovalState(input, actionName, humanOnly);
    return await this.commands.execute(
      withPayload(input, { reason: input.reason }),
      `${actionName}_approval_request`,
      "approval_request",
      async (transaction) => {
        const current = await requireApproval(transaction, input);
        await this.authorization.requireAllowed(
          input,
          actionName,
          "approval_request",
          humanOnly,
          current.state,
        );
        assertExpectedVersion(input.id, current.version, input.expectedVersion);
        const next = transition(current);
        await transaction.saveApprovalRequest(next, current.version);
        return outcome(next, eventType);
      },
    );
  }

  /** Re-checks current state before a durable replay may disclose its result. */
  private async reauthorizeWorkstreamState(
    input: CommandInput<WorkstreamId>,
    toState: Workstream["state"],
  ): Promise<void> {
    await this.options.unitOfWork.read(async (transaction) => {
      const current = await requireWorkstream(transaction, input);
      await this.authorization.requireAllowed(
        input,
        "transition",
        "workstream",
        true,
        current.state,
      );
      void toState;
    });
  }

  private async reauthorizeTaskAttachment(
    input: CommandInput<TaskId> & { readonly workstreamId: WorkstreamId },
  ): Promise<void> {
    await this.options.unitOfWork.read(async (transaction) => {
      const workstream = await requireWorkstreamById(
        transaction,
        input.scope,
        input.workstreamId,
      );
      await this.authorization.requireAllowed(
        { ...input, id: workstream.id },
        "attach_task",
        "workstream",
        true,
        workstream.state,
      );
    });
  }

  private async reauthorizeTaskState(
    input: CommandInput<TaskId>,
    toState: Task["state"],
  ): Promise<void> {
    await this.options.unitOfWork.read(async (transaction) => {
      const current = await requireTask(transaction, input);
      await this.authorization.requireAllowed(
        input,
        "transition",
        "task",
        true,
        current.state,
      );
      void toState;
    });
  }

  private async reauthorizeApprovalState(
    input: CommandInput<ApprovalRequestId>,
    actionName: string,
    humanOnly = true,
  ): Promise<void> {
    await this.options.unitOfWork.read(async (transaction) => {
      const current = await requireApproval(transaction, input);
      await this.authorization.requireAllowed(
        input,
        actionName,
        "approval_request",
        humanOnly,
        current.state,
      );
    });
  }
}

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
