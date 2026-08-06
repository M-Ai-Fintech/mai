import {
  type AuthorityEvaluation,
  parseAuthorityEvaluation,
} from "./authority_evaluation.ts";
import { stableSerialize, WorkManagementError } from "./model.ts";

export interface AuthorityEvaluationStore {
  append(value: AuthorityEvaluation): Promise<void>;
  find(evaluationId: string): Promise<AuthorityEvaluation | undefined>;
}

export interface AuthorityEvaluationSqlPort {
  query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{
    readonly rows: readonly Row[];
    readonly rowCount?: number | null;
  }>;
}

/** Test adapter with immutable exact-replay behavior. */
export class InMemoryAuthorityEvaluationStore
  implements AuthorityEvaluationStore {
  private readonly records = new Map<string, AuthorityEvaluation>();

  async append(value: AuthorityEvaluation): Promise<void> {
    const parsed = await parseAuthorityEvaluation(value);
    const current = this.records.get(parsed.evaluationId);
    if (current === undefined) {
      this.records.set(parsed.evaluationId, parsed);
      return;
    }
    assertEquivalent(current, parsed);
  }

  find(evaluationId: string): Promise<AuthorityEvaluation | undefined> {
    return Promise.resolve(this.records.get(evaluationId));
  }

  count(): number {
    return this.records.size;
  }
}

