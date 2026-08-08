import { assertEquals, assertRejects } from "@std/assert";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { createAuthorityDenial } from "../../src/work_management/authority_denial.ts";
import {
  actor,
  deal,
  targetCommandType,
  tenant,
  workspace,
} from "../../src/work_management/ids.ts";
import { PostgresWorkManagementRepository } from "../../src/work_management/repository_sql.ts";
import {
  workManagementMigrationOptions,
  workManagementMigrations,
} from "../../src/work_management/migrations/index.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "PostgreSQL authority denials persist once and replay after a fresh composition",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    const migrations = new PostgresMigrationRunner(pool);
    await migrations.apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ], workManagementMigrationOptions());
    const runner = new PostgresTransactionRunner(pool);
    const suffix = Date.now().toString();
    const denial = await createAuthorityDenial({
      stage: "pre_package",
      scope: {
        tenantId: tenant(`tenant_denial-${suffix}`),
        workspaceId: workspace(`workspace_denial-${suffix}`),
        dealId: deal(`deal_denial-${suffix}`),
      },
      requesterId: actor(`actor_requester-${suffix}`),
      namedApproverId: actor(`actor_approver-${suffix}`),
      requestedAction: targetCommandType("approve_deal"),
      reasons: ["NAMED_APPROVER_MISMATCH"],
      evaluatedAt: "2026-08-06T12:00:00.000Z",
      idempotencyIdentity: `denial-${suffix}`,
    });
    await runner.run(async (handle) => {
      const repository = new PostgresWorkManagementRepository(handle);
      await repository.appendAuthorityDenial(denial);
      await repository.appendAuthorityDenial(denial);
    });
    const replayed = await runner.run((handle) =>
      new PostgresWorkManagementRepository(handle).findAuthorityDenialById(
        denial.denialId,
      )
    );
    assertEquals(replayed?.denialDigest, denial.denialDigest);
    const count = await pool.query<{ readonly count: number }>(
      "SELECT count(*)::int AS count FROM work_management.authority_denials WHERE denial_id = $1",
      [denial.denialId],
    );
    assertEquals(count.rows[0].count, 1);
    await assertRejects(
      () =>
        pool.query(
          "UPDATE work_management.authority_denials SET denial_digest = 'tampered' WHERE denial_id = $1",
          [denial.denialId],
        ),
      Error,
      "append-only",
    );
    await pool.end();
  },
});
