import pg from "pg";

const COMPOSE_FILE = "infra/local/docker-compose.yml";
const ENV_FILE = "infra/local/.env";

interface Counts {
  readonly migrations: number;
  readonly jobs: number;
  readonly outbox: number;
  readonly inbox: number;
}

/** Exercises a prior compatible local image without changing database/storage data. */
export async function runPriorImageRollback(): Promise<void> {
  const priorImage = required("LOCAL_PRIOR_IMAGE");
  const databaseUrl = required("DATABASE_URL");
  assertLocalDatabase(databaseUrl);
  await docker(["image", "inspect", priorImage]);
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const before = await counts(pool);
  try {
    await composeWithImage(priorImage, [
      "up",
      "-d",
      "--no-build",
      "--wait",
      "api-local",
      "worker-local",
    ]);
    await pollHealth();
    const after = await counts(pool);
    assertNoLoss(before, after);
    console.log(JSON.stringify({
      event: "local.rollback.passed",
      priorImage,
      databaseRetained: true,
      authoritativeCountsBefore: before,
      authoritativeCountsAfter: after,
      migrationsReversed: false,
    }));
  } finally {
    await pool.end();
  }
}

async function counts(pool: pg.Pool): Promise<Counts> {
  const read = async (table: string): Promise<number> => {
    const result = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM platform.${table}`,
    );
    return Number(result.rows[0]?.count ?? "0");
  };
  return {
    migrations: await read("migration_ledger"),
    jobs: await read("jobs"),
    outbox: await read("outbox"),
    inbox: await read("inbox"),
  };
}

function assertNoLoss(before: Counts, after: Counts): void {
  for (const key of Object.keys(before) as (keyof Counts)[]) {
    if (after[key] >= before[key]) continue;
    throw new Error(
      `Rollback reduced authoritative ${key} from ${before[key]} to ${
        after[key]
      }; expected retained records.`,
    );
  }
}

async function pollHealth(): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        `http://localhost:${
          Deno.env.get("LOCAL_API_PORT") ?? "18000"
        }/health/ready`,
      );
      if (response.ok) return;
    } catch {
      // The bounded poll records only the final state, never credentials.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    "Prior-image rollback did not restore API readiness within 30 seconds.",
  );
}

async function composeWithImage(
  image: string,
  args: readonly string[],
): Promise<void> {
  const environment = { ...Deno.env.toObject(), LOCAL_APP_IMAGE: image };
  await docker([
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "--profile",
    "worker",
    ...args,
  ], environment);
}

async function docker(
  args: readonly string[],
  environment?: Readonly<Record<string, string>>,
): Promise<void> {
  const result = await new Deno.Command("docker", {
    args: [...args],
    env: environment,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (result.success) return;
  throw new Error(
    "Local rollback Docker command failed; inspect container diagnostics without printing credentials.",
  );
}

function required(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (value) return value;
  throw new Error(
    `Rollback environment "${name}" is missing; expected an explicit local value.`,
  );
}

function assertLocalDatabase(value: string): void {
  const url = new URL(value);
  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return;
  throw new Error(
    `Rollback database host "${url.hostname}" is not local; cloud rollback is out of scope.`,
  );
}

if (import.meta.main) await runPriorImageRollback();
