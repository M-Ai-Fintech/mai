import { assert, assertEquals, assertStringIncludes } from "@std/assert";
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
  name: "membership enforcement uses scoped indexes on representative data",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    const suffix = crypto.randomUUID().replaceAll("-", "");
    const tenant = `tenant_perf_${suffix}`;
    try {
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...workManagementMigrations,
      ]);
      await seedRepresentativeData(pool, tenant, suffix);
      await pool.query("ANALYZE work_management.workstreams_current");
      await pool.query("ANALYZE work_management.tasks_current");
      const taskPlan = await explain(
        pool,
        `
        SELECT task_id FROM work_management.tasks_current
        WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3
          AND workstream_id=$4
      `,
        [tenant, "workspace_perf", "deal_perf", `ws_perf_${suffix}_37`],
      );
      assertStringIncludes(taskPlan, "work_management_tasks_workstream_idx");
      assert(!taskPlan.includes('"Node Type": "Seq Scan"'));
      const ownerPlan = await explain(
        pool,
        `
        SELECT document FROM work_management.workstreams_current
        WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3
          AND workstream_id=$4
      `,
        [tenant, "workspace_perf", "deal_perf", `ws_perf_${suffix}_37`],
      );
      assertStringIncludes(ownerPlan, "workstreams_current_pkey");
      const startedAt = performance.now();
      const result = await pool.query(
        "SELECT work_management.scan_membership_authority($1,$2) AS count",
        [`scan_perf_${suffix}`, new Date().toISOString()],
      );
      assertEquals(Number(result.rows[0].count), 0);
      assert(performance.now() - startedAt < 5_000);
    } finally {
      await pool.end();
    }
  },
});

async function seedRepresentativeData(
  pool: import("pg").Pool,
  tenant: string,
  suffix: string,
): Promise<void> {
  await pool.query("BEGIN");
  try {
    await pool.query(
      "ALTER TABLE work_management.workstreams_current DISABLE TRIGGER USER",
    );
    await pool.query(
      "ALTER TABLE work_management.tasks_current DISABLE TRIGGER USER",
    );
    await pool.query(
      `
      INSERT INTO work_management.workstreams_current
        (workstream_id,tenant_id,workspace_id,deal_id,version,document,created_at,updated_at)
      SELECT 'ws_perf_' || $2 || '_' || workstream_number, $1,
        'workspace_perf', 'deal_perf', 1,
        jsonb_build_object('taskIds', (
          SELECT jsonb_agg('task_perf_' || $2 || '_' || workstream_number || '_' || task_number)
          FROM generate_series(1,20) AS task_numbers(task_number)
        )), now(), now()
      FROM generate_series(1,200) AS workstream_numbers(workstream_number)
    `,
      [tenant, suffix],
    );
    await pool.query(
      `
      INSERT INTO work_management.tasks_current
        (task_id,tenant_id,workspace_id,deal_id,workstream_id,version,document,created_at,updated_at)
      SELECT 'task_perf_' || $2 || '_' || workstream_number || '_' || task_number,
        $1, 'workspace_perf', 'deal_perf',
        'ws_perf_' || $2 || '_' || workstream_number, 1,
        jsonb_build_object('workstreamId', 'ws_perf_' || $2 || '_' || workstream_number),
        now(), now()
      FROM generate_series(1,200) AS workstream_numbers(workstream_number)
      CROSS JOIN generate_series(1,20) AS task_numbers(task_number)
    `,
      [tenant, suffix],
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

async function explain(
  pool: import("pg").Pool,
  query: string,
  parameters: unknown[],
): Promise<string> {
  const result = await pool.query(`EXPLAIN (FORMAT JSON) ${query}`, parameters);
  return JSON.stringify(result.rows[0]);
}
