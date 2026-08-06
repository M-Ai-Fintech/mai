import type { WorkManagementEvent } from "./events.ts";
import type {
  ApprovalDecision,
  ApprovalRequest,
  WorkAggregate,
} from "./model.ts";
import { semanticallyEquivalent } from "./record_identity.ts";
import { WorkManagementRecordConflictError } from "./repository.ts";
import {
  parseStoredApprovalRequestVerified,
  parseStoredDecision,
  parseStoredTask,
  parseStoredWorkstream,
} from "./repository_validation.ts";
import type { TargetCommandDispatch } from "./target_commands.ts";

export interface DecisionConflictRow {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly approvalRequestId: string;
  readonly approvalRequestVersion: string;
  readonly packageId: string;
  readonly packageVersion: string;
  readonly packageDigest: string;
  readonly outcome: string;
  readonly approverId: string;
  readonly decision: unknown;
  readonly recordedAt: string;
}

export interface CommandResultRow {
  readonly resultId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: string | number;
  readonly result: unknown;
  readonly recordedAt: string;
}

export interface TargetDispatchRow {
  readonly dispatch: unknown;
  readonly dispatchId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly approvalRequestId: string;
  readonly approvalRequestVersion: string | number;
  readonly decisionId: string;
  readonly targetAggregateType: string;
  readonly targetAggregateId: string;
  readonly expectedTargetVersion: string | number;
  readonly packageId: string;
  readonly packageVersion: string | number;
  readonly packageDigest: string;
  readonly authoritySnapshotReference: string;
  readonly authorityProofId: string | null;
  readonly authorityProofDigest: string | null;
  readonly idempotencyIdentity: string;
  readonly commandType: string;
  readonly recordedAt: string;
}

export function assertTargetDispatchColumns(
  row: TargetDispatchRow,
  dispatch: TargetCommandDispatch,
): void {
  const proof = dispatch.authorityProof;
  const matches = [
    row.dispatchId === dispatch.dispatchId,
    row.tenantId === dispatch.tenantId,
    row.workspaceId === dispatch.workspaceId,
    row.dealId === dispatch.dealId,
    row.approvalRequestId === dispatch.approvalRequestId,
    Number(row.approvalRequestVersion) === dispatch.approvalRequestVersion,
    row.decisionId === dispatch.decisionId,
    row.targetAggregateType === dispatch.targetAggregateType,
    row.targetAggregateId === dispatch.targetAggregateId,
    Number(row.expectedTargetVersion) === dispatch.expectedTargetVersion,
    row.packageId === dispatch.packageId,
    Number(row.packageVersion) === dispatch.packageVersion,
    row.packageDigest === dispatch.packageDigest,
    row.authoritySnapshotReference === dispatch.authoritySnapshotReference,
    row.authorityProofId === (proof?.proofId ?? null),
    row.authorityProofDigest === (proof?.proofDigest ?? null),
    row.idempotencyIdentity === dispatch.idempotencyIdentity,
    row.commandType === dispatch.commandType,
    canonicalTimestamp(row.recordedAt) === dispatch.recordedAt,
  ];
  if (matches.every(Boolean)) return;
  throw new WorkManagementRecordConflictError(
    "target command",
    row.dispatchId,
  );
}

function canonicalTimestamp(value: string): string {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return "invalid";
  return instant.toISOString();
}

export function equivalentDecision(
  row: DecisionConflictRow | undefined,
  request: ApprovalRequest,
  decision: ApprovalDecision,
): boolean {
  if (row === undefined) return false;
  return semanticallyEquivalent(decisionRecord(row), {
    tenantId: request.tenantId,
    workspaceId: request.workspaceId,
    dealId: request.dealId,
    approvalRequestId: request.id,
    approvalRequestVersion: request.version,
    packageId: decision.packageId,
    packageVersion: decision.packageVersion,
    packageDigest: request.package.contentDigest,
    outcome: decision.outcome,
    approverId: decision.approverId,
    decision,
    recordedAt: decision.recordedAt,
  });
}

function decisionRecord(
  row: DecisionConflictRow,
): Readonly<Record<string, unknown>> {
  return {
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    dealId: row.dealId,
    approvalRequestId: row.approvalRequestId,
    approvalRequestVersion: Number(row.approvalRequestVersion),
    packageId: row.packageId,
    packageVersion: Number(row.packageVersion),
    packageDigest: row.packageDigest,
    outcome: row.outcome,
    approverId: row.approverId,
    decision: parseStoredDecision(row.decision),
    recordedAt: new Date(row.recordedAt).toISOString(),
  };
}

export function equivalentEvent(
  row: WorkManagementEvent,
  event: WorkManagementEvent,
): boolean {
  return semanticallyEquivalent({
    ...row,
    aggregateVersion: Number(row.aggregateVersion),
    occurredAt: new Date(row.occurredAt),
    availableAt: new Date(row.availableAt),
  }, event);
}

export async function parseCommandAggregate(
  value: unknown,
): Promise<WorkAggregate> {
  if (!isWorkAggregate(value)) {
    throw new Error(
      `Work command result "${
        String(value)
      }" is invalid; expected a complete aggregate snapshot.`,
    );
  }
  const common = {
    tenantId: value.tenantId,
    workspaceId: value.workspaceId,
    dealId: value.dealId,
    version: value.version,
    document: value,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  if (value.aggregateType === "workstream") {
    return parseStoredWorkstream({ ...common, workstreamId: value.id });
  }
  if (value.aggregateType === "task") {
    return parseStoredTask({
      ...common,
      taskId: value.id,
      workstreamId: value.workstreamId,
    });
  }
  return await parseStoredApprovalRequestVerified({
    ...common,
    approvalRequestId: value.id,
    requesterId: value.requesterId,
    namedApproverId: value.namedApproverId,
    packageId: value.package.id,
    packageVersion: value.package.version,
    packageDigest: value.package.contentDigest,
    state: value.state,
  });
}

export function assertCommandResultColumns(
  row: CommandResultRow,
  aggregate: WorkAggregate,
): void {
  const actual = [
    aggregate.tenantId,
    aggregate.workspaceId,
    aggregate.dealId,
    aggregate.aggregateType,
    aggregate.id,
    String(aggregate.version),
  ];
  const persisted = [
    row.tenantId,
    row.workspaceId,
    row.dealId,
    row.aggregateType,
    row.aggregateId,
    String(row.aggregateVersion),
  ];
  if (actual.every((value, index) => value === persisted[index])) return;
  throw new WorkManagementRecordConflictError(
    "command result",
    row.resultId,
  );
}

function isWorkAggregate(value: unknown): value is WorkAggregate {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return ["workstream", "task", "approval_request"].includes(
    String(candidate.aggregateType),
  ) && typeof candidate.id === "string" &&
    typeof candidate.tenantId === "string" &&
    typeof candidate.workspaceId === "string" &&
    typeof candidate.dealId === "string" &&
    Number.isSafeInteger(candidate.version) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string";
}
