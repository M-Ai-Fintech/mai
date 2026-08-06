import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { ActorId, TaskId, WorkScope, WorkstreamId } from "./ids.ts";
import {
  assertHumanActor,
  assertScope,
  assertTargetReference,
  assertText,
  nextVersion,
  type TargetReference,
  type Task,
  WorkManagementError,
} from "./model.ts";
import { taskRule } from "./transition_tables.ts";

export interface CreateTaskInput extends WorkScope {
  readonly id: TaskId;
  readonly workstreamId: WorkstreamId;
  readonly parentTaskId?: TaskId;
  readonly title: string;
  readonly assigneeId: ActorId;
  readonly target?: TargetReference;
  readonly now: string;
}

export function createTask(input: CreateTaskInput): Task {
  assertText(input.title, "Task title");
  assertText(input.assigneeId, "Task assignee ID", 128);
  assertText(input.now, "Task creation time", 64);
  if (input.parentTaskId === input.id) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Task "${input.id}" cannot reference itself as a parent; expected a distinct parent Task ID.`,
    );
  }
  if (input.target !== undefined) {
    assertTargetReference(input.target);
    assertScope(input, input.target.scope, `Task "${input.id}" target`);
  }
  return Object.freeze({
    aggregateType: "task",
    id: input.id,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    dealId: input.dealId,
    workstreamId: input.workstreamId,
    ...(input.parentTaskId === undefined
      ? {}
      : { parentTaskId: input.parentTaskId }),
    title: input.title,
    assigneeId: input.assigneeId,
    ...(input.target === undefined ? {} : {
      target: Object.freeze({
        ...input.target,
        scope: Object.freeze({ ...input.target.scope }),
      }),
    }),
    state: "open",
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function assertTaskParent(
  task: Task,
  parent: Task,
): void {
  assertScope(taskScope(task), taskScope(parent), `Task "${task.id}" parent`);
  if (task.parentTaskId !== parent.id) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Task "${task.id}" parent "${task.parentTaskId}" does not match Task "${parent.id}"; expected the declared parent ID.`,
    );
  }
  if (task.id === parent.id) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Task "${task.id}" cannot reference itself as a parent; expected a distinct Task ID.`,
    );
  }
  if (task.workstreamId !== parent.workstreamId) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Task "${task.id}" parent Workstream "${task.workstreamId}" differs from parent Workstream "${parent.workstreamId}"; expected one workstream.`,
    );
  }
}

export function transitionTask(
  task: Task,
  input: {
    readonly toState: Task["state"];
    readonly actor: ActorReference;
    readonly now: string;
  },
): Task {
  if (taskRule(task.state, input.toState) === undefined) {
    throw new WorkManagementError(
      "INVALID_TRANSITION",
      `Task transition "${task.state}" to "${input.toState}" is invalid; expected an explicit state-machine edge.`,
    );
  }
  assertText(input.now, "Task transition time", 64);
  assertHumanActor(input.actor, `transition Task "${task.id}"`);
  return Object.freeze({
    ...task,
    state: input.toState,
    version: nextVersion(task.version),
    updatedAt: input.now,
  });
}

function taskScope(
  value: Pick<Task, "tenantId" | "workspaceId" | "dealId">,
): WorkScope {
  return {
    tenantId: value.tenantId,
    workspaceId: value.workspaceId,
    dealId: value.dealId,
  };
}
