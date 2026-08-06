import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { ActorId, WorkScope, WorkstreamId } from "./ids.ts";
import {
  assertHumanActor,
  assertScope,
  assertText,
  nextVersion,
  type Task,
  WorkManagementError,
  type Workstream,
} from "./model.ts";
import { workstreamRule } from "./transition_tables.ts";

export interface CreateWorkstreamInput extends WorkScope {
  readonly id: WorkstreamId;
  readonly name: string;
  readonly ownerId: ActorId;
  readonly now: string;
}

export function createWorkstream(input: CreateWorkstreamInput): Workstream {
  assertText(input.name, "Workstream name");
  assertText(input.ownerId, "Workstream owner ID", 128);
  assertText(input.now, "Workstream creation time", 64);
  return Object.freeze({
    aggregateType: "workstream",
    id: input.id,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    dealId: input.dealId,
    name: input.name,
    ownerId: input.ownerId,
    state: "planned",
    taskIds: Object.freeze([]),
    version: 1 as AggregateVersion,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function attachTask(
  workstream: Workstream,
  task: Pick<
    Task,
    "id" | "tenantId" | "workspaceId" | "dealId" | "workstreamId"
  >,
): Workstream {
  assertScope(workstreamScope(workstream), taskScope(task), "Task attachment");
  if (task.workstreamId !== workstream.id) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Task "${task.id}" workstream "${task.workstreamId}" does not match Workstream "${workstream.id}"; expected the owning workstream ID.`,
    );
  }
  if (workstream.taskIds.includes(task.id)) return workstream;
  return changed(workstream, { taskIds: [...workstream.taskIds, task.id] });
}

export function transitionWorkstream(
  workstream: Workstream,
  input: {
    readonly toState: Workstream["state"];
    readonly actor: ActorReference;
    readonly now: string;
    readonly tasks?: readonly Task[];
  },
): Workstream {
  const rule = workstreamRule(workstream.state, input.toState);
  if (rule === undefined) invalidTransition(workstream.state, input.toState);
  assertText(input.now, "Workstream transition time", 64);
  assertHumanActor(input.actor, `transition Workstream "${workstream.id}"`);
  if (input.toState === "completed") {
    assertTasksComplete(workstream, input.tasks ?? []);
  }
  return changed(workstream, { state: input.toState, updatedAt: input.now });
}

function assertTasksComplete(
  workstream: Workstream,
  tasks: readonly Task[],
): void {
  const ownedTasks = new Map(tasks.map((task) => [task.id, task]));
  for (const taskId of workstream.taskIds) {
    const task = ownedTasks.get(taskId);
    if (task === undefined) {
      throw new WorkManagementError(
        "INCOMPLETE_WORK",
        `Workstream "${workstream.id}" cannot complete because Task "${taskId}" is missing; expected every owned task snapshot.`,
      );
    }
    if (task.state !== "completed" && task.state !== "cancelled") {
      throw new WorkManagementError(
        "INCOMPLETE_WORK",
        `Workstream "${workstream.id}" cannot complete while Task "${task.id}" is "${task.state}"; expected every owned task to be completed or cancelled.`,
      );
    }
  }
  for (const task of tasks) assertTaskBackReference(workstream, task);
  if (ownedTasks.size !== workstream.taskIds.length) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Workstream "${workstream.id}" authoritative membership has "${workstream.taskIds.length}" Task IDs but "${ownedTasks.size}" Task back-references were found; expected exact membership equivalence.`,
    );
  }
}

function assertTaskBackReference(
  workstream: Workstream,
  task: Task,
): void {
  assertScope(workstreamScope(workstream), taskScope(task), "Task membership");
  if (task.workstreamId === workstream.id) return;
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Task "${task.id}" back-reference "${task.workstreamId}" conflicts with Workstream "${workstream.id}"; expected the authoritative owner ID.`,
  );
}

function changed(
  workstream: Workstream,
  changes: Partial<Pick<Workstream, "state" | "taskIds" | "updatedAt">>,
): Workstream {
  return Object.freeze({
    ...workstream,
    ...changes,
    taskIds: Object.freeze(changes.taskIds ?? workstream.taskIds),
    version: nextVersion(workstream.version),
  });
}

function invalidTransition(
  from: Workstream["state"],
  to: Workstream["state"],
): never {
  throw new WorkManagementError(
    "INVALID_TRANSITION",
    `Workstream transition "${from}" to "${to}" is invalid; expected an explicit state-machine edge.`,
  );
}

function workstreamScope(value: Workstream): WorkScope {
  return {
    tenantId: value.tenantId,
    workspaceId: value.workspaceId,
    dealId: value.dealId,
  };
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
