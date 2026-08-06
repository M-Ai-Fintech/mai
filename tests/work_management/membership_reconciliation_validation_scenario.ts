import { assertEquals, assertRejects } from "@std/assert";
import {
  insertTask,
  insertWorkstream,
  proveConcurrentAttachment,
} from "./membership_reconciliation_test_support.ts";

type Pool = import("pg").Pool;

export async function assertMembershipValidation(
  pool: Pool,
  scope: string[],
  suffix: string,
): Promise<void> {
  await assertTerminalMembership(pool, scope, suffix);
  await assertMalformedMembership(pool, scope, suffix);
  await proveConcurrentAttachment(pool, scope, suffix);
}

async function assertTerminalMembership(
  pool: Pool,
  scope: string[],
  suffix: string,
): Promise<void> {
  await insertInvalidTerminalTask(
    pool,
    scope,
    `ws_terminal_${suffix}`,
    `task_terminal-${suffix}`,
    {
      state: "open",
    },
  );
  await insertInvalidTerminalTask(
    pool,
    scope,
    `ws_terminal-null-${suffix}`,
    `task_terminal-null-${suffix}`,
    {},
  );
}

async function insertInvalidTerminalTask(
  pool: Pool,
  scope: string[],
  workstream: string,
  task: string,
  document: Record<string, unknown>,
): Promise<void> {
  await pool.query("BEGIN");
  try {
    await pool.query(
      "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
    );
    await pool.query(
      "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
    );
    await insertWorkstream(pool, scope, workstream, {
      state: "completed",
      taskIds: [task],
    });
    await pool.query(
      `INSERT INTO work_management.tasks_current
       (task_id,tenant_id,workspace_id,deal_id,workstream_id,version,document,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,1,$6,now(),now())`,
      [task, ...scope, workstream, { workstreamId: workstream, ...document }],
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
  await assertRejects(
    () =>
      pool.query(
        "SELECT work_management.validate_workstream_membership($1,$2,$3,$4)",
        [...scope, workstream],
      ),
    Error,
    "terminal workstream",
  );
}

async function assertMalformedMembership(
  pool: Pool,
  scope: string[],
  suffix: string,
): Promise<void> {
  const workstream = `ws_malformed-row-${suffix}`;
  const task = `task_bad_${suffix}`;
  await pool.query("BEGIN");
  try {
    await pool.query(
      "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
    );
    await pool.query(
      "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
    );
    await insertWorkstream(pool, scope, workstream, { taskIds: [task] });
    await insertTask(pool, scope, task, workstream, workstream);
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
  const scan = `scan_malformed-${suffix}`;
  await pool.query(
    "SELECT work_management.scan_membership_authority($1,$2)",
    [scan, new Date(Date.now() + 20_000).toISOString()],
  );
  const classes = await pool.query(
    "SELECT finding_class FROM work_management.membership_reconciliation_findings WHERE scan_id=$1 AND workstream_id=$2 ORDER BY finding_class",
    [scan, workstream],
  );
  assertEquals(classes.rows.map((row) => row.finding_class), [
    "malformed_task_id",
    "malformed_workstream_task_ids",
  ]);
}
