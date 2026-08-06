import type { AggregateVersion } from "../platform/api/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { WorkManagementEvent } from "./events.ts";
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
  type WorkHistoryRecord,
  type WorkManagementTransaction,
  WorkManagementVersionConflictError,
} from "./repository.ts";
import type {
  ApprovalRequestId,
  TaskId,
  WorkScope,
  WorkstreamId,
} from "./ids.ts";

export class PostgresWorkManagementRepository
  implements WorkManagementTransaction {
  constructor(readonly transaction: TransactionHandle) {}

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

  async findApprovalRequest(
    scope: WorkScope,
    id: ApprovalRequestId,
  ): Promise<ApprovalRequest | undefined> {
    const result = await this.transaction.query<ApprovalRequestRow>(
      `SELECT approval_request_id AS "approvalRequestId", tenant_id AS "tenantId", workspace_id AS "workspaceId", deal_id AS "dealId", version, document, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM work_management.approval_requests_current
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND approval_request_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : approvalRequestFromRow(row);
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
    await this.transaction.query(
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
  }

  async listApprovalDecisions(
    scope: WorkScope,
    requestId: ApprovalRequestId,
  ): Promise<readonly ApprovalDecision[]> {
    const result = await this.transaction.query<{
      readonly decision: unknown;
    }>(
      `SELECT decision FROM work_management.approval_decision_history
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND approval_request_id = $4 ORDER BY recorded_at ASC`,
      [scope.tenantId, scope.workspaceId, scope.dealId, requestId],
    );
    return result.rows.map((row) => parseDecisionDocument(row.decision));
  }

  async appendHistory(event: WorkHistoryRecord): Promise<void> {
    await this.transaction.query(
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
       SET version = $5, document = $6, updated_at = $8
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND ${idColumn} = $4 AND version = $9`,
      [...values, expectedVersion],
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
      `UPDATE work_management.tasks_current SET version = $6, document = $7, updated_at = $9
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND task_id = $4 AND version = $10`,
      [...values, expectedVersion],
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
      `UPDATE work_management.approval_requests_current SET version = $5, requester_id = $6, named_approver_id = $7, package_id = $8, package_version = $9, package_digest = $10, state = $11, document = $12, updated_at = $14
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3 AND approval_request_id = $4 AND version = $15`,
      [...values, expectedVersion],
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

function parseDecisionDocument(value: unknown): ApprovalDecision {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `Approval decision history value "${
        String(value)
      }" is invalid; expected a JSON object.`,
    );
  }
  return value as ApprovalDecision;
}
