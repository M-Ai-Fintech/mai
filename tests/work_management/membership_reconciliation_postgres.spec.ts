import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  platformMigrations,
  PostgresMigrationRunner,
} from "../../src/platform/persistence/v1.ts";
import { workManagementMigrations } from "../../src/work_management/migrations/index.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name:
    "PostgreSQL membership reconciliation retains evidence and gates commands",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
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
      await resetIsolatedContext(pool);
      const baselineScan = `scan_baseline_${suffix}`;
      await pool.query(
        "SELECT work_management.scan_membership_authority($1,$2)",
        [baselineScan, new Date().toISOString()],
      );
      await setReadOnly(
        pool,
        `reset_read_only_${suffix}`,
        baselineScan,
      );
      assertEquals(await commandsAvailable(pool), false);
      await seedDivergences(pool, scope, suffix);
      const firstAt = new Date().toISOString();
      const firstScan = `scan_recon_${suffix}`;
      const scanned = await pool.query(
        "SELECT work_management.scan_membership_authority($1,$2) AS count",
        [firstScan, firstAt],
      );
      assertEquals(Number(scanned.rows[0].count), 10);
      const classes = await pool.query(
        `SELECT finding_class FROM work_management.membership_reconciliation_findings
         WHERE scan_id=$1 ORDER BY finding_class`,
        [firstScan],
      );
      assertEquals(
        classes.rows.map((row) => row.finding_class),
        expectedClasses,
      );
      await assertRejects(
        () => activate(pool, `activate_blocked_${suffix}`, firstScan),
        Error,
        "unresolved membership findings",
      );
      assertEquals(await findingCount(pool, firstScan), 10);
      await repairDivergences(pool, scope);
      const cleanAt = new Date(Date.parse(firstAt) + 1).toISOString();
      const cleanScan = `scan_clean_${suffix}`;
      await pool.query(
        "SELECT work_management.scan_membership_authority($1,$2)",
        [cleanScan, cleanAt],
      );
      assertEquals(await findingCount(pool, cleanScan), 0);
      await resolveFindings(pool, firstScan, cleanScan, suffix);
      await activate(pool, `activate_clean_${suffix}`, cleanScan);
      assertEquals(await commandsAvailable(pool), true);
      const replay = await pool.query(
        "SELECT work_management.scan_membership_authority($1,$2) AS count",
        [cleanScan, cleanAt],
      );
      assertEquals(Number(replay.rows[0].count), 0);
      await assertRejects(
        () =>
          pool.query(
            "SELECT work_management.scan_membership_authority($1,$2)",
            [cleanScan, new Date().toISOString()],
          ),
        Error,
        "exact replay",
      );
      await assertRejects(
        () =>
          pool.query(
            `UPDATE work_management.membership_reconciliation_findings SET action='block_commands' WHERE scan_id=$1`,
            [firstScan],
          ),
        Error,
        "append-only",
      );
      await setReadOnly(
        pool,
        `rollback_read_only_${suffix}`,
        cleanScan,
        new Date(Date.now() + 10_000).toISOString(),
      );
      assertEquals(await commandsAvailable(pool), false);
      const direct = await pool.connect();
      try {
        await direct.query(
          "SELECT set_config('work_management.rollout_writer','governed',false)",
        );
        await assertRejects(
          () =>
            direct.query(
              `INSERT INTO work_management.membership_rollout_events
               (event_id, mode, scan_id, actor_id, recorded_at)
               VALUES ($1, 'commands', $2, 'operator:direct', now())`,
              [`direct_rollout_${suffix}`, cleanScan],
            ),
          Error,
          "governed activation",
        );
      } finally {
        await direct.query(
          "SELECT set_config('work_management.rollout_writer','forbidden',false)",
        );
        direct.release();
      }
      assertEquals(await findingCount(pool, firstScan), 10);
      const terminalWorkstream = `ws_terminal_${suffix}`;
      const terminalTask = `task_terminal-${suffix}`;
      await pool.query("BEGIN");
      await pool.query(
        "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
      );
      await pool.query(
        "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
      );
      await insertWorkstream(pool, scope, terminalWorkstream, {
        state: "completed",
        taskIds: [terminalTask],
      });
      await pool.query(
        `INSERT INTO work_management.tasks_current
         (task_id,tenant_id,workspace_id,deal_id,workstream_id,version,document,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,1,$6,now(),now())`,
        [terminalTask, ...scope, terminalWorkstream, {
          workstreamId: terminalWorkstream,
          state: "open",
        }],
      );
      await pool.query(
        "ALTER TABLE work_management.workstreams_current ENABLE TRIGGER USER",
      );
      await pool.query(
        "ALTER TABLE work_management.tasks_current ENABLE TRIGGER USER",
      );
      await pool.query("COMMIT");
      await assertRejects(
        () =>
          pool.query(
            "SELECT work_management.validate_workstream_membership($1,$2,$3,$4)",
            [...scope, terminalWorkstream],
          ),
        Error,
        "terminal workstream",
      );
      const nullStateWorkstream = `ws_terminal-null-${suffix}`;
      const nullStateTask = `task_terminal-null-${suffix}`;
      await pool.query("BEGIN");
      await pool.query(
        "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
      );
      await pool.query(
        "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
      );
      await insertWorkstream(pool, scope, nullStateWorkstream, {
        state: "completed",
        taskIds: [nullStateTask],
      });
      await pool.query(
        `INSERT INTO work_management.tasks_current
         (task_id,tenant_id,workspace_id,deal_id,workstream_id,version,document,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,1,$6,now(),now())`,
        [nullStateTask, ...scope, nullStateWorkstream, {
          workstreamId: nullStateWorkstream,
        }],
      );
      await pool.query(
        "ALTER TABLE work_management.workstreams_current ENABLE TRIGGER USER",
      );
      await pool.query(
        "ALTER TABLE work_management.tasks_current ENABLE TRIGGER USER",
      );
      await pool.query("COMMIT");
      await assertRejects(
        () =>
          pool.query(
            "SELECT work_management.validate_workstream_membership($1,$2,$3,$4)",
            [...scope, nullStateWorkstream],
          ),
        Error,
        "terminal workstream",
      );
      const malformedWorkstream = `ws_malformed-row-${suffix}`;
      const malformedTask = `task_bad_${suffix}`;
      await pool.query("BEGIN");
      await pool.query(
        "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
      );
      await pool.query(
        "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
      );
      await insertWorkstream(pool, scope, malformedWorkstream, {
        taskIds: [malformedTask],
      });
      await insertTask(
        pool,
        scope,
        malformedTask,
        malformedWorkstream,
        malformedWorkstream,
      );
      await pool.query(
        "ALTER TABLE work_management.workstreams_current ENABLE TRIGGER USER",
      );
      await pool.query(
        "ALTER TABLE work_management.tasks_current ENABLE TRIGGER USER",
      );
      await pool.query("COMMIT");
      const malformedScan = `scan_malformed-${suffix}`;
      await pool.query(
        "SELECT work_management.scan_membership_authority($1,$2)",
        [malformedScan, new Date(Date.now() + 20_000).toISOString()],
      );
      const malformedClasses = await pool.query(
        "SELECT finding_class FROM work_management.membership_reconciliation_findings WHERE scan_id=$1 AND workstream_id=$2 ORDER BY finding_class",
        [malformedScan, malformedWorkstream],
      );
      assertEquals(
        malformedClasses.rows.map((row) => row.finding_class),
        ["malformed_task_id", "malformed_workstream_task_ids"],
      );
      await proveConcurrentAttachment(pool, scope, suffix);
    } finally {
      await pool.end();
    }
  },
});

