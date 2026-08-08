import type { ContextMigration } from "../platform/persistence/migration.ts";
import type pg from "pg";

/**
 * Applies the explicit compatibility bridge for the published Work Management
 * corrective upgrade. The bridge is inert unless the historical trigger exists.
 *
 * @example await prepareWorkManagementMigration(client, migration)
 */
export async function prepareWorkManagementMigration(
  client: pg.PoolClient,
  migration: ContextMigration,
): Promise<void> {
  if (migration.id !== "work_management-0009-corrective-upgrade") return;
  const result = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('work_management.membership_reconciliation_activation') IS NOT NULL AS exists",
  );
  if (result.rows[0]?.exists !== true) return;
  await client.query(
    "DROP TRIGGER IF EXISTS membership_activation_no_direct_mutation ON work_management.membership_reconciliation_activation",
  );
}
