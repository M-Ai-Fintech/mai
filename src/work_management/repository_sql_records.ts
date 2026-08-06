import type { AggregateVersion } from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { WorkManagementEvent } from "./events.ts";
import type { ApprovalRequestId, WorkScope } from "./ids.ts";
import type { ApprovalDecision, ApprovalRequest } from "./model.ts";
import { semanticallyEquivalent } from "./record_identity.ts";
import {
  type WorkCommandResult,
  type WorkHistoryRecord,
  WorkManagementRecordConflictError,
} from "./repository.ts";
import { parseStoredDecision } from "./repository_validation.ts";
import {
  parseTargetCommandDispatchVerified,
  type TargetCommandDispatch,
} from "./target_commands.ts";
import {
  PostgresAuthorityEvaluationStore,
} from "./authority_evaluation_store.ts";
import type { AuthorityDenial } from "./authority_denial.ts";
import { parseAuthorityDenial } from "./authority_denial.ts";
import {
  type AuthorityEvaluation,
  parseAuthorityEvaluation,
} from "./authority_evaluation.ts";
import {
  assertCommandResultColumns,
  assertTargetDispatchColumns,
  type CommandResultRow,
  type DecisionConflictRow,
  equivalentDecision,
  equivalentEvent,
  parseCommandAggregate,
  type TargetDispatchRow,
} from "./repository_sql_record_helpers.ts";

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

  async findAuthorityEvaluationById(
    evaluationId: string,
  ): Promise<AuthorityEvaluation | undefined> {
    const result = await this.transaction.query<{
      readonly evaluation: unknown;
    }>(
      `SELECT evaluation FROM work_management.authority_evaluations
       WHERE evaluation_id = $1`,
      [evaluationId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : await parseAuthorityEvaluation(row.evaluation);
  }

  async appendAuthorityDenial(denial: AuthorityDenial): Promise<void> {
    const inserted = await this.transaction.query(
      `INSERT INTO work_management.authority_denials (
         denial_id, denial_digest, tenant_id, workspace_id, deal_id,
         requester_id, named_approver_id, requested_action, denial_stage,
         target_aggregate_type, target_aggregate_id, expected_target_version,
         reasons, denial, evaluated_at, idempotency_identity
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (denial_id) DO NOTHING`,
      [
        denial.denialId,
        denial.denialDigest,
        denial.scope.tenantId,
        denial.scope.workspaceId,
        denial.scope.dealId,
        denial.requesterId,
        denial.namedApproverId,
        denial.requestedAction,
        denial.stage,
        denial.targetAggregateType ?? null,
        denial.targetAggregateId ?? null,
        denial.expectedTargetVersion ?? null,
        JSON.stringify(denial.reasons),
        JSON.stringify(denial),
        denial.evaluatedAt,
        denial.idempotencyIdentity,
      ],
    );
    if (inserted.rowCount === 1) return;
    const current = await this.findAuthorityDenialById(denial.denialId);
    if (
      current !== undefined &&
      semanticallyEquivalent(current, denial)
    ) return;
    throw new WorkManagementRecordConflictError(
      "authority denial",
      denial.denialId,
    );
  }

  async findAuthorityDenialById(
    denialId: string,
  ): Promise<AuthorityDenial | undefined> {
    const result = await this.transaction.query<{ readonly denial: unknown }>(
      `SELECT denial FROM work_management.authority_denials WHERE denial_id = $1`,
      [denialId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : await parseAuthorityDenial(row.denial);
  }
}
