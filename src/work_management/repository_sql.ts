import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  ApprovalDecision,
  ApprovalRequest,
  Task,
  Workstream,
} from "./model.ts";
import { documentFor } from "./repository_rows.ts";
import type {
  ApprovalRequestRow,
  TaskRow,
  WorkstreamRow,
} from "./repository_validation.ts";
import {
  approvalRequestFromRow,
  taskFromRow,
  workstreamFromRow,
} from "./repository_rows.ts";
import {
  type WorkCommandResult,
  type WorkHistoryRecord,
  type WorkManagementTransaction,
  WorkManagementVersionConflictError,
} from "./repository.ts";
import { PostgresWorkManagementRecords } from "./repository_sql_records.ts";
import type { TargetCommandDispatch } from "./target_commands.ts";
import type { AuthorityEvaluation } from "./authority_evaluation.ts";
import type { AuthorityDenial } from "./authority_denial.ts";
import type {
  ApprovalRequestId,
  TaskId,
  WorkScope,
  WorkstreamId,
} from "./ids.ts";

export class PostgresWorkManagementRepository
  implements WorkManagementTransaction {
  private readonly records: PostgresWorkManagementRecords;

  constructor(readonly transaction: TransactionHandle) {
    this.records = new PostgresWorkManagementRecords(transaction);
  }

  async findWorkstream(
    scope: WorkScope,
    id: WorkstreamId,
  ): Promise<Workstream | undefined> {
    const result = await this.transaction.query<WorkstreamRow>(
      `SELECT workstream_id AS "workstreamId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", version, document, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM work_management.workstreams_current
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND workstream_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : workstreamFromRow(row);
  }

  async findTask(scope: WorkScope, id: TaskId): Promise<Task | undefined> {
    const result = await this.transaction.query<TaskRow>(
      `SELECT task_id AS "taskId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", workstream_id AS "workstreamId", version, document, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM work_management.tasks_current
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND task_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : taskFromRow(row);
  }

  async listTasksByWorkstream(
    scope: WorkScope,
    workstreamId: WorkstreamId,
  ): Promise<readonly Task[]> {
    const result = await this.transaction.query<TaskRow>(
      `SELECT task_id AS "taskId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", workstream_id AS "workstreamId", version, document, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM work_management.tasks_current
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND workstream_id = $4
       ORDER BY task_id`,
      [scope.tenantId, scope.workspaceId, scope.dealId, workstreamId],
    );
    return result.rows.map(taskFromRow);
  }

  async findApprovalRequest(
    scope: WorkScope,
    id: ApprovalRequestId,
  ): Promise<ApprovalRequest | undefined> {
    const result = await this.transaction.query<ApprovalRequestRow>(
      `SELECT approval_request_id AS "approvalRequestId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", version, requester_id AS "requesterId", named_approver_id AS "namedApproverId", package_id AS "packageId", package_version AS "packageVersion", package_digest AS "packageDigest", state, document, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM work_management.approval_requests_current
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND approval_request_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : await approvalRequestFromRow(row);
  }

  async listHistory(
    scope: WorkScope,
    aggregateType: string,
    aggregateId: string,
  ): Promise<readonly WorkHistoryRecord[]> {
    return await this.records.listHistory(scope, aggregateType, aggregateId);
  }

  saveWorkstream(
    aggregate: Workstream,
    expectedVersion: number,
  ): Promise<void> {
    return this.saveCurrent(
      "workstreams_current",
      "workstream_id",
      aggregate.id,
      aggregate,
      expectedVersion,
    );
  }

  saveTask(aggregate: Task, expectedVersion: number): Promise<void> {
    return this.saveCurrent(
      "tasks_current",
      "task_id",
      aggregate.id,
      aggregate,
      expectedVersion,
    );
  }

  saveApprovalRequest(
    aggregate: ApprovalRequest,
    expectedVersion: number,
  ): Promise<void> {
    return this.saveCurrent(
      "approval_requests_current",
      "approval_request_id",
      aggregate.id,
      aggregate,
      expectedVersion,
    );
  }

  async appendApprovalDecision(
    request: ApprovalRequest,
    decision: ApprovalDecision,
  ): Promise<void> {
    await this.records.appendApprovalDecision(request, decision);
  }

  async listApprovalDecisions(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly ApprovalDecision[]> {
    return await this.records.listApprovalDecisions(scope, requestId);
  }

  async appendHistory(event: WorkHistoryRecord): Promise<void> {
    await this.records.appendHistory(event);
  }

  async saveCommandResult(result: WorkCommandResult): Promise<void> {
    await this.records.saveCommandResult(result);
  }

  async findCommandResult(
    resultId: string,
  ): Promise<WorkCommandResult | undefined> {
    return await this.records.findCommandResult(resultId);
  }

  async appendTargetCommand(dispatch: TargetCommandDispatch): Promise<void> {
    await this.records.appendTargetCommand(dispatch);
  }

  async listTargetCommands(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly TargetCommandDispatch[]> {
    return await this.records.listTargetCommands(scope, requestId);
  }

  appendAuthorityEvaluation(evaluation: AuthorityEvaluation): Promise<void> {
    return this.records.appendAuthorityEvaluation(evaluation);
  }

  findAuthorityEvaluation(
    packageId: string,
    packageVersion: number,
    packageDigest: string,
  ): Promise<AuthorityEvaluation | undefined> {
    return this.records.findAuthorityEvaluation(
      packageId,
      packageVersion,
      packageDigest,
    );
  }

  findAuthorityEvaluationById(
    evaluationId: string,
  ): Promise<AuthorityEvaluation | undefined> {
    return this.records.findAuthorityEvaluationById(evaluationId);
  }

  appendAuthorityDenial(denial: AuthorityDenial): Promise<void> {
    return this.records.appendAuthorityDenial(denial);
  }

  findAuthorityDenialById(
    denialId: string,
  ): Promise<AuthorityDenial | undefined> {
    return this.records.findAuthorityDenialById(denialId);
  }

  private async saveCurrent(
    table:
      | "workstreams_current"
      | "tasks_current"
      | "approval_requests_current",
    idColumn: "workstream_id" | "task_id" | "approval_request_id",
    id: string,
    aggregate: Workstream | Task | ApprovalRequest,
    expectedVersion: number,
  ): Promise<void> {
    if (table === "tasks_current") {
      await this.saveTaskCurrent(aggregate as Task, expectedVersion);
      return;
    }
    if (table === "approval_requests_current") {
      await this.saveApprovalCurrent(
        aggregate as ApprovalRequest,
        expectedVersion,
      );
      return;
    }
    const document = documentFor(aggregate);
    const values = [
      aggregate.tenantId,
      aggregate.workspaceId,
      aggregate.dealId,
      id,
      aggregate.version,
      JSON.stringify(document),
      aggregate.createdAt,
      aggregate.updatedAt,
    ];
    if (expectedVersion === 0) {
      const inserted = await this.transaction.query(
        `INSERT INTO work_management.${table} (tenant_id, workspace_id, deal_id, ${idColumn}, version, document, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        values,
      );
      if (inserted.rowCount === 1) return;
      throw new WorkManagementVersionConflictError(id, expectedVersion, 1);
    }
    const updated = await this.transaction.query(
      `UPDATE work_management.${table}
       SET version = $5, document = $6, updated_at = $7
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND ${idColumn} = $4 AND version = $8`,
      [
        aggregate.tenantId,
        aggregate.workspaceId,
        aggregate.dealId,
        id,
        aggregate.version,
        JSON.stringify(document),
        aggregate.updatedAt,
        expectedVersion,
      ],
    );
    if (updated.rowCount === 1) return;
    const current = await this.transaction.query<{ version: string }>(
      `SELECT version::text AS version FROM work_management.${table}
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND ${idColumn} = $4`,
      values.slice(0, 4),
    );
    throw new WorkManagementVersionConflictError(
      id,
      expectedVersion,
      current.rows[0] === undefined
        ? undefined
        : Number(current.rows[0].version),
    );
  }

  private async saveTaskCurrent(
    aggregate: Task,
    expectedVersion: number,
  ): Promise<void> {
    const document = documentFor(aggregate);
    const values = [
      aggregate.tenantId,
      aggregate.workspaceId,
      aggregate.dealId,
      aggregate.id,
      aggregate.workstreamId,
      aggregate.version,
      JSON.stringify(document),
      aggregate.createdAt,
      aggregate.updatedAt,
    ];
    if (expectedVersion === 0) {
      const inserted = await this.transaction.query(
        `INSERT INTO work_management.tasks_current (tenant_id, workspace_id, deal_id, task_id, workstream_id, version, document, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
        values,
      );
      if (inserted.rowCount === 1) return;
      throw new WorkManagementVersionConflictError(
        aggregate.id,
        expectedVersion,
        1,
      );
    }
    const updated = await this.transaction.query(
      `UPDATE work_management.tasks_current SET version = $5, document = $6, updated_at = $7
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND task_id = $4 AND version = $8`,
      [
        aggregate.tenantId,
        aggregate.workspaceId,
        aggregate.dealId,
        aggregate.id,
        aggregate.version,
        JSON.stringify(document),
        aggregate.updatedAt,
        expectedVersion,
      ],
    );
    if (updated.rowCount === 1) return;
    throw await this.conflict(
      "tasks_current",
      "task_id",
      aggregate,
      expectedVersion,
    );
  }

  private async saveApprovalCurrent(
    aggregate: ApprovalRequest,
    expectedVersion: number,
  ): Promise<void> {
    const document = documentFor(aggregate);
    const values = [
      aggregate.tenantId,
      aggregate.workspaceId,
      aggregate.dealId,
      aggregate.id,
      aggregate.version,
      aggregate.requesterId,
      aggregate.namedApproverId,
      aggregate.package.id,
      aggregate.package.version,
      aggregate.package.contentDigest,
      aggregate.state,
      JSON.stringify(document),
      aggregate.createdAt,
      aggregate.updatedAt,
    ];
    if (expectedVersion === 0) {
      const inserted = await this.transaction.query(
        `INSERT INTO work_management.approval_requests_current (tenant_id, workspace_id, deal_id, approval_request_id, version, requester_id, named_approver_id, package_id, package_version, package_digest, state, document, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT DO NOTHING`,
        values,
      );
      if (inserted.rowCount === 1) return;
      throw new WorkManagementVersionConflictError(
        aggregate.id,
        expectedVersion,
        1,
      );
    }
    const updated = await this.transaction.query(
      `UPDATE work_management.approval_requests_current SET version = $5, requester_id = $6, named_approver_id = $7, package_id = $8, package_version = $9, package_digest = $10, state = $11, document = $12, updated_at = $13
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND approval_request_id = $4 AND version = $14`,
      [
        aggregate.tenantId,
        aggregate.workspaceId,
        aggregate.dealId,
        aggregate.id,
        aggregate.version,
        aggregate.requesterId,
        aggregate.namedApproverId,
        aggregate.package.id,
        aggregate.package.version,
        aggregate.package.contentDigest,
        aggregate.state,
        JSON.stringify(document),
        aggregate.updatedAt,
        expectedVersion,
      ],
    );
    if (updated.rowCount === 1) return;
    throw await this.conflict(
      "approval_requests_current",
      "approval_request_id",
      aggregate,
      expectedVersion,
    );
  }

  private async conflict(
    table: string,
    idColumn: string,
    aggregate: Workstream | Task | ApprovalRequest,
    expectedVersion: number,
  ): Promise<WorkManagementVersionConflictError> {
    const result = await this.transaction.query<{ version: string }>(
      `SELECT version::text AS version FROM work_management.${table} WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND ${idColumn} = $4`,
      [
        aggregate.tenantId,
        aggregate.workspaceId,
        aggregate.dealId,
        aggregate.id,
      ],
    );
    return new WorkManagementVersionConflictError(
      aggregate.id,
      expectedVersion,
      result.rows[0] === undefined ? undefined : Number(result.rows[0].version),
    );
  }
}
