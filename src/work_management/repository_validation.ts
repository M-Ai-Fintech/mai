import {
  actor,
  aggregateVersion,
  approvalDecisionId,
  approvalPackageId,
  approvalRequestId,
  deal,
  targetCommandType,
  taskId,
  tenant,
  type WorkScope,
  workspace,
  workstreamId,
} from "./ids.ts";
import {
  type ApprovalDecision,
  type ApprovalPackage,
  type ApprovalRequest,
  assertPackage,
  assertWorkScope,
  freezePackage,
  type Task,
  WorkManagementError,
  type Workstream,
} from "./model.ts";

export interface WorkstreamRow {
  readonly workstreamId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly version: string | number;
  readonly document: unknown;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}

export interface TaskRow {
  readonly taskId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly workstreamId: string;
  readonly version: string | number;
  readonly document: unknown;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}

export interface ApprovalRequestRow {
  readonly approvalRequestId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly version: string | number;
  readonly document: unknown;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
}

export function parseStoredWorkstream(row: WorkstreamRow): Workstream {
  const document = record(
    row.document,
    `Workstream "${row.workstreamId}" document`,
  );
  const value: Workstream = {
    aggregateType: "workstream",
    id: workstreamId(row.workstreamId),
    tenantId: tenant(row.tenantId),
    workspaceId: workspace(row.workspaceId),
    dealId: deal(row.dealId),
    name: text(document.name, "Workstream name"),
    ownerId: actor(text(document.ownerId, "Workstream owner ID")),
    state: state(document.state, [
      "planned",
      "active",
      "blocked",
      "completed",
      "cancelled",
    ], "Workstream state") as Workstream["state"],
    taskIds: array(document.taskIds, "Workstream task IDs").map((value) =>
      taskId(text(value, "Workstream task ID"))
    ),
    version: aggregateVersion(Number(row.version)),
    createdAt: instant(row.createdAt, "Workstream creation time"),
    updatedAt: instant(row.updatedAt, "Workstream update time"),
  };
  assertStoredScope(value, row);
  return Object.freeze({
    ...value,
    taskIds: Object.freeze([...value.taskIds]),
  });
}

