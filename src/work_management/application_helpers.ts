import type {
  ApprovalRequestId,
  TaskId,
  WorkScope,
  WorkstreamId,
} from "./ids.ts";
import {
  type ApprovalRequest,
  type Task,
  WorkManagementError,
  type Workstream,
} from "./model.ts";
import type { ReadInput } from "./read_service.ts";
import type { WorkManagementTransaction } from "./repository.ts";
import { WorkManagementVersionConflictError } from "./repository.ts";
import { assertTaskParent } from "./tasks.ts";

export function assertExpectedVersion(
  id: string,
  current: number,
  expected?: number,
): void {
  if (expected !== undefined && current === expected) return;
  throw new WorkManagementVersionConflictError(id, expected ?? 0, current);
}

export function requireVersion(
  id: string,
  expected?: number,
): asserts expected is number {
  if (expected !== undefined && expected > 0) return;
  throw new WorkManagementError(
    "INVALID_INPUT",
    `Workstream "${id}" If-Match version is missing; expected a strong owner aggregate version.`,
  );
}

export async function requireWorkstream(
  transaction: WorkManagementTransaction,
  input: ReadInput<WorkstreamId>,
): Promise<Workstream> {
  return await requireWorkstreamById(transaction, input.scope, input.id);
}

export async function requireWorkstreamById(
  transaction: WorkManagementTransaction,
  scope: WorkScope,
  id: WorkstreamId,
): Promise<Workstream> {
  const value = await transaction.findWorkstream(scope, id);
  if (value !== undefined) return value;
  throw new WorkManagementError(
    "SCOPE_MISMATCH",
    `Workstream "${id}" was not found in the requested scope; expected a protected resource.`,
  );
}

export async function requireTask(
  transaction: WorkManagementTransaction,
  input: ReadInput<TaskId>,
): Promise<Task> {
  const value = await transaction.findTask(input.scope, input.id);
  if (value !== undefined) return value;
  throw new WorkManagementError(
    "SCOPE_MISMATCH",
    `Task "${input.id}" was not found in the requested scope; expected a protected resource.`,
  );
}

export async function requireApproval(
  transaction: WorkManagementTransaction,
  input: ReadInput<ApprovalRequestId>,
): Promise<ApprovalRequest> {
  const value = await transaction.findApprovalRequest(input.scope, input.id);
  if (value !== undefined) return value;
  throw new WorkManagementError(
    "SCOPE_MISMATCH",
    `Approval Request "${input.id}" was not found in the requested scope; expected a protected resource.`,
  );
}

export async function assertParentChain(
  transaction: WorkManagementTransaction,
  task: Task,
): Promise<void> {
  const visited = new Set<string>([task.id]);
  let parentId = task.parentTaskId;
  while (parentId !== undefined) {
    if (visited.has(parentId)) parentCycle(task.id, parentId);
    visited.add(parentId);
    const parent = await transaction.findTask(scopeOf(task), parentId);
    if (parent === undefined) missingParent(task.id, parentId);
    if (parentId === task.parentTaskId) assertTaskParent(task, parent);
    if (parent.workstreamId !== task.workstreamId) {
      wrongWorkstream(task, parent);
    }
    parentId = parent.parentTaskId;
  }
}

function scopeOf(task: Task): WorkScope {
  return {
    tenantId: task.tenantId,
    workspaceId: task.workspaceId,
    dealId: task.dealId,
  };
}

function parentCycle(taskId: TaskId, parentId: TaskId): never {
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Task "${taskId}" parent chain contains cycle at "${parentId}"; expected an acyclic Workstream task tree.`,
  );
}

function missingParent(taskId: TaskId, parentId: TaskId): never {
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Task "${taskId}" parent "${parentId}" is missing in the requested scope; expected an existing ancestor.`,
  );
}

function wrongWorkstream(task: Task, parent: Task): never {
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Task "${task.id}" ancestor "${parent.id}" belongs to Workstream "${parent.workstreamId}"; expected "${task.workstreamId}".`,
  );
}
