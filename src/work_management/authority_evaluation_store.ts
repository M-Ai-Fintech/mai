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
    const inserted = await this.transaction.query(
      `INSERT INTO work_management.authority_evaluations (
         evaluation_id, evaluation_digest, approval_package_id,
         approval_package_version, approval_package_digest, tenant_id,
         workspace_id, deal_id, target_aggregate_type, target_aggregate_id,
         expected_target_version, evaluated_at, evaluation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (evaluation_id) DO NOTHING`,
      insertValues(parsed),
    );
    if (inserted.rowCount === 1) return;
    const current = await this.find(parsed.evaluationId);
    if (current === undefined) throw missingConflictRecord(parsed.evaluationId);
    assertEquivalent(current, parsed);
  }

  async find(evaluationId: string): Promise<AuthorityEvaluation | undefined> {
    const result = await this.transaction.query<
      { readonly evaluation: unknown }
    >(
      `SELECT evaluation FROM work_management.authority_evaluations
       WHERE evaluation_id = $1`,
      [evaluationId],
    );
    if (result.rows.length === 0) return undefined;
    if (result.rows.length !== 1) throw missingConflictRecord(evaluationId);
    return await parseAuthorityEvaluation(result.rows[0].evaluation);
  }
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
