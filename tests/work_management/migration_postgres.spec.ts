import { assertEquals, assertRejects } from "@std/assert";
import { type AuthorizationDecision } from "../../src/platform/authz/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { createPostgresWorkManagementComposition } from "../../src/work_management/composition.ts";
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
  workManagementMembershipAuthorityMigration,
  workManagementMigration,
} from "../../src/work_management/migrations/index.ts";
import type { WorkManagementAuditPort } from "../../src/work_management/transactional_effects.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name:
    "PostgreSQL Work Management migrations apply twice and rollback mode retains evidence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
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
    assertEquals(ledger.rows[0].count, 5);
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
    const readOnly = createPostgresWorkManagementComposition({
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
    "PostgreSQL migration upgrades the reviewed 0003 stream without checksum replacement",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await pool.query("DROP SCHEMA IF EXISTS work_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS platform CASCADE");
    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      workManagementMigration,
      workManagementCorrectiveMigration,
      workManagementMembershipAuthorityMigration,
    ]);
    const legacy = await pool.query(
      "SELECT count(*)::int AS count FROM platform.migration_ledger WHERE context_owner='work_management'",
    );
    assertEquals(legacy.rows[0].count, 3);
    await runner.apply([
      ...platformMigrations,
      ...workManagementMigrations,
    ]);
    const upgraded = await pool.query(
      "SELECT count(*)::int AS count FROM platform.migration_ledger WHERE context_owner='work_management'",
    );
    assertEquals(upgraded.rows[0].count, 5);
    const tables = await pool.query<{ readonly tableName: string }>(
      `SELECT table_name AS "tableName" FROM information_schema.tables
       WHERE table_schema='work_management' AND table_name IN
       ('membership_reconciliation_findings','authority_evaluations')
       ORDER BY table_name`,
    );
    assertEquals(tables.rows.map((row) => row.tableName), [
      "authority_evaluations",
      "membership_reconciliation_findings",
    ]);
    await pool.end();
  },
});

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
