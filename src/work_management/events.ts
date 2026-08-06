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
import { assertText, stableSerialize, WorkManagementError } from "./model.ts";

export type WorkManagementEventType =
  | "workstream.created"
  | "workstream.state_changed"
  | "task.created"
  | "task.state_changed"
  | "approval.requested"
  | "approval.decision_recorded"
  | "approval.withdrawn"
  | "approval.invalidated"
  | "approval.expired";

export interface ApprovalNotificationPayload {
  readonly notificationType: "approval_request";
  readonly title: string;
  readonly body: string;
  readonly recipients: readonly { readonly recipientId: ActorId }[];
}

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

export function approvalNotificationPayload(
  request: ApprovalRequest,
): ApprovalNotificationPayload {
  const title = "Approval request requires review";
  const body =
    `Approval request ${request.id} is ready for the named approver.`;
  return Object.freeze({
    notificationType: "approval_request",
    title,
    body,
    recipients: Object.freeze([{ recipientId: request.namedApproverId }]),
  });
}

export function recipientSafeApprovalPayload(
  payload: ApprovalNotificationPayload,
): boolean {
  const serialized = stableSerialize(payload);
  return !serialized.includes("evidence") &&
    !serialized.includes("rationale") && !serialized.includes("target");
}

export type WorkstreamEventAggregateId = WorkstreamId;
export type TaskEventAggregateId = TaskId;
export type ApprovalEventAggregateId = ApprovalRequestId;
