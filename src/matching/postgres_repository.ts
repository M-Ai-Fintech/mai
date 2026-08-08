import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  CandidateProjection,
  CandidateRestriction,
  MatchingConflict,
  MatchingCriteria,
  MatchingRun,
  MatchingScope,
  OutreachAuthorization,
  ShortlistDecision,
} from "./model.ts";
import { sameMatchingScope } from "./model.ts";
import type {
  CandidateId,
  ConflictId,
  CriteriaId,
  OutreachAuthorizationId,
  RestrictionId,
  RunId,
  ShortlistDecisionId,
} from "./ids.ts";
import type {
  MatchingRepository,
  MatchingStoredAggregate,
} from "./repository.ts";

export class PostgresMatchingRepository implements MatchingRepository {
  async createCriteria(
    tx: TransactionHandle,
    value: MatchingCriteria,
  ): Promise<void> {
    await insertAggregate(tx, "criteria", value);
  }
  async findCriteria(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: CriteriaId,
  ): Promise<MatchingCriteria | undefined> {
    return await findAggregate(tx, "criteria", scope, id);
  }
  async updateCriteria(
    tx: TransactionHandle,
    value: MatchingCriteria,
    expectedVersion: number,
  ): Promise<void> {
    await updateAggregate(tx, "criteria", value, expectedVersion);
  }
  async createRun(tx: TransactionHandle, value: MatchingRun): Promise<void> {
    await insertAggregate(tx, "runs", value);
  }
  async findRun(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: RunId,
  ): Promise<MatchingRun | undefined> {
    return await findAggregate(tx, "runs", scope, id);
  }
  async updateRun(
    tx: TransactionHandle,
    value: MatchingRun,
    expectedVersion: number,
  ): Promise<void> {
    await updateAggregate(tx, "runs", value, expectedVersion);
  }

  async replaceCandidates(
    tx: TransactionHandle,
    scope: MatchingScope,
    runId: RunId,
    values: readonly CandidateProjection[],
  ): Promise<void> {
    for (const value of values) {
      if (!sameMatchingScope(value.scope, scope) || value.runId !== runId) {
        throw new Error(
          `Candidate projection "${value.id}" is outside run "${runId}" scope; expected one matching scope.`,
        );
      }
      const existing = await findAggregate<CandidateProjection>(
        tx,
        "candidate_projections",
        scope,
        value.id,
      );
      await upsertCandidate(
        tx,
        existing === undefined ? value : {
          ...value,
          restrictionState: existing.restrictionState,
          conflictState: existing.conflictState,
        },
      );
    }
  }

  async findCandidate(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: CandidateId,
  ): Promise<CandidateProjection | undefined> {
    return await findAggregate(tx, "candidate_projections", scope, id);
  }
  async listCandidates(
    tx: TransactionHandle,
    scope: MatchingScope,
    runId: RunId,
  ): Promise<readonly CandidateProjection[]> {
    const result = await tx.query<{ payload: unknown }>(
      `SELECT payload FROM matching.candidate_projections
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND payload->>'runId' = $4 ORDER BY aggregate_id`,
      [scope.tenantId, scope.workspaceId, scope.dealId, runId],
    );
    return result.rows.map((row) =>
      restoreAggregate<CandidateProjection>(row.payload)
    );
  }
  async updateCandidate(
    tx: TransactionHandle,
    value: CandidateProjection,
    expectedVersion: number,
  ): Promise<void> {
    await updateAggregate(tx, "candidate_projections", value, expectedVersion);
  }
  async createConflict(
    tx: TransactionHandle,
    value: MatchingConflict,
  ): Promise<void> {
    await insertAggregate(tx, "conflicts", value);
  }
  async findConflict(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: ConflictId,
  ): Promise<MatchingConflict | undefined> {
    return await findAggregate(tx, "conflicts", scope, id);
  }
  async updateConflict(
    tx: TransactionHandle,
    value: MatchingConflict,
    expectedVersion: number,
  ): Promise<void> {
    await updateAggregate(tx, "conflicts", value, expectedVersion);
  }
  async createRestriction(
    tx: TransactionHandle,
    value: CandidateRestriction,
  ): Promise<void> {
    await insertAggregate(tx, "restrictions", value);
  }
  async findRestriction(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: RestrictionId,
  ): Promise<CandidateRestriction | undefined> {
    return await findAggregate(tx, "restrictions", scope, id);
  }
  async updateRestriction(
    tx: TransactionHandle,
    value: CandidateRestriction,
    expectedVersion: number,
  ): Promise<void> {
    await updateAggregate(tx, "restrictions", value, expectedVersion);
  }
  async createShortlistDecision(
    tx: TransactionHandle,
    value: ShortlistDecision,
  ): Promise<void> {
    await insertAggregate(tx, "shortlist_decisions", value);
  }
  async findShortlistDecision(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: ShortlistDecisionId,
  ): Promise<ShortlistDecision | undefined> {
    return await findAggregate(tx, "shortlist_decisions", scope, id);
  }
  async updateShortlistDecision(
    tx: TransactionHandle,
    value: ShortlistDecision,
    expectedVersion: number,
  ): Promise<void> {
    await updateAggregate(tx, "shortlist_decisions", value, expectedVersion);
  }
  async createOutreachAuthorization(
    tx: TransactionHandle,
    value: OutreachAuthorization,
  ): Promise<void> {
    await insertAggregate(tx, "outreach_authorizations", value);
  }
  async findOutreachAuthorization(
    tx: TransactionHandle,
    scope: MatchingScope,
    id: OutreachAuthorizationId,
  ): Promise<OutreachAuthorization | undefined> {
    return await findAggregate(tx, "outreach_authorizations", scope, id);
  }
  async updateOutreachAuthorization(
    tx: TransactionHandle,
    value: OutreachAuthorization,
    expectedVersion: number,
  ): Promise<void> {
    await updateAggregate(
      tx,
      "outreach_authorizations",
      value,
      expectedVersion,
    );
  }
}

