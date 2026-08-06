import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type {
  ActorId,
  ApprovalDecisionId,
  ApprovalPackageId,
  ApprovalRequestId,
  DealId,
  TaskId,
  TenantId,
  WorkEventId,
  WorkScope,
  WorkspaceId,
  WorkstreamId,
} from "./ids.ts";

export type WorkstreamState =
  | "planned"
  | "active"
  | "blocked"
  | "completed"
  | "cancelled";
export type TaskState =
  | "open"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled";
export type ApprovalRequestState =
  | "draft"
  | "open"
  | "decided"
  | "withdrawn"
  | "expired"
  | "invalidated";
export type ApprovalDecisionOutcome = "approved" | "rejected";

export interface TargetReference {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly expectedVersion: AggregateVersion;
  readonly scope: WorkScope;
}

export interface EvidenceSnapshotReference {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly checksum?: string;
}

export interface AuthorityRequirement {
  readonly action: string;
  readonly namedApproverId: ActorId;
  readonly policyVersion: string;
  readonly snapshotReference: string;
  readonly humanOnly: true;
}

export interface AuthoritySnapshot {
  readonly snapshotId: string;
  readonly actorId: ActorId;
  readonly actorKind: "human";
  readonly policyVersion: string;
  readonly capturedAt: string;
  readonly scope: WorkScope;
}

export interface ApprovalPackage {
  readonly id: ApprovalPackageId;
  readonly version: number;
  readonly target: TargetReference;
  readonly evidence: readonly EvidenceSnapshotReference[];
  readonly authority: AuthorityRequirement;
  readonly authoritySnapshot: AuthoritySnapshot;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly contentDigest: string;
}

