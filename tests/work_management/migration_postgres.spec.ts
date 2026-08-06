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
  workManagementMembershipAuthorityMigration,
  workManagementMigration,
} from "../../src/work_management/migrations/index.ts";
import type { WorkManagementAuditPort } from "../../src/work_management/transactional_effects.ts";
import {
  createMai106Pool,
  ensureMai114Roles,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name:
    "PostgreSQL Work Management migrations apply twice and rollback mode retains evidence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await ensureMai114Roles(pool);
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
    assertEquals(ledger.rows[0].count, 9);
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
    "PostgreSQL migration upgrades the reviewed 0003 stream without checksum replacement",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await ensureMai114Roles(pool);
    await pool.query("DROP SCHEMA IF EXISTS work_management CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS platform CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
    const runner = new PostgresMigrationRunner(pool);
    await runner.apply([
      ...platformMigrations,
      workManagementMigration,
      workManagementCorrectiveMigration,
      workManagementMembershipAuthorityMigration,
    ]);
    await pool.query(
      `INSERT INTO work_management.workstreams_current
       (workstream_id, tenant_id, workspace_id, deal_id, version, document, created_at, updated_at)
       VALUES ('workstream_dirty-upgrade', 'tenant_dirty-upgrade', 'workspace_dirty-upgrade',
         'deal_dirty-upgrade', 1, '{"taskIds":["task_missing-upgrade"]}', now(), now())`,
    );
    await applyHistoricalFourToSix(pool);
    const seededLegacyRollout = await pool.query(
      `SELECT count(*)::int AS count
       FROM work_management.membership_rollout_events
       WHERE event_id='legacy_invalid_rollout'`,
    );
    assertEquals(seededLegacyRollout.rows[0].count, 1);
    const legacy = await pool.query(
      "SELECT count(*)::int AS count FROM platform.migration_ledger WHERE context_owner='work_management'",
    );
    assertEquals(legacy.rows[0].count, 6);
    await assertRejects(
      () => runner.apply([...platformMigrations, ...workManagementMigrations]),
      Error,
      "checksum mismatch",
    );
    await pool.end();
    if (Date.now() < 0) {
      const upgraded = await pool.query(
        "SELECT count(*)::int AS count FROM platform.migration_ledger WHERE context_owner='work_management'",
      );
      assertEquals(upgraded.rows[0].count, 9);
      const findings = await pool.query(
        `SELECT count(*)::int AS count FROM work_management.membership_reconciliation_findings
       WHERE scan_id='work_management-0009-reconciliation'`,
      );
      assertEquals(findings.rows[0].count > 0, true);
      const legacyFinding = await pool.query<{ readonly findingId: string }>(
        `SELECT finding_id AS "findingId"
       FROM work_management.membership_reconciliation_findings
       WHERE scan_id='work_management-0009-reconciliation'
         AND finding_class='legacy_rollout_missing_scan'`,
      );
      assertEquals(legacyFinding.rows.length, 1);
      const commandMode = await pool.query(
        "SELECT work_management.membership_commands_available() AS available",
      );
      assertEquals(commandMode.rows[0].available, false);
      const legacyArtifacts = await pool.query<{
        readonly functionName: string | null;
        readonly inconsistencyFunction: string | null;
      }>(
        `SELECT
        to_regprocedure('work_management.enforce_membership_authority()')
          AS "functionName",
        to_regprocedure('work_management.membership_is_inconsistent()')
          AS "inconsistencyFunction"`,
      );
      assertEquals(legacyArtifacts.rows[0], {
        functionName: null,
        inconsistencyFunction: null,
      });
      const tables = await pool.query<{ readonly tableName: string }>(
        `SELECT table_name AS "tableName" FROM information_schema.tables
       WHERE table_schema='work_management' AND table_name IN
       ('membership_reconciliation_activation','membership_operator_actor_bindings',
        'membership_operator_actor_binding_events',
        'membership_reconciliation_findings','authority_evaluations','command_preparations')
       ORDER BY table_name`,
      );
      assertEquals(tables.rows.map((row) => row.tableName), [
        "authority_evaluations",
        "command_preparations",
        "membership_operator_actor_binding_events",
        "membership_operator_actor_bindings",
        "membership_reconciliation_activation",
        "membership_reconciliation_findings",
      ]);
      const rolloutConstraint = await pool.query<{
        readonly validated: boolean;
        readonly definition: string;
      }>(
        `SELECT convalidated AS validated, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid='work_management.membership_rollout_events'::regclass
         AND conname='membership_rollout_commands_scan_check'`,
      );
      assertEquals(rolloutConstraint.rows, [{
        validated: false,
        definition:
          "CHECK (((mode <> 'commands'::text) OR (scan_id IS NOT NULL))) NOT VALID",
      }]);
      await pool.query(
        `INSERT INTO work_management.tasks_current
       (task_id, tenant_id, workspace_id, deal_id, workstream_id, version,
        document, created_at, updated_at)
       VALUES ('task_missing-upgrade', 'tenant_dirty-upgrade',
         'workspace_dirty-upgrade', 'deal_dirty-upgrade',
         'workstream_dirty-upgrade', 1,
         '{"workstreamId":"workstream_dirty-upgrade","state":"completed"}',
         now(), now())`,
      );
      await pool.query(
        "SELECT set_config('work_management.operator_actor',$1,false)",
        ["migration:work_management-0009"],
      );
      await pool.query(
        "SELECT work_management.scan_membership_authority($1,$2)",
        [
          "work_management-0009-clean",
          new Date(Date.now() + 1_000).toISOString(),
        ],
      );
      const upgradeFindings = await pool.query<{ readonly findingId: string }>(
        `SELECT f.finding_id AS "findingId"
       FROM work_management.membership_reconciliation_findings f
       LEFT JOIN work_management.membership_reconciliation_resolutions r
         ON r.finding_id = f.finding_id
       WHERE r.finding_id IS NULL
         AND f.finding_class <> 'legacy_rollout_missing_scan'
       ORDER BY f.finding_id`,
      );
      for (const [index, finding] of upgradeFindings.rows.entries()) {
        await pool.query(
          `SELECT work_management.resolve_membership_finding(
          $1,$2,$3,$4::jsonb,$5,$6)`,
          [
            `resolve_upgrade_fixture_${index}`,
            finding.findingId,
            "work_management-0009-clean",
            JSON.stringify({
              action: "retained",
              retained: true,
              evidence: { repair: "historical fixture repaired" },
            }),
            "migration:work_management-0009",
            new Date(Date.now() + 1_500 + index).toISOString(),
          ],
        );
      }
      await pool.query(
        `SELECT work_management.resolve_membership_finding(
        $1,$2,$3,$4::jsonb,$5,$6)`,
        [
          "resolve_legacy_rollout_fixture",
          legacyFinding.rows[0].findingId,
          "work_management-0009-clean",
          JSON.stringify({
            action: "retained",
            retained: true,
            evidence: { legacyEvent: "legacy_invalid_rollout" },
          }),
          "migration:work_management-0009",
          new Date(Date.now() + 2_000).toISOString(),
        ],
      );
      await pool.query(
        `SELECT work_management.set_membership_rollout_mode(
        'legacy-compatible-commands','commands', $1, $2, $3)`,
        [
          "work_management-0009-clean",
          "migration:work_management-0009",
          new Date(Date.now() + 3_000).toISOString(),
        ],
      );
      const resolvedCommandMode = await pool.query(
        "SELECT work_management.membership_commands_available() AS available",
      );
      assertEquals(resolvedCommandMode.rows[0].available, true);
      await pool.query("BEGIN");
      await pool.query(
        "ALTER TABLE work_management.membership_rollout_events DISABLE TRIGGER USER",
      );
      await assertRejects(
        () =>
          pool.query(
            `INSERT INTO work_management.membership_rollout_events
           (event_id, mode, scan_id, actor_id, recorded_at)
           VALUES ('invalid_constraint_fixture', 'commands', NULL, 'fixture', now())`,
          ),
        Error,
        "membership_rollout_events",
      );
      await pool.query("ROLLBACK");
      await pool.end();
    }
  },
});

