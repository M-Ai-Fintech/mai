import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { DealAccessScope } from "./model.ts";
import { DealAccessInvariantError } from "./errors.ts";
import type {
  SessionInvalidationRecord,
  SessionInvalidationTarget,
} from "./repository.ts";
import {
  type SessionInvalidationRow,
  toSessionInvalidation,
} from "./repository_postgres_rows.ts";

export class PostgresSessionInvalidationStore {
  constructor(private readonly transaction: TransactionHandle) {}

  async record(record: SessionInvalidationRecord): Promise<void> {
    if (record.grantId === undefined && record.participationId === undefined) {
      throw new DealAccessInvariantError(
        `Session invalidation "${record.invalidationId}" has no target; expected a grant or participation ID.`,
      );
    }
    if (
      record.state !== "pending" || record.attemptCount !== 0 ||
      record.completedAt !== undefined
    ) {
      throw new DealAccessInvariantError(
        `Session invalidation "${record.invalidationId}" has initial state "${record.state}" and attempt count "${record.attemptCount}"; expected pending state with zero attempts.`,
      );
    }
    await this.transaction.query(
      `INSERT INTO deal_access.session_invalidations (
         invalidation_id, tenant_id, workspace_id, deal_id, grant_id,
         participation_id, reason, state, attempt_count, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0, CURRENT_TIMESTAMP)`,
      [
        record.invalidationId,
        record.scope.tenantId,
        record.scope.workspaceId,
        record.scope.dealId,
        record.grantId ?? null,
        record.participationId ?? null,
        record.reason,
      ],
    );
  }

  async listPending(
    scope: DealAccessScope,
    target?: SessionInvalidationTarget,
  ): Promise<SessionInvalidationRecord[]> {
    const result = await this.transaction.query<SessionInvalidationRow>(
      `SELECT invalidation_id AS "invalidationId",
         tenant_id AS "tenantId", workspace_id AS "workspaceId",
         deal_id AS "dealId", grant_id AS "grantId",
         participation_id AS "participationId", reason, state,
         attempt_count AS "attemptCount", last_error AS "lastError",
         completed_at AS "completedAt"
       FROM deal_access.session_invalidations
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND state = 'pending'
         AND ($4::text IS NULL OR grant_id = $4)
         AND ($5::text IS NULL OR participation_id = $5)
         AND ($6::text IS NULL OR reason = $6)
       ORDER BY invalidation_id`,
      [
        scope.tenantId,
        scope.workspaceId,
        scope.dealId,
        target?.grantId ?? null,
        target?.participationId ?? null,
        target?.reason ?? null,
      ],
    );
    return result.rows.map(toSessionInvalidation);
  }

  async recordAttempt(
    scope: DealAccessScope,
    invalidationId: string,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE deal_access.session_invalidations
       SET attempt_count = attempt_count + 1, last_error = NULL
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND invalidation_id = $4 AND state = 'pending'`,
      [scope.tenantId, scope.workspaceId, scope.dealId, invalidationId],
    );
    if (result.rowCount === 1) return;
    await this.assertExists(scope, invalidationId);
  }

  async markFailure(
    scope: DealAccessScope,
    invalidationId: string,
    error: string,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE deal_access.session_invalidations
       SET last_error = $5
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND invalidation_id = $4 AND state = 'pending'`,
      [
        scope.tenantId,
        scope.workspaceId,
        scope.dealId,
        invalidationId,
        error.slice(0, 1000),
      ],
    );
    if (result.rowCount === 1) return;
    await this.assertExists(scope, invalidationId);
  }

  async complete(
    scope: DealAccessScope,
    invalidationId: string,
    completedAt: string,
  ): Promise<void> {
    const result = await this.transaction.query(
      `UPDATE deal_access.session_invalidations
       SET state = 'completed', completed_at = $5, last_error = NULL
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND invalidation_id = $4 AND state = 'pending'`,
      [
        scope.tenantId,
        scope.workspaceId,
        scope.dealId,
        invalidationId,
        completedAt,
      ],
    );
    if (result.rowCount === 1) return;
    await this.assertCompleted(scope, invalidationId);
  }

  private async assertExists(
    scope: DealAccessScope,
    invalidationId: string,
  ): Promise<void> {
    const result = await this.transaction.query<{ state: string }>(
      `SELECT state FROM deal_access.session_invalidations
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND invalidation_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, invalidationId],
    );
    if (result.rows[0] !== undefined) return;
    throw new DealAccessInvariantError(
      `Session invalidation "${invalidationId}" was not found in scope "${scope.dealId}"; expected a durable record.`,
    );
  }

  private async assertCompleted(
    scope: DealAccessScope,
    invalidationId: string,
  ): Promise<void> {
    const result = await this.transaction.query<{ state: string }>(
      `SELECT state FROM deal_access.session_invalidations
       WHERE tenant_id = $1 AND workspace_id = $2 AND deal_id = $3
         AND invalidation_id = $4`,
      [scope.tenantId, scope.workspaceId, scope.dealId, invalidationId],
    );
    if (result.rows[0]?.state === "completed") return;
    throw new DealAccessInvariantError(
      `Session invalidation "${invalidationId}" could not complete in scope "${scope.dealId}"; expected a pending record.`,
    );
  }
}