export interface Workstream {
  readonly aggregateType: "workstream";
  readonly id: WorkstreamId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
  readonly name: string;
  readonly ownerId: ActorId;
  readonly state: WorkstreamState;
  readonly taskIds: readonly TaskId[];
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Task {
  readonly aggregateType: "task";
  readonly id: TaskId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
  readonly workstreamId: WorkstreamId;
  readonly parentTaskId?: TaskId;
  readonly title: string;
  readonly assigneeId: ActorId;
  readonly target?: TargetReference;
  readonly state: TaskState;
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApprovalDecision {
  readonly id: ApprovalDecisionId;
  readonly outcome: ApprovalDecisionOutcome;
  readonly approverId: ActorId;
  readonly reason?: string;
  readonly packageId: ApprovalPackageId;
  readonly packageVersion: number;
  readonly recordedAt: string;
}

export interface ApprovalRequest {
  readonly aggregateType: "approval_request";
  readonly id: ApprovalRequestId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
  readonly requesterId: ActorId;
  readonly namedApproverId: ActorId;
  readonly package: ApprovalPackage;
  readonly state: ApprovalRequestState;
  readonly decision?: ApprovalDecision;
  readonly version: AggregateVersion;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type WorkAggregate = Workstream | Task | ApprovalRequest;

export type WorkManagementErrorCode =
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "SCOPE_MISMATCH"
  | "HUMAN_AUTHORITY_REQUIRED"
  | "SEPARATION_OF_DUTIES"
  | "NAMED_APPROVER_REQUIRED"
  | "STALE_APPROVAL_PACKAGE"
  | "DECISION_ALREADY_RECORDED"
  | "INCOMPLETE_WORK"
  | "REFERENCE_MISMATCH";

export class WorkManagementError extends Error {
  constructor(
    readonly code: WorkManagementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkManagementError";
  }
}

export function scopeOf(value: WorkAggregate): WorkScope {
  return {
    tenantId: value.tenantId,
    workspaceId: value.workspaceId,
    dealId: value.dealId,
  };
}

export function assertScope(
  expected: WorkScope,
  actual: WorkScope,
  subject: string,
): void {
  assertWorkScope(expected, `${subject} expected`);
  assertWorkScope(actual, `${subject} actual`);
  if (
    expected.tenantId === actual.tenantId &&
    expected.workspaceId === actual.workspaceId &&
    expected.dealId === actual.dealId
  ) return;
  throw new WorkManagementError(
    "SCOPE_MISMATCH",
    `${subject} scope does not match tenant "${expected.tenantId}", workspace "${expected.workspaceId}", and deal "${expected.dealId}"; expected an exact scope match.`,
  );
}

export function assertWorkScope(
  scope: WorkScope,
  subject = "Work scope",
): void {
  assertText(scope.tenantId, `${subject} tenant ID`, 64);
  assertText(scope.workspaceId, `${subject} workspace ID`, 64);
  assertText(scope.dealId, `${subject} deal ID`, 64);
}

export function assertHumanActor(
  actor: ActorReference,
  action: string,
): void {
  if (actor.kind !== "human") {
    throw new WorkManagementError(
      "HUMAN_AUTHORITY_REQUIRED",
      `Actor "${actor.id}" of kind "${actor.kind}" cannot ${action}; expected an active human actor.`,
    );
  }
  if (actor.state !== "active") {
    throw new WorkManagementError(
      "HUMAN_AUTHORITY_REQUIRED",
      `Actor "${actor.id}" is "${actor.state}" and cannot ${action}; expected an active human actor.`,
    );
  }
}

export function assertDifferentActors(
  requesterId: ActorId,
  approverId: ActorId,
): void {
  if (requesterId !== approverId) return;
  throw new WorkManagementError(
    "SEPARATION_OF_DUTIES",
    `Requester "${requesterId}" cannot also be the named approver; expected two distinct actor IDs.`,
  );
}

export function nextVersion(value: AggregateVersion): AggregateVersion {
  const next = Number(value) + 1;
  if (Number.isSafeInteger(next)) return next as AggregateVersion;
  throw new WorkManagementError(
    "INVALID_INPUT",
    `Aggregate version "${value}" cannot advance; expected a positive safe integer.`,
  );
}

export function assertText(value: string, label: string, maximum = 200): void {
  if (
    typeof value === "string" && value.trim().length > 0 &&
    value.length <= maximum
  ) return;
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} "${value}" is invalid; expected 1-${maximum} non-whitespace characters.`,
  );
}

export function assertTargetReference(target: TargetReference): void {
  assertText(target.aggregateType, "Target aggregate type", 80);
  assertText(target.aggregateId, "Target aggregate ID", 128);
  assertWorkScope(target.scope, "Target scope");
  if (
    Number.isSafeInteger(target.expectedVersion) && target.expectedVersion > 0
  ) return;
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Target "${target.aggregateId}" version "${target.expectedVersion}" is invalid; expected a positive exact version.`,
  );
}

export function freezePackage(packageValue: ApprovalPackage): ApprovalPackage {
  assertPackage(packageValue);
  return Object.freeze({
    ...packageValue,
    target: Object.freeze({
      ...packageValue.target,
      scope: Object.freeze({ ...packageValue.target.scope }),
    }),
    evidence: Object.freeze(
      packageValue.evidence.map((item) => Object.freeze({ ...item })),
    ),
    authority: Object.freeze({ ...packageValue.authority }),
    authoritySnapshot: Object.freeze({
      ...packageValue.authoritySnapshot,
      scope: Object.freeze({ ...packageValue.authoritySnapshot.scope }),
    }),
    payload: deepFreeze(packageValue.payload),
  });
}

export function assertPackage(packageValue: ApprovalPackage): void {
  assertText(packageValue.id, "Approval package ID", 128);
  if (
    !Number.isSafeInteger(packageValue.version) || packageValue.version <= 0
  ) {
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Approval package version "${packageValue.version}" is invalid; expected a positive integer.`,
    );
  }
  assertTargetReference(packageValue.target);
  assertText(packageValue.authority.action, "Approval action", 128);
  assertText(packageValue.authority.namedApproverId, "Named approver ID", 128);
  assertText(packageValue.authority.policyVersion, "Policy version", 128);
  assertText(
    packageValue.authority.snapshotReference,
    "Authority snapshot reference",
    128,
  );
  if (packageValue.authority.humanOnly !== true) {
    throw new WorkManagementError(
      "HUMAN_AUTHORITY_REQUIRED",
      `Approval package "${packageValue.id}" is not human-only; expected humanOnly=true.`,
    );
  }
  assertAuthoritySnapshot(packageValue.authoritySnapshot, packageValue.id);
  if (
    packageValue.authority.snapshotReference !==
      packageValue.authoritySnapshot.snapshotId
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Approval package "${packageValue.id}" authority snapshot reference "${packageValue.authority.snapshotReference}" does not match snapshot "${packageValue.authoritySnapshot.snapshotId}"; expected one immutable snapshot reference.`,
    );
  }
  if (
    packageValue.authority.policyVersion !==
      packageValue.authoritySnapshot.policyVersion
  ) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Approval package "${packageValue.id}" policy version "${packageValue.authority.policyVersion}" does not match snapshot policy version "${packageValue.authoritySnapshot.policyVersion}"; expected one policy snapshot.`,
    );
  }
  assertScope(
    packageValue.target.scope,
    packageValue.authoritySnapshot.scope,
    `Approval package "${packageValue.id}"`,
  );
  if (
    packageValue.authoritySnapshot.actorId !==
      packageValue.authority.namedApproverId
  ) {
    throw new WorkManagementError(
      "NAMED_APPROVER_REQUIRED",
      `Approval package "${packageValue.id}" snapshot actor "${packageValue.authoritySnapshot.actorId}" does not match named approver "${packageValue.authority.namedApproverId}"; expected one authority identity.`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(packageValue.contentDigest)) {
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Approval package "${packageValue.id}" digest "${packageValue.contentDigest}" is invalid; expected lowercase SHA-256 hex.`,
    );
  }
}

