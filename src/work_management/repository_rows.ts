import type { ApprovalRequest, Task, Workstream } from "./model.ts";
import type {
  ApprovalRequestRow,
  TaskRow,
  WorkstreamRow,
} from "./repository_validation.ts";
import {
  parseStoredApprovalRequestVerified,
  parseStoredTask,
  parseStoredWorkstream,
} from "./repository_validation.ts";

export function workstreamFromRow(row: WorkstreamRow): Workstream {
  return parseStoredWorkstream(row);
}

export function taskFromRow(row: TaskRow): Task {
  return parseStoredTask(row);
}

export async function approvalRequestFromRow(
  row: ApprovalRequestRow,
): Promise<ApprovalRequest> {
  return await parseStoredApprovalRequestVerified(row);
}

export function documentFor(
  value: Workstream | Task | ApprovalRequest,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
