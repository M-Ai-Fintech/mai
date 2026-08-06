import { assertEquals, assertRejects } from "@std/assert";
import {
  activate,
  commandsAvailable,
  expectedClasses,
  findingCount,
  repairDivergences,
  resetIsolatedContext,
  resolveFindings,
  seedDivergences,
  setReadOnly,
} from "./membership_reconciliation_test_support.ts";
import {
  assertMembershipValidation,
} from "./membership_reconciliation_validation_scenario.ts";

type Pool = import("pg").Pool;

interface ScanState {
  readonly firstAt: string;
  readonly firstScan: string;
  readonly cleanAt: string;
  readonly cleanScan: string;
}

export async function runMembershipReconciliationScenario(
  pool: Pool,
  scope: string[],
  suffix: string,
): Promise<void> {
  const state = await prepareScenario(pool, scope, suffix);
  await assertCleanActivation(pool, state, suffix);
  await assertOperatorGuards(pool, state, suffix);
  await assertReplayAndRollback(pool, state, suffix);
  await assertDirectMutationGuards(pool, state, suffix);
  await assertMembershipValidation(pool, scope, suffix);
}

async function prepareScenario(
  pool: Pool,
  scope: string[],
  suffix: string,
): Promise<ScanState> {
  await resetIsolatedContext(pool);
  await registerTestOperator(pool, suffix);
  const baselineScan = `scan_baseline_${suffix}`;
  await pool.query(
    "SELECT work_management.scan_membership_authority($1,$2)",
    [baselineScan, new Date().toISOString()],
  );
  await setReadOnly(pool, `reset_read_only_${suffix}`, baselineScan);
  assertEquals(await commandsAvailable(pool), false);
  await seedDivergences(pool, scope, suffix);
  const state = await scanDivergences(pool, suffix);
  await repairDivergences(pool, scope);
  return await rescanAndResolve(pool, state, suffix);
}

