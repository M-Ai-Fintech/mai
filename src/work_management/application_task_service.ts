import {
  assertExpectedVersion,
  assertParentChain,
  requireTask,
  requireVersion,
  requireWorkstreamById,
} from "./application_helpers.ts";
import {
  authorizationEvidence,
  type CommandInput,
  type CommandOutcome,
  type CreateCommand,
  type EventChange,
  outcome,
  taskPayload,
  withPayload,
} from "./command_execution.ts";
import type { AuthorizationDecision } from "../platform/authz/v1.ts";
import type { WorkManagementApplicationContext } from "./application_types.ts";
import type { TaskId, WorkstreamId } from "./ids.ts";
import type { TargetReference, Task, Workstream } from "./model.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import { createTask, transitionTask } from "./tasks.ts";
import { attachTask } from "./workstreams.ts";

export class TaskApplicationService {
  constructor(private readonly context: WorkManagementApplicationContext) {}

  async createTask(
    input: CreateCommand<TaskId> & {
      readonly workstreamId: WorkstreamId;
      readonly title: string;
      readonly assigneeId: Task["assigneeId"];
      readonly parentTaskId?: TaskId;
      readonly target?: TargetReference;
    },
  ): Promise<Task> {
    await this.authorize(input, "create", true);
    requireVersion(input.workstreamId, input.expectedVersion);
    await this.reauthorizeAttachment(input);
    return await this.context.commands.execute(
      withPayload(input, taskPayload(input)),
      "create_task",
      "task",
      (transaction) =>
        createWithinTransaction(this.context, transaction, input),
    );
  }

  async transitionTask(
    input: CommandInput<TaskId> & { readonly toState: Task["state"] },
  ): Promise<Task> {
    await this.authorize(input, "transition", true);
    await this.reauthorizeState(input);
    return await this.context.commands.execute(
      withPayload(input, { toState: input.toState }),
      "transition_task",
      "task",
      (transaction) =>
        transitionWithinTransaction(this.context, transaction, input),
    );
  }

  private authorize(
    input: CommandInput<TaskId>,
    action: string,
    humanOnly: boolean,
    state?: Task["state"],
  ): Promise<void> {
    return this.context.authorization.requireAllowed(
      input,
      action,
      "task",
      humanOnly,
      state,
    ).then(() => undefined);
  }

  private async reauthorizeAttachment(
    input: CommandInput<TaskId> & { readonly workstreamId: WorkstreamId },
  ): Promise<void> {
    await this.context.options.unitOfWork.read(async (transaction) => {
      const workstream = await requireWorkstreamById(
        transaction,
        input.scope,
        input.workstreamId,
      );
      await this.context.authorization.requireAllowed(
        { ...input, id: workstream.id },
        "attach_task",
        "workstream",
        true,
        workstream.state,
      );
    });
  }

  private async reauthorizeState(
    input: CommandInput<TaskId> & { readonly toState: Task["state"] },
  ): Promise<void> {
    await this.context.options.unitOfWork.read(async (transaction) => {
      const current = await requireTask(transaction, input);
      await this.authorize(input, "transition", true, current.state);
      void input.toState;
    });
  }
}

async function createWithinTransaction(
  context: WorkManagementApplicationContext,
  transaction: WorkManagementTransaction,
  input: CreateCommand<TaskId> & {
    readonly workstreamId: WorkstreamId;
    readonly title: string;
    readonly assigneeId: Task["assigneeId"];
    readonly parentTaskId?: TaskId;
    readonly target?: TargetReference;
  },
): Promise<CommandOutcome<Task>> {
  const workstream = await requireWorkstreamById(
    transaction,
    input.scope,
    input.workstreamId,
  );
  const attachmentAuthorization = await context.authorization.requireAllowed(
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
    now: context.options.clock.now(),
  });
  await assertParentChain(transaction, task);
  const owner = attachTask(workstream, task);
  await transaction.saveTask(task, 0);
  await transaction.saveWorkstream(owner, workstream.version);
  return {
    value: task,
    events: taskEvents(task, owner, input, attachmentAuthorization),
  };
}

function taskEvents(
  task: Task,
  owner: Workstream,
  input: CreateCommand<TaskId> & { readonly workstreamId: WorkstreamId },
  attachmentAuthorization: AuthorizationDecision,
): readonly EventChange[] {
  return [
    { aggregate: task, eventType: "task.created" },
    {
      aggregate: owner,
      eventType: "workstream.task_attached",
      authorizationEvidence: authorizationEvidence(
        { scope: input.scope, id: owner.id },
        "attach_task",
        "workstream",
        attachmentAuthorization,
      ),
    },
  ];
}

async function transitionWithinTransaction(
  context: WorkManagementApplicationContext,
  transaction: WorkManagementTransaction,
  input: CommandInput<TaskId> & { readonly toState: Task["state"] },
): Promise<CommandOutcome<Task>> {
  const current = await requireTask(transaction, input);
  await context.authorization.requireAllowed(
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
    now: context.options.clock.now(),
  });
  await transaction.saveTask(next, current.version);
  return outcome(next, "task.state_changed");
}