export function parseStoredTask(row: TaskRow): Task {
  const document = record(row.document, `Task "${row.taskId}" document`);
  const documentWorkstreamId = workstreamId(
    text(document.workstreamId, "Task document Workstream ID"),
  );
  if (documentWorkstreamId !== row.workstreamId) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Task "${row.taskId}" document Workstream "${documentWorkstreamId}" differs from row Workstream "${row.workstreamId}"; expected one validated back-reference.`,
    );
  }
  const target = document.target === undefined
    ? undefined
    : parseTarget(document.target);
  const value: Task = {
    aggregateType: "task",
    id: taskId(row.taskId),
    tenantId: tenant(row.tenantId),
    workspaceId: workspace(row.workspaceId),
    dealId: deal(row.dealId),
    workstreamId: documentWorkstreamId,
    ...(document.parentTaskId === undefined ? {} : {
      parentTaskId: taskId(text(document.parentTaskId, "Task parent ID")),
    }),
    title: text(document.title, "Task title"),
    assigneeId: actor(text(document.assigneeId, "Task assignee ID")),
    ...(target === undefined ? {} : { target }),
    state: state(document.state, [
      "open",
      "in_progress",
      "blocked",
      "completed",
      "cancelled",
    ], "Task state") as Task["state"],
    version: aggregateVersion(Number(row.version)),
    createdAt: instant(row.createdAt, "Task creation time"),
    updatedAt: instant(row.updatedAt, "Task update time"),
  };
  assertStoredScope(value, row);
  return Object.freeze(value);
}

export function parseStoredApprovalRequest(
  row: ApprovalRequestRow,
): ApprovalRequest {
  const document = record(
    row.document,
    `Approval Request "${row.approvalRequestId}" document`,
  );
  const value: ApprovalRequest = {
    aggregateType: "approval_request",
    id: approvalRequestId(row.approvalRequestId),
    tenantId: tenant(row.tenantId),
    workspaceId: workspace(row.workspaceId),
    dealId: deal(row.dealId),
    requesterId: actor(text(document.requesterId, "Approval requester ID")),
    namedApproverId: actor(text(document.namedApproverId, "Named approver ID")),
    package: parsePackage(document.package),
    state: state(document.state, [
      "draft",
      "open",
      "decided",
      "withdrawn",
      "expired",
      "invalidated",
    ], "Approval Request state") as ApprovalRequest["state"],
    ...(document.decision === undefined
      ? {}
      : { decision: parseStoredDecision(document.decision) }),
    version: aggregateVersion(Number(row.version)),
    createdAt: instant(row.createdAt, "Approval Request creation time"),
    updatedAt: instant(row.updatedAt, "Approval Request update time"),
  };
  assertStoredScope(value, row);
  if (value.requesterId === value.namedApproverId) {
    throw new WorkManagementError(
      "SEPARATION_OF_DUTIES",
      `Approval Request "${value.id}" requester and approver are identical; expected distinct actor IDs.`,
    );
  }
  return Object.freeze({ ...value, package: freezePackage(value.package) });
}

export function assertStoredScope(
  aggregate: Pick<
    Workstream | Task | ApprovalRequest,
    "tenantId" | "workspaceId" | "dealId"
  >,
  row: {
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly dealId: string;
  },
): void {
  const scope: WorkScope = {
    tenantId: tenant(row.tenantId),
    workspaceId: workspace(row.workspaceId),
    dealId: deal(row.dealId),
  };
  assertWorkScope(scope, "Stored work scope");
  if (
    aggregate.tenantId === scope.tenantId &&
    aggregate.workspaceId === scope.workspaceId &&
    aggregate.dealId === scope.dealId
  ) return;
  throw new WorkManagementError(
    "SCOPE_MISMATCH",
    `Stored aggregate scope for "${aggregate.dealId}" differs from row scope; expected exact tenant/workspace/deal ownership.`,
  );
}

function parsePackage(value: unknown): ApprovalPackage {
  const document = record(value, "Approval package");
  const target = parseTarget(document.target);
  const authority = record(document.authority, "Approval authority");
  const snapshot = record(
    document.authoritySnapshot,
    "Approval authority snapshot",
  );
  const packageValue: ApprovalPackage = {
    id: approvalPackageId(text(document.id, "Approval package ID")),
    version: integer(document.version, "Approval package version"),
    target,
    evidence: array(document.evidence, "Approval package evidence").map(
      parseEvidence,
    ),
    authority: {
      commandType: targetCommandType(
        text(authority.commandType, "Target command type"),
      ),
      target: parseTarget(authority.target),
      namedApproverId: actor(
        text(authority.namedApproverId, "Named approver ID"),
      ),
      policyVersion: text(authority.policyVersion, "Policy version"),
      snapshotReference: text(
        authority.snapshotReference,
        "Authority snapshot reference",
      ),
      scope: parseScope(authority.scope),
      effectiveAt: text(authority.effectiveAt, "Authority effective time"),
      expiresAt: text(authority.expiresAt, "Authority expiry time"),
      applicableLimits: array(
        authority.applicableLimits,
        "Authority applicable limits",
      ).map(parseAuthorityLimit),
      humanOnly: requiredHumanOnly(authority.humanOnly),
    },
    authoritySnapshot: {
      snapshotId: text(snapshot.snapshotId, "Authority snapshot ID"),
      actorId: actor(text(snapshot.actorId, "Authority snapshot actor ID")),
      actorKind: requiredHumanActorKind(snapshot.actorKind),
      policyVersion: text(
        snapshot.policyVersion,
        "Authority snapshot policy version",
      ),
      capturedAt: text(snapshot.capturedAt, "Authority snapshot captured time"),
      scope: parseScope(snapshot.scope),
    },
    payload: record(document.payload, "Approval package payload"),
    contentDigest: text(document.contentDigest, "Approval package digest"),
  };
  assertPackage(packageValue);
  return packageValue;
}

function parseAuthorityLimit(value: unknown) {
  const limit = record(value, "Authority limit");
  const limitValue = limit.value;
  if (
    !["string", "number", "boolean"].includes(typeof limitValue) ||
    (typeof limitValue === "number" && !Number.isFinite(limitValue))
  ) {
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Authority limit "${
        String(limit.name)
      }" value is invalid; expected string, number, or boolean.`,
    );
  }
  return {
    name: text(limit.name, "Authority limit name"),
    value: limitValue as string | number | boolean,
  };
}

