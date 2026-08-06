import { assertEquals, assertRejects } from "@std/assert";
import { type AuthorizationDecision } from "../../src/platform/authz/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { createPostgresWorkManagementTestComposition } from "../../src/work_management/composition.ts";
import {
  actor,
  deal,
  tenant,
  workspace,
  workstreamId,
} from "../../src/work_management/ids.ts";
import { workManagementMigrations } from "../../src/work_management/migrations/index.ts";
import {
  workManagementCorrectiveMigration,
  workManagementMigration,
} from "../../src/work_management/migrations/index.ts";
import type { WorkManagementAuditPort } from "../../src/work_management/transactional_effects.ts";
import {
  createPostgresIntegrationTestPool,
  ensureWorkManagementTestRoles,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "PostgreSQL Work Management migrations apply twice and rollback mode retains evidence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    const migrations = new PostgresMigrationRunner(pool);
    await migrations.apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ]);
    await migrations.apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ]);
    const ledger = await pool.query(
      "SELECT count(*)::int AS count FROM platform.migration_ledger WHERE context_owner = 'work_management'",
    );
    assertEquals(ledger.rows[0].count, 10);
    const suffix = Date.now().toString();
    const eventId = `work_event_migration-${suffix}`;
    await pool.query(
      `INSERT INTO work_management.aggregate_history (
         event_id, tenant_id, workspace_id, deal_id, aggregate_type,
         aggregate_id, aggregate_version, event_type, actor_id, actor_kind,
         correlation_id, payload, occurred_at
       ) VALUES ($1,$2,$3,$4,'workstream',$5,1,'workstream.created',$6,'human',$7,'{}',now())`,
      [
        eventId,
        "tenant_migration-pg",
        "workspace_migration-pg",
        "deal_migration-pg",
        `workstream_migration-${suffix}`,
        "actor_migration-pg",
        "cor_migration_pg",
      ],
    );
    await assertRejects(
      () =>
        pool.query(
          "UPDATE work_management.aggregate_history SET payload='{}' WHERE event_id=$1",
          [eventId],
        ),
      Error,
      "append-only",
    );
    const runner = new PostgresTransactionRunner(pool);
    const readOnly = createPostgresWorkManagementTestComposition({
      mode: "read_only",
      transactions: runner,
      audit: new UnusedAuditPort(),
      authorization: { authorize: allow },
      clock: { now: () => "2026-08-06T12:00:00.000Z" },
    });
    const parsed = (await import("../../src/platform/api/v1.ts"))
      .parseIdempotencyKey(`idem_migration-${suffix}`);
    if (!parsed.ok) throw new Error("Invalid migration test idempotency key.");
    await assertRejects(
      () =>
        readOnly.service.createWorkstream({
          context: {
            actorId: actor("actor_migration-pg"),
            tenantId: tenant("tenant_migration-pg"),
            workspaceId: workspace("workspace_migration-pg"),
            dealId: deal("deal_migration-pg"),
            correlationId:
              "cor_migration_pg" as import("../../src/platform/api/v1.ts").CorrelationId,
            origin: "http",
          },
          actor: {
            id: actor("actor_migration-pg"),
            kind: "human",
            state: "active",
          },
          scope: {
            tenantId: tenant("tenant_migration-pg"),
            workspaceId: workspace("workspace_migration-pg"),
            dealId: deal("deal_migration-pg"),
          },
          id: workstreamId(`workstream_disabled-${suffix}`),
          idempotencyKey: parsed.value,
          name: "Disabled",
          ownerId: actor("actor_migration-pg"),
        }),
      Error,
      "read_only",
    );
    const retained = await pool.query(
      "SELECT count(*)::int AS count FROM work_management.aggregate_history WHERE event_id=$1",
      [eventId],
    );
    assertEquals(retained.rows[0].count, 1);
    await pool.end();
  },
});

Deno.test({
  name:
    "PostgreSQL membership upgrade waits for a legacy writer and records its committed divergence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await ensureWorkManagementTestRoles(pool);
    await pool.query("DROP SCHEMA IF EXISTS work_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS platform CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      workManagementMigration,
      workManagementCorrectiveMigration,
    ]);
    const writer = await pool.connect();
    await writer.query("BEGIN");
    await writer.query(
      `INSERT INTO work_management.workstreams_current
       (workstream_id, tenant_id, workspace_id, deal_id, version, document, created_at, updated_at)
       VALUES ('workstream_writer-fence', 'tenant_writer-fence', 'workspace_writer-fence',
         'deal_writer-fence', 1, '{"taskIds":["task_writer-missing"]}', now(), now())`,
    );
    const upgrade = runner.apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ]);
    assertEquals(await waitForMigrationTableLock(pool), true);
    await writer.query("COMMIT");
    writer.release();
    await upgrade;
    const finding = await pool.query<{ readonly count: number }>(
      `SELECT count(*)::int AS count FROM work_management.membership_reconciliation_findings
       WHERE scan_id='work_management-0004-initial' AND finding_class='authoritative_task_missing'`,
    );
    assertEquals(finding.rows[0].count > 0, true);
    const mode = await pool.query<{ readonly available: boolean }>(
      "SELECT work_management.membership_commands_available() AS available",
    );
    assertEquals(mode.rows[0].available, false);
    await pool.end();
  },
});

async function waitForMigrationTableLock(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<boolean> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ readonly waiting: number }>(
      `SELECT count(*)::int AS waiting
       FROM pg_locks lock
       JOIN pg_class relation ON relation.oid = lock.relation
       WHERE relation.relname IN ('workstreams_current','tasks_current')
         AND lock.granted = false`,
    );
    if (Number(result.rows[0]?.waiting ?? 0) > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

class UnusedAuditPort implements WorkManagementAuditPort {
  append(): Promise<string> {
    return Promise.reject(new Error("Audit must not run in read_only mode."));
  }
}

function allow(): AuthorizationDecision {
  return {
    outcome: "allow",
    reasonCode: "ALLOWED",
    allowedActions: [],
    approvedScope: undefined as never,
    fieldMask: {
      include: [],
      omit: [],
      redact: [],
      approvedClassifications: [],
    },
  };
}