async function registerTestOperator(pool: Pool, suffix: string): Promise<void> {
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_bindings
      (session_role, actor_id) VALUES (current_user, 'operator:test')
      ON CONFLICT (session_role, actor_id) DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ('binding_event_test_operator', current_user, 'operator:test', 'bind', now())
     ON CONFLICT (event_id) DO NOTHING`,
  );
  await assertRejects(
    () =>
      pool.query(
        `INSERT INTO work_management.membership_operator_actor_binding_events
         (event_id, session_role, actor_id, action, recorded_at)
         VALUES ($1, current_user, 'unregistered:actor', 'bind', now())`,
        [`binding_event_orphan_${suffix}`],
      ),
    Error,
    "membership_operator_actor_binding_events_binding_fk",
  );
}

async function scanDivergences(pool: Pool, suffix: string): Promise<ScanState> {
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
  assertEquals(classes.rows.map((row) => row.finding_class), expectedClasses);
  await assertRejects(
    () => activate(pool, `activate_blocked_${suffix}`, firstScan),
    Error,
    "unresolved membership findings",
  );
  assertEquals(await findingCount(pool, firstScan), 10);
  return { firstAt, firstScan, cleanAt: "", cleanScan: "" };
}

async function rescanAndResolve(
  pool: Pool,
  state: ScanState,
  suffix: string,
): Promise<ScanState> {
  const cleanAt = new Date(Date.parse(state.firstAt) + 1).toISOString();
  const cleanScan = `scan_clean_${suffix}`;
  await pool.query(
    "SELECT work_management.scan_membership_authority($1,$2)",
    [cleanScan, cleanAt],
  );
  assertEquals(await findingCount(pool, cleanScan), 0);
  await resolveFindings(pool, state.firstScan, cleanScan, suffix);
  return { ...state, cleanAt, cleanScan };
}

async function assertCleanActivation(
  pool: Pool,
  state: ScanState,
  suffix: string,
): Promise<void> {
  await rejectNullActivation(pool, suffix);
  await activate(pool, `activate_clean_${suffix}`, state.cleanScan);
  assertEquals(await commandsAvailable(pool), true);
  await assertRuntimeRole(pool, true);
}

async function rejectNullActivation(pool: Pool, suffix: string): Promise<void> {
  await pool.query(
    "SELECT set_config('work_management.operator_actor','operator:test',false)",
  );
  await assertRejects(
    () =>
      pool.query(
        "SELECT work_management.set_membership_rollout_mode($1,'commands',NULL,$2,$3)",
        [
          `activate_null_${suffix}`,
          "operator:test",
          new Date().toISOString(),
        ],
      ),
    Error,
    "requires a completed reconciliation scan",
  );
}

async function assertRuntimeRole(pool: Pool, expected: boolean): Promise<void> {
  const runtime = await pool.connect();
  try {
    await runtime.query("SET ROLE mai_work_management_runtime");
    const commandGate = await runtime.query(
      "SELECT work_management.membership_commands_available() AS available",
    );
    assertEquals(commandGate.rows[0].available, expected);
    await assertRejects(
      () =>
        runtime.query(
          "UPDATE work_management.membership_reconciliation_activation SET mode='commands' WHERE activation_id=TRUE",
        ),
      Error,
    );
  } finally {
    await runtime.query("RESET ROLE");
    runtime.release();
  }
}

async function assertOperatorGuards(
  pool: Pool,
  state: ScanState,
  suffix: string,
): Promise<void> {
  await assertBoundOperatorGuard(pool, state.cleanScan, suffix);
  const privilege = await pool.query(
    `SELECT has_function_privilege(
      'public',
      'work_management.set_membership_rollout_mode(text,text,text,text,timestamptz)',
      'EXECUTE'::text) AS allowed`,
  );
  assertEquals(privilege.rows[0].allowed, false);
  await assertRejects(
    () =>
      pool.query(
        "SELECT work_management.set_membership_rollout_mode($1,'read_only',$2,$3,$4)",
        [
          `spoofed_actor_${suffix}`,
          state.cleanScan,
          "operator:spoof",
          new Date().toISOString(),
        ],
      ),
    Error,
    "not bound",
  );
}

async function assertBoundOperatorGuard(
  pool: Pool,
  cleanScan: string,
  suffix: string,
): Promise<void> {
  const operator = await pool.connect();
  try {
    await operator.query("SET ROLE mai_work_management_operator");
    await operator.query(
      "SELECT set_config('work_management.migration_bootstrap','true',false)",
    );
    await operator.query(
      "SELECT set_config('work_management.operator_actor','operator:spoof',false)",
    );
    await assertRejects(
      () =>
        operator.query(
          "SELECT work_management.set_membership_rollout_mode($1,'read_only',$2,$3,$4)",
          [
            `operator_spoof_${suffix}`,
            cleanScan,
            "operator:spoof",
            new Date().toISOString(),
          ],
        ),
      Error,
      "not bound",
    );
  } finally {
    await operator.query("RESET ROLE");
    operator.release();
  }
}

async function assertReplayAndRollback(
  pool: Pool,
  state: ScanState,
  suffix: string,
): Promise<void> {
  await assertScanReplay(pool, state);
  await assertRollback(pool, state, suffix);
  await assertBindingClockSafety(pool, state, suffix);
  await assertRuntimeRole(pool, false);
}

async function assertScanReplay(pool: Pool, state: ScanState): Promise<void> {
  const replay = await pool.query(
    "SELECT work_management.scan_membership_authority($1,$2) AS count",
    [state.cleanScan, state.cleanAt],
  );
  assertEquals(Number(replay.rows[0].count), 0);
  await assertRejects(
    () =>
      pool.query(
        "SELECT work_management.scan_membership_authority($1,$2)",
        [state.cleanScan, new Date().toISOString()],
      ),
    Error,
    "exact replay",
  );
  await assertRejects(
    () =>
      pool.query(
        `UPDATE work_management.membership_reconciliation_findings SET action='block_commands' WHERE scan_id=$1`,
        [state.firstScan],
      ),
    Error,
    "append-only",
  );
}

async function assertRollback(
  pool: Pool,
  state: ScanState,
  suffix: string,
): Promise<void> {
  await setReadOnly(
    pool,
    `rollback_read_only_${suffix}`,
    state.cleanScan,
    new Date(Date.now() + 10_000).toISOString(),
  );
  assertEquals(await commandsAvailable(pool), false);
}

async function assertBindingClockSafety(
  pool: Pool,
  state: ScanState,
  suffix: string,
): Promise<void> {
  const revokedAt = new Date(Date.parse(state.cleanAt) + 20_000).toISOString();
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ($1, current_user, 'operator:test', 'revoke', $2)`,
    [`binding_event_revoke_${suffix}`, revokedAt],
  );
  await assertRejects(
    () =>
      setReadOnly(
        pool,
        `revoked_binding_${suffix}`,
        state.cleanScan,
        revokedAt,
      ),
    Error,
    "not bound",
  );
  const reboundAt = new Date(Date.parse(revokedAt) + 1_000).toISOString();
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ($1, current_user, 'operator:test', 'bind', $2)`,
    [`binding_event_rebind_${suffix}`, reboundAt],
  );
  await setReadOnly(
    pool,
    `rebound_binding_${suffix}`,
    state.cleanScan,
    reboundAt,
  );
  const bindingEvents = await pool.query<{ readonly action: string }>(
    `SELECT action FROM work_management.membership_operator_actor_binding_events
     WHERE session_role=current_user AND actor_id='operator:test'
     ORDER BY recorded_at, event_id`,
  );
  assertEquals(bindingEvents.rows.slice(-2).map((row) => row.action), [
    "revoke",
    "bind",
  ]);
  await assertFutureBindingIsIgnored(pool, state.cleanScan, suffix, reboundAt);
}

async function assertFutureBindingIsIgnored(
  pool: Pool,
  cleanScan: string,
  suffix: string,
  reboundAt: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ($1, current_user, 'operator:test', 'bind', $2)`,
    [
      `binding_event_future_bind_${suffix}`,
      new Date(Date.parse(reboundAt) + 86_400_000).toISOString(),
    ],
  );
  await pool.query(
    `INSERT INTO work_management.membership_operator_actor_binding_events
      (event_id, session_role, actor_id, action, recorded_at)
     VALUES ($1, current_user, 'operator:test', 'revoke', $2)`,
    [
      `binding_event_clock_safe_revoke_${suffix}`,
      new Date(Date.parse(reboundAt) + 2_000).toISOString(),
    ],
  );
  await assertRejects(
    () => setReadOnly(pool, `clock_safe_revoke_${suffix}`, cleanScan),
    Error,
    "not bound",
  );
}

async function assertDirectMutationGuards(
  pool: Pool,
  state: ScanState,
  suffix: string,
): Promise<void> {
  await assertDirectRolloutMutation(pool, state.cleanScan, suffix);
  const firstFinding = await pool.query<{ readonly finding_id: string }>(
    "SELECT finding_id FROM work_management.membership_reconciliation_findings WHERE scan_id=$1 LIMIT 1",
    [state.firstScan],
  );
  await assertRejects(
    () =>
      pool.query(
        `INSERT INTO work_management.membership_reconciliation_resolutions
         (resolution_id, finding_id, action, status, resolution, resolved_by, recorded_at)
         VALUES ($1,$2,'resolve','resolved','{"action":"retained","retained":true,"evidence":{}}','operator:direct',now())`,
        [`direct_resolution_${suffix}`, firstFinding.rows[0].finding_id],
      ),
    Error,
    "governed scan or resolution function",
  );
  assertEquals(await findingCount(pool, state.firstScan), 10);
}

async function assertDirectRolloutMutation(
  pool: Pool,
  cleanScan: string,
  suffix: string,
): Promise<void> {
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
}
