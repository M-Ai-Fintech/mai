import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  DecisionHistoryEntry,
  DecisionProjection,
  DecisionRecord,
  DecisionRequest,
  DiligenceScope,
  Finding,
  Impact,
} from "./model.ts";
import type { DiligenceDecisionsRepository } from "./repository_contract.ts";
export type { DiligenceDecisionsRepository } from "./repository_contract.ts";
import {
  rowDecisionRecord,
  rowDecisionRequest,
  rowFinding,
  rowHistory,
  rowImpact,
  rowProjection,
} from "./repository_rows.ts";
import type {
  DecisionHistoryId,
  DecisionRecordId,
  DecisionRequestId,
  FindingId,
  ImpactId,
} from "./ids.ts";
import { DiligenceDecisionError } from "./errors.ts";

export class PostgresDiligenceDecisionsRepository
  implements DiligenceDecisionsRepository {
  insertFinding(
    transaction: TransactionHandle,
    finding: Finding,
  ): Promise<void> {
    return insertProposal(
      transaction,
      "findings",
      "finding_id",
      finding.id,
      finding,
      finding.state,
      finding.version,
      finding.createdAt,
      finding.updatedAt,
    );
  }

  findFinding(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: FindingId,
  ): Promise<Finding | undefined> {
    return findPayload(transaction, "findings", "finding_id", scope, id).then((
      value,
    ) => value === undefined ? undefined : rowFinding(value));
  }

  updateFinding(
    transaction: TransactionHandle,
    finding: Finding,
    expectedVersion: number,
  ): Promise<void> {
    return updateProposal(
      transaction,
      "findings",
      "finding_id",
      finding.id,
      finding,
      finding.state,
      finding.version,
      finding.updatedAt,
      expectedVersion,
      finding.scope,
    );
  }

  insertImpact(transaction: TransactionHandle, impact: Impact): Promise<void> {
    return insertProposal(
      transaction,
      "impacts",
      "impact_id",
      impact.id,
      impact,
      impact.state,
      impact.version,
      impact.createdAt,
      impact.updatedAt,
      impact.findingId,
    );
  }

  findImpact(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: ImpactId,
  ): Promise<Impact | undefined> {
    return findPayload(transaction, "impacts", "impact_id", scope, id).then((
      value,
    ) => value === undefined ? undefined : rowImpact(value));
  }

  updateImpact(
    transaction: TransactionHandle,
    impact: Impact,
    expectedVersion: number,
  ): Promise<void> {
    return updateProposal(
      transaction,
      "impacts",
      "impact_id",
      impact.id,
      impact,
      impact.state,
      impact.version,
      impact.updatedAt,
      expectedVersion,
      impact.scope,
    );
  }

  async insertDecisionRequest(
    transaction: TransactionHandle,
    request: DecisionRequest,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO diligence_decisions.decision_requests
       (decision_request_id, tenant_id, workspace_id, deal_id, aggregate_version, state, payload, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        request.id,
        ...scopeValues(request.scope),
        request.version,
        request.state,
        JSON.stringify(request),
        request.createdAt,
        request.updatedAt,
      ],
    );
  }

  async findDecisionRequest(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: DecisionRequestId,
    forUpdate = false,
  ): Promise<DecisionRequest | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM diligence_decisions.decision_requests
       WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND decision_request_id=$4${
        forUpdate ? " FOR UPDATE" : ""
      }`,
      [...scopeValues(scope), id],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowDecisionRequest(result.rows[0].payload);
  }

  async updateDecisionRequest(
    transaction: TransactionHandle,
    request: DecisionRequest,
    expectedVersion: number,
  ): Promise<void> {
    const result = await transaction.query(
      `UPDATE diligence_decisions.decision_requests
       SET aggregate_version=$5, state=$6, payload=$7, updated_at=$8
       WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND decision_request_id=$4 AND aggregate_version=$9`,
      [
        ...scopeValues(request.scope),
        request.id,
        request.version,
        request.state,
        JSON.stringify(request),
        request.updatedAt,
        expectedVersion,
      ],
    );
    assertUpdated(result.rowCount, request.id, expectedVersion);
  }

  async insertDecisionRecord(
    transaction: TransactionHandle,
    record: DecisionRecord,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO diligence_decisions.decision_records
       (decision_record_id, decision_request_id, tenant_id, workspace_id, deal_id, request_version, payload, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.id,
        record.requestId,
        ...scopeValues(record.scope),
        record.requestVersion,
        JSON.stringify(record),
        record.recordedAt,
      ],
    );
  }

  async findDecisionRecord(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: DecisionRecordId,
  ): Promise<DecisionRecord | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM diligence_decisions.decision_records
       WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND decision_record_id=$4`,
      [...scopeValues(scope), id],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowDecisionRecord(result.rows[0].payload);
  }

  async insertProjection(
    transaction: TransactionHandle,
    projection: DecisionProjection,
    scope: DiligenceScope,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO diligence_decisions.decision_projections
       (decision_request_id, tenant_id, workspace_id, deal_id, current_record_id, state, projection_version, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        projection.requestId,
        ...scopeValues(scope),
        projection.currentRecordId,
        projection.state,
        projection.version,
        projection.updatedAt,
      ],
    );
  }

  async findProjection(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    requestId: DecisionRequestId,
    forUpdate = false,
  ): Promise<DecisionProjection | undefined> {
    const result = await transaction.query<ProjectionRow>(
      `SELECT decision_request_id AS "requestId", current_record_id AS "currentRecordId", state,
         projection_version AS version, updated_at AS "updatedAt"
       FROM diligence_decisions.decision_projections
       WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND decision_request_id=$4${
        forUpdate ? " FOR UPDATE" : ""
      }`,
      [...scopeValues(scope), requestId],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowProjection(result.rows[0] as unknown as Record<string, unknown>);
  }

  async updateProjection(
    transaction: TransactionHandle,
    projection: DecisionProjection,
    scope: DiligenceScope,
    expectedVersion: number,
  ): Promise<void> {
    const result = await transaction.query(
      `UPDATE diligence_decisions.decision_projections
       SET current_record_id=$5, state=$6, projection_version=$7, updated_at=$8
       WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND decision_request_id=$4 AND projection_version=$9`,
      [
        ...scopeValues(scope),
        projection.requestId,
        projection.currentRecordId,
        projection.state,
        projection.version,
        projection.updatedAt,
        expectedVersion,
      ],
    );
    assertUpdated(result.rowCount, projection.requestId, expectedVersion);
  }

  async insertHistory(
    transaction: TransactionHandle,
    entry: DecisionHistoryEntry,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO diligence_decisions.decision_history
       (history_id, decision_request_id, record_id, replacement_record_id, tenant_id, workspace_id, deal_id, history_kind, expected_projection_version, basis_digest, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entry.id,
        entry.requestId,
        entry.recordId,
        entry.replacementRecordId ?? null,
        ...scopeValues(entry.scope),
        entry.kind,
        entry.expectedProjectionVersion,
        entry.basisDigest,
        JSON.stringify(entry),
        entry.createdAt,
      ],
    );
  }

  async findHistory(
    transaction: TransactionHandle,
    scope: DiligenceScope,
    id: DecisionHistoryId,
  ): Promise<DecisionHistoryEntry | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM diligence_decisions.decision_history
       WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND history_id=$4`,
      [...scopeValues(scope), id],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowHistory(result.rows[0].payload);
  }
}

interface ProjectionRow {
  readonly requestId: string;
  readonly currentRecordId: string;
  readonly state: string;
  readonly version: string | number;
  readonly updatedAt: Date | string;
}

type ProposalTable = "findings" | "impacts";

async function insertProposal(
  transaction: TransactionHandle,
  table: ProposalTable,
  idColumn: "finding_id" | "impact_id",
  id: string,
  proposal: Finding | Impact,
  state: string,
  version: number,
  createdAt: Date,
  updatedAt: Date,
  findingId?: string,
): Promise<void> {
  const columns = findingId === undefined
    ? `${idColumn}, tenant_id, workspace_id, deal_id, aggregate_version, state, payload, created_at, updated_at`
    : `${idColumn}, finding_id, tenant_id, workspace_id, deal_id, aggregate_version, state, payload, created_at, updated_at`;
  const values = findingId === undefined
    ? [
      id,
      ...scopeValues(proposal.scope),
      version,
      state,
      JSON.stringify(proposal),
      createdAt,
      updatedAt,
    ]
    : [
      id,
      findingId,
      ...scopeValues(proposal.scope),
      version,
      state,
      JSON.stringify(proposal),
      createdAt,
      updatedAt,
    ];
  await transaction.query(
    `INSERT INTO diligence_decisions.${table} (${columns}) VALUES (${
      placeholders(values.length)
    })`,
    values,
  );
}

async function updateProposal(
  transaction: TransactionHandle,
  table: ProposalTable,
  idColumn: "finding_id" | "impact_id",
  id: string,
  proposal: Finding | Impact,
  state: string,
  version: number,
  updatedAt: Date,
  expectedVersion: number,
  scope: DiligenceScope,
): Promise<void> {
  const result = await transaction.query(
    `UPDATE diligence_decisions.${table}
     SET aggregate_version=$5, state=$6, payload=$7, updated_at=$8
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND ${idColumn}=$4 AND aggregate_version=$9`,
    [
      ...scopeValues(scope),
      id,
      version,
      state,
      JSON.stringify(proposal),
      updatedAt,
      expectedVersion,
    ],
  );
  assertUpdated(result.rowCount, id, expectedVersion);
}

async function findPayload(
  transaction: TransactionHandle,
  table: ProposalTable,
  idColumn: "finding_id" | "impact_id",
  scope: DiligenceScope,
  id: string,
): Promise<unknown | undefined> {
  const result = await transaction.query<{ payload: unknown }>(
    `SELECT payload FROM diligence_decisions.${table}
     WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND ${idColumn}=$4`,
    [...scopeValues(scope), id],
  );
  return result.rows[0]?.payload;
}

function scopeValues(scope: DiligenceScope): readonly string[] {
  return [scope.tenantId, scope.workspaceId, scope.dealId];
}

function placeholders(count: number): string {
  return Array.from({ length: count }, (_, index) => `$${index + 1}`).join(
    ", ",
  );
}

function assertUpdated(
  rowCount: number | null,
  id: string,
  expectedVersion: number,
): void {
  if (rowCount === 1) return;
  throw new DiligenceDecisionError(
    "VERSION_CONFLICT",
    `Diligence aggregate "${id}" was not at expected version "${expectedVersion}"; expected one optimistic-concurrency update.`,
  );
}