/** PostgreSQL adapter for the coordinator-owned additive authority table. */
export class PostgresAuthorityEvaluationStore
  implements AuthorityEvaluationStore {
  constructor(private readonly transaction: AuthorityEvaluationSqlPort) {}

  async append(value: AuthorityEvaluation): Promise<void> {
    const parsed = await parseAuthorityEvaluation(value);
    let inserted: { readonly rowCount?: number | null };
    try {
      inserted = await this.transaction.query(
        `INSERT INTO work_management.authority_evaluations (
         evaluation_id, evaluation_digest, approval_package_id,
         approval_package_version, approval_package_digest, tenant_id,
         workspace_id, deal_id, target_aggregate_type, target_aggregate_id,
         expected_target_version, policy_version, snapshot_reference,
         command_type, approver_id, facts, limits, limit_results, outcome,
         reasons, effective_at, expires_at, evaluated_at, evaluation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (evaluation_id) DO NOTHING`,
        insertValues(parsed),
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const conflicting = await this.findByDigest(parsed.digest);
      if (conflicting !== undefined) assertEquivalent(conflicting, parsed);
      throw new WorkManagementError(
        "REFERENCE_MISMATCH",
        `Authority evaluation digest "${parsed.digest}" conflicts with a different immutable evaluation; expected exact semantic replay.`,
      );
    }
    if (inserted.rowCount === 1) return;
    const current = await this.find(parsed.evaluationId);
    if (current === undefined) throw missingConflictRecord(parsed.evaluationId);
    assertEquivalent(current, parsed);
  }

  async find(evaluationId: string): Promise<AuthorityEvaluation | undefined> {
    const result = await this.transaction.query<
      EvaluationRow
    >(
      `SELECT evaluation, evaluation_digest AS "evaluationDigest",
          approval_package_id AS "packageId", approval_package_version AS "packageVersion",
          approval_package_digest AS "packageDigest", tenant_id AS "tenantId",
          workspace_id AS "workspaceId", deal_id AS "dealId",
          target_aggregate_type AS "targetAggregateType", target_aggregate_id AS "targetAggregateId",
          expected_target_version AS "expectedTargetVersion", policy_version AS "policyVersion",
          snapshot_reference AS "snapshotReference", command_type AS "commandType",
          approver_id AS "approverId", outcome, effective_at AS "effectiveAt",
          expires_at AS "expiresAt", evaluated_at AS "evaluatedAt"
       FROM work_management.authority_evaluations
       WHERE evaluation_id = $1`,
      [evaluationId],
    );
    if (result.rows.length === 0) return undefined;
    if (result.rows.length !== 1) throw missingConflictRecord(evaluationId);
    const parsed = await parseAuthorityEvaluation(result.rows[0].evaluation);
    assertNormalizedRow(result.rows[0], parsed);
    return parsed;
  }

  private async findByDigest(
    evaluationDigest: string,
  ): Promise<AuthorityEvaluation | undefined> {
    const result = await this.transaction.query<
      { readonly evaluationId: string }
    >(
      `SELECT evaluation_id AS "evaluationId"
       FROM work_management.authority_evaluations
       WHERE evaluation_digest = $1`,
      [evaluationDigest],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : await this.find(row.evaluationId);
  }
}

interface EvaluationRow {
  readonly evaluation: unknown;
  readonly evaluationDigest: string;
  readonly packageId: string;
  readonly packageVersion: number | string;
  readonly packageDigest: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly dealId: string;
  readonly targetAggregateType: string;
  readonly targetAggregateId: string;
  readonly expectedTargetVersion: number | string;
  readonly policyVersion: string;
  readonly snapshotReference: string;
  readonly commandType: string;
  readonly approverId: string;
  readonly outcome: string;
  readonly effectiveAt: string | Date;
  readonly expiresAt: string | Date;
  readonly evaluatedAt: string | Date;
}

function assertNormalizedRow(
  row: EvaluationRow,
  value: AuthorityEvaluation,
): void {
  const normalized = {
    evaluationDigest: row.evaluationDigest,
    packageId: row.packageId,
    packageVersion: Number(row.packageVersion),
    packageDigest: row.packageDigest,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    dealId: row.dealId,
    targetAggregateType: row.targetAggregateType,
    targetAggregateId: row.targetAggregateId,
    expectedTargetVersion: Number(row.expectedTargetVersion),
    policyVersion: row.policyVersion,
    snapshotReference: row.snapshotReference,
    commandType: row.commandType,
    approverId: row.approverId,
    outcome: row.outcome,
    effectiveAt: instant(row.effectiveAt),
    expiresAt: instant(row.expiresAt),
    evaluatedAt: instant(row.evaluatedAt),
  };
  const expected = {
    evaluationDigest: value.digest,
    packageId: value.requirement.packageId,
    packageVersion: value.requirement.packageVersion,
    packageDigest: value.requirement.packageDigest,
    tenantId: value.scope.tenantId,
    workspaceId: value.scope.workspaceId,
    dealId: value.scope.dealId,
    targetAggregateType: value.targetAggregateType,
    targetAggregateId: value.targetAggregateId,
    expectedTargetVersion: value.expectedTargetVersion,
    policyVersion: value.policyVersion,
    snapshotReference: value.snapshotReference,
    commandType: value.commandType,
    approverId: value.approverId,
    outcome: value.outcome,
    effectiveAt: value.window.effectiveAt,
    expiresAt: value.window.expiresAt,
    evaluatedAt: value.evaluatedAt,
  };
  if (stableSerialize(normalized) !== stableSerialize(expected)) {
    throw new WorkManagementError(
      "REFERENCE_MISMATCH",
      `Authority evaluation "${value.evaluationId}" normalized columns conflict with its immutable JSON proof; expected exact semantic equivalence.`,
    );
  }
}

function instant(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    (error as { readonly code?: string }).code === "23505";
}

function insertValues(value: AuthorityEvaluation): readonly unknown[] {
  return [
    value.evaluationId,
    value.digest,
    value.requirement.packageId,
    value.requirement.packageVersion,
    value.requirement.packageDigest,
    value.scope.tenantId,
    value.scope.workspaceId,
    value.scope.dealId,
    value.targetAggregateType,
    value.targetAggregateId,
    value.expectedTargetVersion,
    value.policyVersion,
    value.snapshotReference,
    value.commandType,
    value.approverId,
    JSON.stringify(value.facts),
    JSON.stringify(value.limits),
    JSON.stringify(value.limitResults),
    value.outcome,
    JSON.stringify(value.reasons),
    value.window.effectiveAt,
    value.window.expiresAt,
    value.evaluatedAt,
    JSON.stringify(value),
  ];
}

function assertEquivalent(
  current: AuthorityEvaluation,
  candidate: AuthorityEvaluation,
): void {
  if (stableSerialize(current) === stableSerialize(candidate)) return;
  throw new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Authority evaluation "${candidate.evaluationId}" conflicts with an immutable record; expected exact replay of digest "${current.digest}".`,
  );
}

function missingConflictRecord(evaluationId: string): WorkManagementError {
  return new WorkManagementError(
    "REFERENCE_MISMATCH",
    `Authority evaluation "${evaluationId}" could not be resolved after an immutable-record conflict; expected exactly one persisted evaluation.`,
  );
}
