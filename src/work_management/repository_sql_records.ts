import type { AggregateVersion } from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { WorkManagementEvent } from "./events.ts";
import type { ApprovalRequestId, WorkScope } from "./ids.ts";
import type {
  ApprovalDecision,
  ApprovalRequest,
  WorkAggregate,
} from "./model.ts";
import { semanticallyEquivalent } from "./record_identity.ts";
import {
  type WorkCommandResult,
  type WorkHistoryRecord,
  WorkManagementRecordConflictError,
} from "./repository.ts";
import {
  parseStoredApprovalRequestVerified,
  parseStoredDecision,
  parseStoredTask,
  parseStoredWorkstream,
} from "./repository_validation.ts";
import {
  parseTargetCommandDispatchVerified,
  type TargetCommandDispatch,
} from "./target_commands.ts";
import {
  PostgresAuthorityEvaluationStore,
} from "./authority_evaluation_store.ts";
import {
  type AuthorityEvaluation,
  parseAuthorityEvaluation,
} from "./authority_evaluation.ts";

export class PostgresWorkManagementRecords {
  private readonly authorityEvaluations: PostgresAuthorityEvaluationStore;

  constructor(private readonly transaction: TransactionHandle) {
    this.authorityEvaluations = new PostgresAuthorityEvaluationStore(
      transaction,
    );
  }

  async listHistory(
    scope: WorkScope,
    aggregateType: string,
    aggregateId: string,
  ): Promise<readonly WorkHistoryRecord[]> {
    const result = await this.transaction.query<WorkManagementEvent>(
      `SELECT event_id AS "eventId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", aggregate_type AS "aggregateType", aggregate_id AS "aggregateId", aggregate_version AS "aggregateVersion", event_type AS "eventType", actor_id AS "actorId", actor_kind AS "actorKind", correlation_id AS "correlationId", 1 AS "schemaVersion", payload, occurred_at AS "occurredAt", occurred_at AS "availableAt"
       FROM work_management.aggregate_history
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND aggregate_type = $4 AND aggregate_id = $5
       ORDER BY aggregate_version ASC`,
      [
        scope.tenantId,
        scope.workspaceId,
        scope.dealId,
        aggregateType,
        aggregateId,
      ],
    );
    return result.rows.map((row) => ({
      ...row,
      aggregateVersion: Number(row.aggregateVersion) as AggregateVersion,
    }));
  }

  async appendApprovalDecision(
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ): Promise<void> {
    const inserted = await this.transaction.query(
      `INSERT INTO work_management.approval_decision_history (
         decision_id, tenant_id, workspace_id, deal_id, approval_request_id,
         approval_request_version, package_id, package_version, package_digest,
         outcome, approver_id, decision, recorded_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (decision_id) DO NOTHING`,
      [
        decision.id,
        request.tenantId,
        request.workspaceId,
        request.dealId,
        request.id,
        request.version,
        decision.packageId,
        decision.packageVersion,
        request.package.contentDigest,
        decision.outcome,
        decision.approverId,
        JSON.stringify(decision),
        decision.recordedAt,
      ],
    );
    if (inserted.rowCount === 1) return;
    const existing = await this.transaction.query<DecisionConflictRow>(
      `SELECT tenant_id AS "tenantId", workspace_id AS "workspaceId",
         deal_id AS "dealId", approval_request_id AS "approvalRequestId",
         approval_request_version::text AS "approvalRequestVersion",
         package_id AS "packageId", package_version::text AS "packageVersion",
         package_digest AS "packageDigest", outcome, approver_id AS "approverId",
         decision, recorded_at AS "recordedAt"
       FROM work_management.approval_decision_history WHERE decision_id = $1`,
      [decision.id],
    );
    if (equivalentDecision(existing.rows[0], request, decision)) return;
    throw new WorkManagementRecordConflictError("decision", decision.id);
  }