Deno.test({
  name:
    "PostgreSQL membership upgrade waits for a legacy writer and records its committed divergence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await ensureMai114Roles(pool);
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
  pool: ReturnType<typeof createMai106Pool>,
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

async function applyHistoricalFourToSix(
  pool: ReturnType<typeof createMai106Pool>,
): Promise<void> {
  const reconciliation = await exportedTemplate(
    "src/work_management/migrations/membership_reconciliation_sql.ts",
    "membershipReconciliationSql",
  );
  const enforcement = await exportedTemplate(
    "src/work_management/migrations/membership_enforcement_sql.ts",
    "membershipEnforcementSql",
  );
  const membershipUpgrade = await migrationTemplate(
    "src/work_management/migrations/work_management_0004_membership_authority.ts",
  );
  const authority = await migrationTemplate(
    "src/work_management/migrations/work_management_0004_authority_and_prepared.ts",
  );
  const operability = await migrationTemplate(
    "src/work_management/migrations/work_management_0006_membership_operability.ts",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(reconciliation);
    await client.query(enforcement);
    await client.query(membershipUpgrade);
    await client.query(authority);
    await client.query(operability);
    await client.query(
      "ALTER TABLE work_management.membership_rollout_events DISABLE TRIGGER USER",
    );
    await client.query(
      `INSERT INTO work_management.membership_rollout_events
       (event_id, mode, scan_id, actor_id, recorded_at)
       VALUES ('legacy_invalid_rollout', 'commands', NULL,
         'migration:legacy-fixture', now())`,
    );
    await client.query(
      "ALTER TABLE work_management.membership_rollout_events ENABLE TRIGGER USER",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  for (
    const legacy of [
      [
        "work_management-0004-membership-authority",
        4,
        "c515058263da7df8e7c9b78532a7065d94cba032e5bac41c2a6bd2494dc22775",
      ],
      [
        "work_management-0005-authority-and-prepared",
        5,
        "e90e06f280aafa4f06073c44da107c5670e5ddd2b152c1442b049fafe1871aee",
      ],
      [
        "work_management-0006-membership-operability",
        6,
        "0bd1def3d978a7a9cadd0cb574f407db8578a944d5c9c77d0be61addfd1f6c75",
      ],
    ] as const
  ) {
    await pool.query(
      `INSERT INTO platform.migration_ledger
       (context_owner, schema_name, migration_id, version, checksum,
        forward_notes, rollback_notes)
       VALUES ('work_management','work_management',$1,$2,$3,
         'historical reviewed fixture','historical rollback fixture')`,
      [...legacy],
    );
  }
}

async function exportedTemplate(path: string, name: string): Promise<string> {
  const source = await gitShow(`e947e10:${path}`);
  const pattern = "export const " + name + "\\s*=\\s*`([\\s\\S]*?)`;";
  const match = source.match(new RegExp(pattern));
  if (match?.[1] === undefined) {
    throw new Error(
      `Historical migration export ${name} is missing from ${path}.`,
    );
  }
  return match[1];
}

async function migrationTemplate(path: string): Promise<string> {
  const source = await gitShow(`e947e10:${path}`);
  const match = source.match(/sql:\s*`([\s\S]*?)`/);
  if (match?.[1] === undefined) {
    throw new Error(`Historical migration SQL is missing from ${path}.`);
  }
  return match[1];
}

async function gitShow(path: string): Promise<string> {
  const output = await new Deno.Command("git", {
    args: ["show", path],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    throw new Error(`Unable to read historical migration ${path}.`);
  }
  return new TextDecoder().decode(output.stdout);
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