function assertAuthoritySnapshot(
  snapshot: AuthoritySnapshot,
  packageId: string,
): void {
  assertText(snapshot.snapshotId, "Authority snapshot ID", 128);
  assertText(snapshot.actorId, "Authority snapshot actor ID", 128);
  assertText(snapshot.policyVersion, "Authority snapshot policy version", 128);
  assertText(snapshot.capturedAt, "Authority snapshot captured time", 64);
  if (snapshot.actorKind === "human") return;
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Approval package "${packageId}" authority snapshot actor kind "${snapshot.actorKind}" is invalid; expected human.`,
  );
}

export function samePackage(
  left: ApprovalPackage,
  right: ApprovalPackage,
): boolean {
  return left.id === right.id && left.version === right.version &&
    left.contentDigest === right.contentDigest &&
    stableSerialize(left) === stableSerialize(right);
}

export function assertExactPackage(
  expected: ApprovalPackage,
  actual: ApprovalPackage,
): void {
  if (samePackage(expected, actual)) return;
  throw new WorkManagementError(
    "STALE_APPROVAL_PACKAGE",
    `Approval package "${expected.id}" version "${expected.version}" does not match the stored immutable snapshot; expected the exact package version and content digest.`,
  );
}

export function stableSerialize(value: unknown): string {
  if (
    value === null || typeof value === "string" || typeof value === "boolean"
  ) return JSON.stringify(value);
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${
      Object.keys(record).sort().filter((key) => record[key] !== undefined)
        .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
        .join(",")
    }}`;
  }
  throw new WorkManagementError(
    "INVALID_INPUT",
    `Value "${String(value)}" is not serializable; expected JSON data.`,
  );
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return value;
}

export type WorkIdTuple = readonly [
  WorkstreamId | TaskId | ApprovalRequestId,
  TenantId,
  WorkspaceId,
  DealId,
];
export type WorkEventReference = {
  readonly eventId: WorkEventId;
  readonly aggregateVersion: AggregateVersion;
};
export type WorkSnapshot = {
  readonly aggregateId: string;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly dealId: DealId;
};
export type WorkTargetId = DealId | TaskId | WorkstreamId | ApprovalRequestId;
export type WorkActorId = ActorId;
export type WorkVersion = AggregateVersion;
export type WorkApprovalPackageId = ApprovalPackageId;
export type WorkApprovalDecisionId = ApprovalDecisionId;
export type WorkApprovalRequestId = ApprovalRequestId;
export type WorkTaskId = TaskId;
export type WorkstreamAggregateId = WorkstreamId;
export type WorkDealId = DealId;
