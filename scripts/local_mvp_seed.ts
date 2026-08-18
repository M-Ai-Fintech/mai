import pg from "pg";
import {
  assertLocalMvpSeedTarget,
  localMvpIdentity,
  seedLocalMvpIdentity,
} from "../src/local_mvp/identity_seed.ts";
import {
  localMvpDeals,
  seedLocalMvpPortfolio,
} from "../src/local_mvp/portfolio_seed.ts";
import { resetLocalMvpScenario } from "../src/local_mvp/reset.ts";
import {
  localMvpScenarioContexts,
  seedLocalMvpScenario,
} from "../src/local_mvp/scenario_seed.ts";
import { seedLocalMvpWorkflow } from "../src/local_mvp/workflow_seed.ts";
import type { DemoPersistenceResult } from "../src/demo_readiness/persistence.ts";

export interface LocalMvpSeedOptions {
  readonly reset?: boolean;
}

/** Prepares the deterministic local database and returns redacted evidence. */
export async function runLocalMvpSeed(
  environment: Readonly<Record<string, string | undefined>> = Deno.env
    .toObject(),
  options: LocalMvpSeedOptions = {},
): Promise<void> {
  const target = assertLocalMvpSeedTarget(environment);
  const pool = new pg.Pool({ connectionString: target.toString(), max: 2 });
  try {
    if (options.reset) await resetLocalMvpScenario(pool);
    const workflow = await seedLocalMvpDatabase(pool);
    printSeedReceipt(workflow.kind);
  } finally {
    await pool.end();
  }
}

/**
 * Seeds one idempotent scenario into a caller-owned migrated database.
 *
 * @example await seedLocalMvpDatabase(testPool)
 */
export async function seedLocalMvpDatabase(
  pool: pg.Pool,
): Promise<DemoPersistenceResult> {
  await seedScenarioTransaction(pool);
  return await seedLocalMvpWorkflow(pool);
}

async function seedScenarioTransaction(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await seedLocalMvpIdentity(client);
    await seedLocalMvpPortfolio(client);
    await seedLocalMvpScenario(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function printSeedReceipt(workflow: "created" | "replayed"): void {
  console.log(JSON.stringify({
    event: "local_mvp.scenario_seeded",
    tenantId: localMvpIdentity.tenantId,
    workspaceId: localMvpIdentity.workspaceId,
    sessionId: localMvpIdentity.sessionId,
    deals: localMvpDeals.map((deal) => deal.name),
    contexts: localMvpScenarioContexts.map((context) => context.name),
    workflow,
  }));
}

if (import.meta.main) {
  await runLocalMvpSeed(Deno.env.toObject(), {
    reset: Deno.args.includes("--reset"),
  });
}