const TABLES = [
  "criteria",
  "runs",
  "candidate_projections",
  "conflicts",
  "restrictions",
  "shortlist_decisions",
  "outreach_authorizations",
] as const;
type MatchingTable = (typeof TABLES)[number];

async function insertAggregate(
  tx: TransactionHandle,
  table: MatchingTable,
  value: MatchingStoredAggregate,
): Promise<void> {
  await tx.query(
    `INSERT INTO matching.${table} (
       aggregate_id, tenant_id, workspace_id, deal_id, aggregate_version,
       payload, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      value.id,
      value.scope.tenantId,
      value.scope.workspaceId,
      value.scope.dealId,
      value.version,
      JSON.stringify(value),
      value.createdAt,
      value.updatedAt,
    ],
  );
}

async function updateAggregate(
  tx: TransactionHandle,
  table: MatchingTable,
  value: MatchingStoredAggregate,
  expectedVersion: number,
): Promise<void> {
  const result = await tx.query(
    `UPDATE matching.${table}
     SET aggregate_version = $6, payload = $7, updated_at = $8
     WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
       AND aggregate_id = $4 AND aggregate_version = $5`,
    [
      value.scope.tenantId,
      value.scope.workspaceId,
      value.scope.dealId,
      value.id,
      expectedVersion,
      value.version,
      JSON.stringify(value),
      value.updatedAt,
    ],
  );
  if (result.rowCount === 1) return;
  throw new Error(
    `Matching aggregate "${value.id}" version update failed; expected version "${expectedVersion}" in its tenant, workspace, and deal scope.`,
  );
}

async function upsertCandidate(
  tx: TransactionHandle,
  value: CandidateProjection,
): Promise<void> {
  await tx.query(
    `INSERT INTO matching.candidate_projections (
       aggregate_id, tenant_id, workspace_id, deal_id, aggregate_version,
       payload, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tenant_id, workspace_id, deal_id, aggregate_id)
     DO UPDATE SET aggregate_version = EXCLUDED.aggregate_version,
       payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
    [
      value.id,
      value.scope.tenantId,
      value.scope.workspaceId,
      value.scope.dealId,
      value.version,
      JSON.stringify(value),
      value.createdAt,
      value.updatedAt,
    ],
  );
}

async function findAggregate<T extends MatchingStoredAggregate>(
  tx: TransactionHandle,
  table: MatchingTable,
  scope: MatchingScope,
  id: string,
): Promise<T | undefined> {
  const result = await tx.query<{ payload: unknown }>(
    `SELECT payload FROM matching.${table}
     WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
       AND aggregate_id = $4`,
    [scope.tenantId, scope.workspaceId, scope.dealId, id],
  );
  const row = result.rows[0];
  return row === undefined ? undefined : restoreAggregate<T>(row.payload);
}

function restoreAggregate<T extends MatchingStoredAggregate>(
  payload: unknown,
): T {
  const value = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (typeof value !== "object" || value === null) {
    throw new Error(
      `Matching payload "${
        String(payload)
      }" is invalid; expected a JSON object.`,
    );
  }
  const aggregate = value as Record<string, unknown>;
  return {
    ...aggregate,
    scope: { ...(aggregate.scope as Record<string, unknown>) },
    createdAt: new Date(String(aggregate.createdAt)),
    updatedAt: new Date(String(aggregate.updatedAt)),
  } as unknown as T;
}