  async listApprovalDecisions(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly ApprovalDecision[]> {
    const result = await this.transaction.query<{ readonly decision: unknown }>(
      `SELECT decision FROM work_management.approval_decision_history
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND approval_request_id = $4 ORDER BY recorded_at ASC`,
      [scope.tenantId, scope.workspaceId, scope.dealId, requestId],
    );
    return result.rows.map((row) => parseStoredDecision(row.decision));
  }

  async appendHistory(event: WorkHistoryRecord): Promise<void> {
    const inserted = await this.transaction.query(
      `INSERT INTO work_management.aggregate_history (
         event_id, tenant_id, workspace_id, deal_id, aggregate_type,
         aggregate_id, aggregate_version, event_type, actor_id, actor_kind,
         correlation_id, payload, occurred_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        event.eventId,
        event.tenantId,
        event.workspaceId,
        event.dealId,
        event.aggregateType,
        event.aggregateId,
        event.aggregateVersion,
        event.eventType,
        event.actorId,
        event.actorKind,
        event.correlationId,
        JSON.stringify(event.payload),
        event.occurredAt,
      ],
    );
    if (inserted.rowCount === 1) return;
    const existing = await this.transaction.query<WorkManagementEvent>(
      `SELECT event_id AS "eventId", tenant_id AS "tenantId",
         workspace_id AS "workspaceId", deal_id AS "dealId",
         aggregate_type AS "aggregateType", aggregate_id AS "aggregateId",
         aggregate_version AS "aggregateVersion", event_type AS "eventType",
         actor_id AS "actorId", actor_kind AS "actorKind",
         correlation_id AS "correlationId", 1 AS "schemaVersion", payload,
         occurred_at AS "occurredAt", occurred_at AS "availableAt"
       FROM work_management.aggregate_history WHERE event_id = $1`,
      [event.eventId],
    );
    const row = existing.rows[0];
    if (row !== undefined && equivalentEvent(row, event)) return;
    throw new WorkManagementRecordConflictError("history event", event.eventId);
  }

  async saveCommandResult(result: WorkCommandResult): Promise<void> {
    const aggregate = result.aggregate;
    const inserted = await this.transaction.query(
      `INSERT INTO work_management.command_results (
         result_id, tenant_id, workspace_id, deal_id, aggregate_type,
         aggregate_id, aggregate_version, result, recorded_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (result_id) DO NOTHING`,
      [
        result.resultId,
        aggregate.tenantId,
        aggregate.workspaceId,
        aggregate.dealId,
        aggregate.aggregateType,
        aggregate.id,
        aggregate.version,
        JSON.stringify(aggregate),
        result.recordedAt,
      ],
    );
    if (inserted.rowCount === 1) return;
    const existing = await this.findCommandResult(result.resultId);
    if (existing !== undefined && semanticallyEquivalent(existing, result)) {
      return;
    }
    throw new WorkManagementRecordConflictError(
      "command result",
      result.resultId,
    );
  }

  async findCommandResult(
    resultId: string,
  ): Promise<WorkCommandResult | undefined> {
    const found = await this.transaction.query<CommandResultRow>(
      `SELECT result_id AS "resultId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", aggregate_type AS "aggregateType", aggregate_id AS "aggregateId", aggregate_version AS "aggregateVersion", result, recorded_at AS "recordedAt"
       FROM work_management.command_results WHERE result_id = $1`,
      [resultId],
    );
    const row = found.rows[0];
    if (row === undefined) return;
    const aggregate = await parseCommandAggregate(row.result);
    assertCommandResultColumns(row, aggregate);
    return {
      resultId: row.resultId,
      aggregate,
      recordedAt: new Date(row.recordedAt).toISOString(),
    };
  }

  async appendTargetCommand(dispatch: TargetCommandDispatch): Promise<void> {
    const inserted = await this.transaction.query(
      `INSERT INTO work_management.target_command_dispatches (
         dispatch_id, tenant_id, workspace_id, deal_id, approval_request_id,
         approval_request_version, decision_id, target_aggregate_type,
         target_aggregate_id, expected_target_version, package_id,
         package_version, package_digest, authority_snapshot_reference,
         authority_proof_id, authority_proof_digest, idempotency_identity,
         command_type, dispatch, recorded_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (dispatch_id) DO NOTHING`,
      [
        dispatch.dispatchId,
        dispatch.tenantId,
        dispatch.workspaceId,
        dispatch.dealId,
        dispatch.approvalRequestId,
        dispatch.approvalRequestVersion,
        dispatch.decisionId,
        dispatch.targetAggregateType,
        dispatch.targetAggregateId,
        dispatch.expectedTargetVersion,
        dispatch.packageId,
        dispatch.packageVersion,
        dispatch.packageDigest,
        dispatch.authoritySnapshotReference,
        dispatch.authorityProof?.proofId ?? null,
        dispatch.authorityProof?.proofDigest ?? null,
        dispatch.idempotencyIdentity,
        dispatch.commandType,
        JSON.stringify(dispatch),
        dispatch.recordedAt,
      ],
    );
    if (inserted.rowCount === 1) return;
    const existing = await this.transaction.query<TargetDispatchRow>(
      `SELECT dispatch, dispatch_id AS "dispatchId", tenant_id AS "tenantId",
         workspace_id AS "workspaceId", deal_id AS "dealId",
         approval_request_id AS "approvalRequestId",
         approval_request_version AS "approvalRequestVersion",
         decision_id AS "decisionId", target_aggregate_type AS "targetAggregateType",
         target_aggregate_id AS "targetAggregateId",
         expected_target_version AS "expectedTargetVersion", package_id AS "packageId",
         package_version AS "packageVersion", package_digest AS "packageDigest",
         authority_snapshot_reference AS "authoritySnapshotReference",
         authority_proof_id AS "authorityProofId", authority_proof_digest AS "authorityProofDigest",
         idempotency_identity AS "idempotencyIdentity", command_type AS "commandType",
         recorded_at AS "recordedAt"
       FROM work_management.target_command_dispatches
       WHERE dispatch_id = $1`,
      [dispatch.dispatchId],
    );
    const row = existing.rows[0];
    if (row !== undefined) {
      const stored = await parseTargetCommandDispatchVerified(row.dispatch);
      assertTargetDispatchColumns(row, stored);
      if (semanticallyEquivalent(stored, dispatch)) return;
    }
    throw new WorkManagementRecordConflictError(
      "target command",
      dispatch.dispatchId,
    );
  }

  async listTargetCommands(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly TargetCommandDispatch[]> {
    const result = await this.transaction.query<TargetDispatchRow>(
      `SELECT dispatch, dispatch_id AS "dispatchId", tenant_id AS "tenantId",
         workspace_id AS "workspaceId", deal_id AS "dealId",
         approval_request_id AS "approvalRequestId",
         approval_request_version AS "approvalRequestVersion",
         decision_id AS "decisionId", target_aggregate_type AS "targetAggregateType",
         target_aggregate_id AS "targetAggregateId",
         expected_target_version AS "expectedTargetVersion", package_id AS "packageId",
         package_version AS "packageVersion", package_digest AS "packageDigest",
         authority_snapshot_reference AS "authoritySnapshotReference",
         authority_proof_id AS "authorityProofId", authority_proof_digest AS "authorityProofDigest",
         idempotency_identity AS "idempotencyIdentity", command_type AS "commandType",
         recorded_at AS "recordedAt"
       FROM work_management.target_command_dispatches
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND approval_request_id = $4 ORDER BY recorded_at ASC`,
      [scope.tenantId, scope.workspaceId, scope.dealId, requestId],
    );
    return await Promise.all(result.rows.map(async (row) => {
      const dispatch = await parseTargetCommandDispatchVerified(row.dispatch);
      assertTargetDispatchColumns(row, dispatch);
      return dispatch;
    }));
  }

  appendAuthorityEvaluation(evaluation: AuthorityEvaluation): Promise<void> {
    return this.authorityEvaluations.append(evaluation);
  }

  async findAuthorityEvaluation(
    packageId: string,
    packageVersion: number,
    packageDigest: string,
  ): Promise<AuthorityEvaluation | undefined> {
    const result = await this.transaction.query<{
      readonly evaluation: unknown;
    }>(
      `SELECT evaluation FROM work_management.authority_evaluations
       WHERE approval_package_id = $1 AND approval_package_version = $2
         AND approval_package_digest = $3`,
      [packageId, packageVersion, packageDigest],
    );
    if (result.rows.length === 0) return undefined;
    if (result.rows.length !== 1) {
      throw new WorkManagementRecordConflictError(
        "authority evaluation",
        packageId,
      );
    }
    return await parseAuthorityEvaluation(result.rows[0].evaluation);
  }
}

interface DecisionConflictRow {
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

interface CommandResultRow {
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

interface TargetDispatchRow {
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

function assertTargetDispatchColumns(
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

function equivalentDecision(
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

function equivalentEvent(
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

async function parseCommandAggregate(value: unknown): Promise<WorkAggregate> {
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

function assertCommandResultColumns(
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
