import type { TenantId } from "../../src/shared/contracts/identifiers.ts";
import { createPostgresIntegrationTestPool } from "../platform/support/postgres.ts";

type IntegrationPool = ReturnType<typeof createPostgresIntegrationTestPool>;
type InvalidationState = {
  readonly state: string;
  readonly attemptCount: number;
  readonly completed: boolean;
};

export function count(
  pool: IntegrationPool,
  table: string,
  tenantId: TenantId,
): Promise<string> {
  return pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table} WHERE tenant_id = $1`,
    [tenantId],
  ).then((result) => result.rows[0].count);
}

export async function cleanRows(
  pool: IntegrationPool,
  tenantId: TenantId,
): Promise<void> {
  for (
    const table of [
      "portal_receipts",
      "portal_submissions",
      "external_grants",
      "participations",
      "command_claims",
      "session_invalidations",
    ]
  ) {
    await pool.query(`DELETE FROM deal_access.${table} WHERE tenant_id = $1`, [
      tenantId,
    ]);
  }
  await pool.query("DELETE FROM platform.outbox WHERE tenant_id = $1", [
    tenantId,
  ]);
}

export function invalidationState(
  pool: IntegrationPool,
  tenantId: TenantId,
  target: { readonly grantId: string } | { readonly participationId: string },
): Promise<InvalidationState> {
  const column = "grantId" in target ? "grant_id" : "participation_id";
  const id = "grantId" in target ? target.grantId : target.participationId;
  return pool.query<InvalidationState>(
    `SELECT state, attempt_count AS "attemptCount", completed_at IS NOT NULL AS completed
     FROM deal_access.session_invalidations
     WHERE tenant_id = $1 AND ${column} = $2`,
    [tenantId, id],
  ).then((result) => result.rows[0]);
}
