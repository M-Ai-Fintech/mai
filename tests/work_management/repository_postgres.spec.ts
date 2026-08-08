import { assertEquals, assertRejects } from "@std/assert";
import { createWorkstream } from "../../src/work_management/workstreams.ts";
import {
  actor,
  aggregateVersion,
  deal,
  tenant,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import {
  InMemoryWorkManagementRepository,
  WorkManagementVersionConflictError,
} from "../../src/work_management/repository.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  workManagementMigrationOptions,
  workManagementMigrations,
} from "../../src/work_management/migrations/index.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import { PostgresWorkManagementRepository } from "../../src/work_management/repository_sql.ts";

const scope = {
  tenantId: tenant("tenant_repo"),
  workspaceId: workspace("workspace_repo"),
  dealId: deal("deal_repo"),
};

Deno.test("in-memory Work Management repository enforces scoped optimistic versions", async () => {
  const repository = new InMemoryWorkManagementRepository();
  const value = createWorkstream({
    ...scope,
    id: workstreamId("workstream_repo"),
    name: "Repository",
    ownerId: actor("actor_owner"),
    now: "2026-08-06T12:00:00.000Z",
  });
  await repository.saveWorkstream(value, 0);
  assertEquals(
    (await repository.findWorkstream(scope, value.id))?.version,
    value.version,
  );
  await assertRejects(
    () =>
      repository.saveWorkstream({ ...value, version: aggregateVersion(2) }, 0),
    WorkManagementVersionConflictError,
  );
});

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "PostgreSQL Work Management repository persists scoped rows",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ], workManagementMigrationOptions());
    const runner = new PostgresTransactionRunner(pool);
    const value = createWorkstream({
      ...scope,
      id: workstreamId(`workstream_pg-${Date.now()}`),
      name: "PostgreSQL repository",
      ownerId: actor("actor_owner"),
      now: new Date().toISOString(),
    });
    await runner.run(async (transaction) => {
      const repository = new PostgresWorkManagementRepository(transaction);
      await repository.saveWorkstream(value, 0);
      assertEquals(
        (await repository.findWorkstream(scope, value.id))?.id,
        value.id,
      );
    });
    await pool.end();
  },
});
