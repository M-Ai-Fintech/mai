import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import { workManagementMigrations } from "../../src/work_management/migrations/index.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import { runMembershipReconciliationScenario } from "./membership_reconciliation_scenario.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "PostgreSQL membership reconciliation retains evidence and gates commands",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    const suffix = crypto.randomUUID().replaceAll("-", "");
    const scope = [
      `tenant_recon_${suffix}`,
      `workspace_recon_${suffix}`,
      `deal_recon_${suffix}`,
    ];
    try {
      const runner = new PostgresMigrationRunner(pool);
      await runner.apply([...platformMigrations, ...workManagementMigrations]);
      await runner.apply([...platformMigrations, ...workManagementMigrations]);
      await runMembershipReconciliationScenario(pool, scope, suffix);
    } finally {
      await pool.end();
    }
  },
});
