import { assertEquals, assertRejects } from "@std/assert";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  workManagementCorrectiveMigration,
  workManagementMembershipAuthorityMigration,
  workManagementMigration,
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
    "PostgreSQL migration upgrades the reviewed 0003 stream without checksum replacement",
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
    await cleanupMigrationFixture(pool);
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

async function applyHistoricalFourToSix(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
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

async function cleanupMigrationFixture(
  pool: ReturnType<typeof createPostgresIntegrationTestPool>,
): Promise<void> {
  await pool.query("DROP SCHEMA IF EXISTS work_management CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS platform CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS audit_activity CASCADE");
  await new PostgresMigrationRunner(pool).apply([
    ...platformMigrations,
    ...workManagementMigrations,
  ]);
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
