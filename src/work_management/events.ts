import type { ActorReference } from "../platform/authz/v1.ts";
import type {
  AggregateVersion,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";
import type { OutboxEvent } from "../platform/events/v1.ts";
import type {
  ActorId,
  ApprovalRequestId,
  TaskId,
  WorkEventId,
  WorkstreamId,
} from "./ids.ts";
import type {
  ApprovalDecisionOutcome,
  ApprovalRequest,
  Task,
  Workstream,
} from "./model.ts";
import { assertText, WorkManagementError } from "./model.ts";

export type WorkManagementEventType =
  | "workstream.created"
  | "workstream.task_attached"
  | "workstream.state_changed"
  | "task.created"
  | "task.state_changed"
  | "approval.draft_created"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "approval.withdrawn"
  | "approval.invalidated"
  | "approval.expired";

export interface WorkManagementEvent extends OutboxEvent {
  readonly eventId: WorkEventId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
  readonly actorId: ActorId;
  readonly actorKind: ActorReference["kind"];
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: WorkManagementEventType;
  readonly schemaVersion: 1;
  readonly payload: Readonly<Record<string, unknown>>;
}

export function createWorkManagementEvent(input: {
  readonly eventId: WorkEventId;
  readonly aggregateType: "workstream" | "task" | "approval_request";
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
  readonly eventType: WorkManagementEventType;
  readonly actor: ActorReference;
  readonly correlationId: CorrelationId;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}): WorkManagementEvent {
  assertText(input.eventId, "Work event ID", 128);
  assertText(input.aggregateId, "Work aggregate ID", 128);
  assertText(input.eventType, "Work event type", 128);
  if (input.occurredAt.getTime() !== input.occurredAt.getTime()) {
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Work event "${input.eventId}" time is invalid; expected a valid Date.`,
    );
  }
  const occurredAt = new Date(input.occurredAt);
  const availableAt = new Date(input.occurredAt);
  return Object.freeze({
    eventId: input.eventId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    dealId: input.dealId,
    actorId: input.actor.id,
    actorKind: input.actor.kind,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion,
    eventType: input.eventType,
    schemaVersion: 1,
    payload: Object.freeze({ ...input.payload }),
    correlationId: input.correlationId,
    occurredAt,
    availableAt,
  });
}

export function workstreamEventPayload(
  workstream: Workstream,
): Readonly<Record<string, unknown>> {
  return {
    workstreamId: workstream.id,
    state: workstream.state,
    version: workstream.version,
  };
}

export function taskEventPayload(
  task: Task,
): Readonly<Record<string, unknown>> {
  return {
    taskId: task.id,
    workstreamId: task.workstreamId,
    state: task.state,
    version: task.version,
  };
}

export function approvalEventPayload(
  request: ApprovalRequest,
  outcome?: ApprovalDecisionOutcome,
): Readonly<Record<string, unknown>> {
  return {
    approvalRequestId: request.id,
    state: request.state,
    version: request.version,
    ...(outcome === undefined ? {} : { outcome }),
  };
}

export function recipientSafeApprovalPayload(payload: unknown): boolean {
  return !containsProtectedField(payload);
}

function containsProtectedField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsProtectedField);
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(([key, child]) => {
    const normalized = key.toLowerCase();
    return [
      "evidence",
      "rationale",
      "target",
      "authority",
      "payload",
      "strategy",
    ]
      .some((forbidden) => normalized.includes(forbidden)) ||
      containsProtectedField(child);
  });
}

export type WorkstreamEventAggregateId = WorkstreamId;
export type TaskEventAggregateId = TaskId;
export type ApprovalEventAggregateId = ApprovalRequestId;