async function resetIsolatedContext(pool: import("pg").Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      work_management.tasks_current,
      work_management.workstreams_current,
      work_management.approval_requests_current,
      work_management.aggregate_history,
      work_management.approval_decision_history,
      work_management.command_results,
      work_management.target_command_dispatches,
      work_management.authority_evaluations,
      work_management.command_preparations,
      work_management.membership_reconciliation_resolutions,
      work_management.membership_reconciliation_findings,
      work_management.membership_reconciliation_scans,
      work_management.membership_rollout_events,
      platform.idempotency_records,
      platform.outbox,
      platform.inbox
    RESTART IDENTITY CASCADE
  `);
}

const expectedClasses = [
  "ambiguous_legacy_ownership",
  "authoritative_task_missing",
  "authoritative_task_scope_mismatch",
  "authoritative_task_wrong_workstream",
  "duplicate_authoritative_task_id",
  "malformed_workstream_task_ids",
  "task_document_back_reference_mismatch",
  "task_missing_from_authoritative_membership",
  "task_owner_scope_mismatch",
  "task_owner_workstream_missing",
];

async function seedDivergences(
  pool: import("pg").Pool,
  scope: string[],
  suffix: string,
): Promise<void> {
  const [tenant, workspace, deal] = scope;
  await pool.query("BEGIN");
  try {
    await pool.query(
      "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
    );
    await pool.query(
      "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
    );
    const workstreams = [
      ["malformed", { taskIds: {} }],
      ["duplicate", { taskIds: [`task_dup-${suffix}`, `task_dup-${suffix}`] }],
      ["missing_member", { taskIds: [] }],
      ["author_missing", { taskIds: [`task_missing-${suffix}`] }],
      ["wrong_owner", { taskIds: [`task_wrong-${suffix}`] }],
      ["actual_owner", { taskIds: [`task_wrong-${suffix}`] }],
      ["scope_owner", { taskIds: [`task_scope-${suffix}`] }],
      ["backref", { taskIds: [`task_back-${suffix}`] }],
    ];
    for (const [name, document] of workstreams) {
      await insertWorkstream(pool, scope, `ws_${name}_${suffix}`, document);
    }
    await insertWorkstream(
      pool,
      [`other_${tenant}`, workspace, deal],
      `ws_cross_${suffix}`,
      { taskIds: [] },
    );
    await insertWorkstream(
      pool,
      [`other_${tenant}`, workspace, deal],
      `ws_scope_other_${suffix}`,
      { taskIds: [`task_scope-${suffix}`] },
    );
    await insertTask(
      pool,
      scope,
      `task_dup-${suffix}`,
      `ws_duplicate_${suffix}`,
      `ws_duplicate_${suffix}`,
    );
    await insertTask(
      pool,
      scope,
      `task_orphan-${suffix}`,
      `ws_absent_${suffix}`,
      `ws_absent_${suffix}`,
    );
    await insertTask(
      pool,
      scope,
      `task_cross-${suffix}`,
      `ws_cross_${suffix}`,
      `ws_cross_${suffix}`,
    );
    await insertTask(
      pool,
      scope,
      `task_unlisted-${suffix}`,
      `ws_missing_member_${suffix}`,
      `ws_missing_member_${suffix}`,
    );
    await insertTask(
      pool,
      scope,
      `task_wrong-${suffix}`,
      `ws_actual_owner_${suffix}`,
      `ws_actual_owner_${suffix}`,
    );
    await insertTask(
      pool,
      [`other_${tenant}`, workspace, deal],
      `task_scope-${suffix}`,
      `ws_scope_other_${suffix}`,
      `ws_scope_other_${suffix}`,
    );
    await insertTask(
      pool,
      scope,
      `task_back-${suffix}`,
      `ws_backref_${suffix}`,
      `ws_conflict_${suffix}`,
    );
    await pool.query(
      "ALTER TABLE work_management.workstreams_current ENABLE TRIGGER USER",
    );
    await pool.query(
      "ALTER TABLE work_management.tasks_current ENABLE TRIGGER USER",
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function repairDivergences(
  pool: import("pg").Pool,
  scope: string[],
): Promise<void> {
  const [tenant, workspace, deal] = scope;
  const otherTenant = `other_${tenant}`;
  const repairedWorkstream = `ws_repaired-${tenant}`;
  const repairedOtherWorkstream = `ws_repaired-${otherTenant}`;
  await pool.query("BEGIN");
  try {
    await pool.query(
      "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
    );
    await pool.query(
      "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
    );
    await pool.query(
      `INSERT INTO work_management.workstreams_current
       (workstream_id,tenant_id,workspace_id,deal_id,version,document,created_at,updated_at)
       VALUES ($1,$2,$3,$4,1,'{"taskIds":[]}'::jsonb,now(),now()),
              ($5,$6,$3,$4,1,'{"taskIds":[]}'::jsonb,now(),now())`,
      [
        repairedWorkstream,
        tenant,
        workspace,
        deal,
        repairedOtherWorkstream,
        otherTenant,
      ],
    );
    await pool.query(
      `UPDATE work_management.workstreams_current
       SET document=jsonb_set(document,'{taskIds}','[]'::jsonb), version=version+1
       WHERE workspace_id=$1 AND deal_id=$2 AND tenant_id IN ($3,$4)
         AND workstream_id NOT IN ($5,$6)`,
      [
        workspace,
        deal,
        tenant,
        otherTenant,
        repairedWorkstream,
        repairedOtherWorkstream,
      ],
    );
    await pool.query(
      `UPDATE work_management.tasks_current
       SET workstream_id=CASE WHEN tenant_id=$3 THEN $5 ELSE $6 END,
           document=jsonb_set(document,'{workstreamId}',to_jsonb(CASE WHEN tenant_id=$3 THEN $5 ELSE $6 END)),
           version=version+1
       WHERE workspace_id=$1 AND deal_id=$2 AND tenant_id IN ($3,$4)`,
      [
        workspace,
        deal,
        tenant,
        otherTenant,
        repairedWorkstream,
        repairedOtherWorkstream,
      ],
    );
    await pool.query(
      `UPDATE work_management.workstreams_current AS w
       SET document=jsonb_set(w.document,'{taskIds}',COALESCE(
         (SELECT jsonb_agg(to_jsonb(t.task_id) ORDER BY t.task_id)
          FROM work_management.tasks_current AS t
          WHERE t.tenant_id=w.tenant_id AND t.workspace_id=w.workspace_id
            AND t.deal_id=w.deal_id AND t.workstream_id=w.workstream_id),
         '[]'::jsonb)), version=version+1
       WHERE w.workspace_id=$1 AND w.deal_id=$2 AND w.workstream_id IN ($3,$4)`,
      [workspace, deal, repairedWorkstream, repairedOtherWorkstream],
    );
    await pool.query(
      "ALTER TABLE work_management.workstreams_current ENABLE TRIGGER USER",
    );
    await pool.query(
      "ALTER TABLE work_management.tasks_current ENABLE TRIGGER USER",
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function resolveFindings(
  pool: import("pg").Pool,
  scanId: string,
  cleanScan: string,
  suffix: string,
): Promise<void> {
  const findings = await pool.query(
    "SELECT finding_id, finding_class FROM work_management.membership_reconciliation_findings WHERE scan_id=$1",
    [scanId],
  );
  for (const [index, finding] of findings.rows.entries()) {
    await pool.query(
      "SELECT work_management.resolve_membership_finding($1,$2,$3,$4,$5,$6)",
      [
        `resolution_${suffix}_${index}`,
        finding.finding_id,
        cleanScan,
        {
          action: finding.finding_class === "ambiguous_legacy_ownership"
            ? "retained"
            : "mapped",
          retained: true,
          evidence: {
            procedure: "operator_reconciled_and_rescanned",
            mapping: "scope-qualified-repaired-workstream",
          },
        },
        "operator:test",
        new Date(Date.now() + 3_000 + index).toISOString(),
      ],
    );
  }
}

function activate(
  pool: import("pg").Pool,
  eventId: string,
  scanId: string,
): Promise<unknown> {
  return pool.query(
    "SELECT work_management.set_membership_rollout_mode($1,'commands',$2,$3,$4)",
    [eventId, scanId, "operator:test", new Date().toISOString()],
  );
}

function setReadOnly(
  pool: import("pg").Pool,
  eventId: string,
  scanId: string,
  recordedAt = new Date().toISOString(),
): Promise<unknown> {
  return pool.query(
    "SELECT work_management.set_membership_rollout_mode($1,'read_only',$2,$3,$4)",
    [
      eventId,
      scanId,
      "operator:test",
      recordedAt,
    ],
  );
}

async function commandsAvailable(pool: import("pg").Pool): Promise<boolean> {
  const result = await pool.query(
    "SELECT work_management.membership_commands_available() AS available",
  );
  return result.rows[0].available;
}

async function findingCount(
  pool: import("pg").Pool,
  scanId: string,
): Promise<number> {
  const result = await pool.query(
    "SELECT count(*)::int AS count FROM work_management.membership_reconciliation_findings WHERE scan_id=$1",
    [scanId],
  );
  return result.rows[0].count;
}

function insertWorkstream(
  pool: import("pg").Pool,
  scope: string[],
  id: string,
  document: unknown,
): Promise<unknown> {
  return pool.query(
    `INSERT INTO work_management.workstreams_current (workstream_id,tenant_id,workspace_id,deal_id,version,document,created_at,updated_at) VALUES ($1,$2,$3,$4,1,$5,now(),now())`,
    [id, ...scope, document],
  );
}

function insertTask(
  pool: import("pg").Pool,
  scope: string[],
  id: string,
  workstream: string,
  documentWorkstream: string,
): Promise<unknown> {
  return pool.query(
    `INSERT INTO work_management.tasks_current (task_id,tenant_id,workspace_id,deal_id,workstream_id,version,document,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,1,$6,now(),now())`,
    [id, ...scope, workstream, { workstreamId: documentWorkstream }],
  );
}

async function proveConcurrentAttachment(
  pool: import("pg").Pool,
  scope: string[],
  suffix: string,
): Promise<void> {
  const workstream = `ws_concurrent_${suffix}`;
  await insertWorkstream(pool, scope, workstream, { taskIds: [] });
  const attach = async (task: string) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await insertTask(
        client as unknown as import("pg").Pool,
        scope,
        task,
        workstream,
        workstream,
      );
      await client.query(
        `UPDATE work_management.workstreams_current SET document=jsonb_set(document,'{taskIds}',(document->'taskIds') || to_jsonb($1::text)),version=version+1 WHERE tenant_id=$2 AND workspace_id=$3 AND deal_id=$4 AND workstream_id=$5`,
        [task, ...scope, workstream],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };
  await Promise.all([
    attach(`task_concurrent-a-${suffix}`),
    attach(`task_concurrent-b-${suffix}`),
  ]);
  const result = await pool.query(
    "SELECT jsonb_array_length(document->'taskIds') AS count FROM work_management.workstreams_current WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND workstream_id=$4",
    [...scope, workstream],
  );
  assertEquals(result.rows[0].count, 2);
  assert(await commandsAvailable(pool) === false);
}
