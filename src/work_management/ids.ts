import {
  type ActorId,
  type AggregateVersion,
  type DealId,
  parseActorId,
  parseAggregateVersion,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
  type TenantId,
  type WorkspaceId,
} from "../platform/api/v1.ts";

export type {
  ActorId,
  AggregateVersion,
  DealId,
  TenantId,
  WorkspaceId,
} from "../platform/api/v1.ts";

declare const workManagementIdBrand: unique symbol;
type WorkManagementId<Kind extends string> = string & {
  readonly [workManagementIdBrand]: Kind;
};

export type WorkstreamId = WorkManagementId<"WorkstreamId">;
export type TaskId = WorkManagementId<"TaskId">;
export type ApprovalRequestId = WorkManagementId<"ApprovalRequestId">;
export type ApprovalPackageId = WorkManagementId<"ApprovalPackageId">;
export type ApprovalDecisionId = WorkManagementId<"ApprovalDecisionId">;
export type WorkEventId = WorkManagementId<"WorkEventId">;

export interface WorkScope {
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
}

export function workstreamId(value: string): WorkstreamId {
  return prefixed(value, "workstream_", "workstream ID");
}

export function taskId(value: string): TaskId {
  return prefixed(value, "task_", "task ID");
}

export function approvalRequestId(value: string): ApprovalRequestId {
  return prefixed(value, "approval_", "approval request ID");
}

export function approvalPackageId(value: string): ApprovalPackageId {
  return prefixed(value, "package_", "approval package ID");
}

export function approvalDecisionId(value: string): ApprovalDecisionId {
  return prefixed(value, "decision_", "approval decision ID");
}

export function workEventId(value: string): WorkEventId {
  return prefixed(value, "work_event_", "work event ID");
}

export function actor(value: string): ActorId {
  return parseRequired(value, parseActorId, "actor ID");
}

export function tenant(value: string): TenantId {
  return parseRequired(value, parseTenantId, "tenant ID");
}

export function workspace(value: string): WorkspaceId {
  return parseRequired(value, parseWorkspaceId, "workspace ID");
}

export function deal(value: string): DealId {
  return parseRequired(value, parseDealId, "deal ID");
}

export function aggregateVersion(value: number): AggregateVersion {
  const parsed = parseAggregateVersion(value);
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Aggregate version "${value}" is invalid; expected a positive safe integer.`,
  );
}

function parseRequired<T>(
  value: string,
  parser: (candidate: unknown) => { readonly ok: boolean; readonly value?: T },
  label: string,
): T {
  const parsed = parser(value);
  if (parsed.ok && parsed.value !== undefined) return parsed.value;
  throw new Error(`Invalid ${label} "${value}"; expected a canonical ID.`);
}

function prefixed<T extends string>(
  value: string,
  prefix: string,
  label: string,
): T {
  const suffix = value.slice(prefix.length);
  if (
    value.length <= 64 &&
    value.startsWith(prefix) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suffix)
  ) {
    return value as T;
  }
  throw new Error(
    `Invalid ${label} "${value}"; expected prefix "${prefix}" and slug characters.`,
  );
}