function requiredHumanOnly(value: unknown): true {
  if (value === true) return true;
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Persisted authority humanOnly value "${
      String(value)
    }" is invalid; expected true.`,
  );
}

function requiredHumanActorKind(value: unknown): "human" {
  if (value === "human") return "human";
  throw new WorkManagementError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Persisted authority actor kind "${
      String(value)
    }" is invalid; expected human.`,
  );
}

function parseTarget(value: unknown): ApprovalPackage["target"] {
  const target = record(value, "Target reference");
  return {
    aggregateType: text(target.aggregateType, "Target aggregate type"),
    aggregateId: text(target.aggregateId, "Target aggregate ID"),
    expectedVersion: aggregateVersion(
      integer(target.expectedVersion, "Target expected version"),
    ),
    scope: parseScope(target.scope),
  };
}

function parseEvidence(value: unknown): ApprovalPackage["evidence"][number] {
  const evidence = record(value, "Evidence reference");
  return {
    sourceType: text(evidence.sourceType, "Evidence source type"),
    sourceId: text(evidence.sourceId, "Evidence source ID"),
    sourceVersion: text(evidence.sourceVersion, "Evidence source version"),
    ...(evidence.checksum === undefined
      ? {}
      : { checksum: text(evidence.checksum, "Evidence checksum") }),
  };
}

export function parseStoredDecision(value: unknown): ApprovalDecision {
  const decision = record(value, "Approval decision");
  const outcome = decision.outcome;
  if (outcome !== "approved" && outcome !== "rejected") {
    throw new WorkManagementError(
      "INVALID_INPUT",
      `Approval decision outcome "${
        String(outcome)
      }" is invalid; expected approved or rejected.`,
    );
  }
  return {
    id: approvalDecisionId(text(decision.id, "Approval decision ID")),
    outcome,
    approverId: actor(
      text(decision.approverId, "Approval decision approver ID"),
    ),
    ...(decision.reason === undefined
      ? {}
      : { reason: text(decision.reason, "Approval decision reason") }),
    packageId: approvalPackageId(
      text(decision.packageId, "Approval decision package ID"),
    ),
    packageVersion: integer(
      decision.packageVersion,
      "Approval decision package version",
    ),
    recordedAt: text(decision.recordedAt, "Approval decision recorded time"),
  };
}

function parseScope(value: unknown): WorkScope {
  const scope = record(value, "Work scope");
  return {
    tenantId: tenant(text(scope.tenantId, "Scope tenant ID")),
    workspaceId: workspace(text(scope.workspaceId, "Scope workspace ID")),
    dealId: deal(text(scope.dealId, "Scope deal ID")),
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} is invalid; expected a JSON object.`,
  );
}

function array(value: unknown, label: string): readonly unknown[] {
  if (Array.isArray(value)) return value;
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} is invalid; expected a JSON array.`,
  );
}

function text(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim()) return value;
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} "${String(value)}" is invalid; expected non-empty text.`,
  );
}

function integer(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  if (
    typeof value === "string" && /^[0-9]+$/.test(value) && Number(value) > 0
  ) return Number(value);
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} "${String(value)}" is invalid; expected a positive integer.`,
  );
}

function instant(value: Date | string, label: string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} "${String(value)}" is invalid; expected a valid timestamp.`,
  );
}

function state(
  value: unknown,
  allowed: readonly string[],
  label: string,
): string {
  if (typeof value === "string" && allowed.includes(value)) return value;
  throw new WorkManagementError(
    "INVALID_INPUT",
    `${label} "${String(value)}" is invalid; expected one of ${
      allowed.join(", ")
    }.`,
  );
}
