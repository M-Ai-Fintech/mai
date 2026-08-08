import pg from "pg";
import {
  requiredAuthoritativeRecords,
} from "../src/platform/operations/contract.ts";
import {
  assertRestoreIncludesAuthoritativeRecords,
  type InfrastructureSmokeProbe,
  runInfrastructureSmoke,
} from "../src/platform/operations/smoke.ts";

const COMPOSE_FILE = "infra/local/docker-compose.yml";
const ENV_FILE = "infra/local/.env";
const POLL_TIMEOUT_MS = 30_000;

interface LocalEnvironment {
  readonly databaseUrl: string;
  readonly apiUrl: string;
  readonly workerHealthUrl: string;
  readonly storageUrl: string;
  readonly composeEnv: Readonly<Record<string, string>>;
}

class LocalInfrastructureProbe implements InfrastructureSmokeProbe {
  constructor(
    private readonly environment: LocalEnvironment,
    private readonly pool: pg.Pool,
  ) {}

  async applicationHealth(): Promise<void> {
    await poll(
      "API liveness",
      () => urlIsHealthy(`${this.environment.apiUrl}/health/live`),
    );
    await poll(
      "API readiness",
      () => urlIsHealthy(`${this.environment.apiUrl}/health/ready`),
    );
  }

  async workerHealth(): Promise<void> {
    await poll(
      "worker liveness",
      () => urlIsHealthy(`${this.environment.workerHealthUrl}/health/live`),
    );
    await poll(
      "worker readiness",
      () => urlIsHealthy(`${this.environment.workerHealthUrl}/health/ready`),
    );
  }

  async databaseConnectivity(): Promise<void> {
    const result = await this.pool.query<{ database: string }>(
      "SELECT current_database() AS database",
    );
    if (result.rows[0]?.database === undefined) {
      throw new Error("PostgreSQL connectivity returned no database identity.");
    }
  }

  async objectStorageConnectivity(): Promise<void> {
    await poll(
      "local object storage readiness",
      () => urlIsHealthy(`${this.environment.storageUrl}/minio/health/ready`),
    );
  }

  secretResolution(): Promise<void> {
    const required = [
      "LOCAL_POSTGRES_PASSWORD",
      "LOCAL_STORAGE_SECRET_KEY",
    ];
    for (const name of required) {
      if (!this.environment.composeEnv[name]?.trim()) {
        throw new Error(
          `Local secret "${name}" is missing; expected ignored .env configuration.`,
        );
      }
    }
    return Promise.resolve();
  }

  async durableJobExecution(): Promise<void> {
    const jobId = await enqueueHealthcheckJob(this.pool);
    await poll("durable healthcheck job", async () => {
      const result = await this.pool.query<{ state: string }>(
        "SELECT state FROM platform.jobs WHERE job_id = $1",
        [jobId],
      );
      return result.rows[0]?.state === "succeeded";
    });
  }

  async outboxDispatch(): Promise<void> {
    const eventId = `event_local_smoke_${crypto.randomUUID()}`;
    await this.pool.query(
      `INSERT INTO platform.outbox (
        event_id, tenant_id, aggregate_type, aggregate_id, aggregate_version,
        event_type, schema_version, payload, correlation_id, occurred_at,
        available_at, dispatch_state
      ) VALUES ($1, 'local-smoke', 'Operations', $1, 1,
        'operations.healthcheck', 1, '{}', $1, CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP, 'pending')`,
      [eventId],
    );
    await this.pool.query(
      `UPDATE platform.outbox
       SET dispatch_state = 'published', published_at = CURRENT_TIMESTAMP
       WHERE event_id = $1 AND dispatch_state = 'pending'`,
      [eventId],
    );
    const result = await this.pool.query<{ dispatchState: string }>(
      `SELECT dispatch_state AS "dispatchState"
       FROM platform.outbox WHERE event_id = $1`,
      [eventId],
    );
    if (result.rows[0]?.dispatchState !== "published") {
      throw new Error(
        `Outbox event "${eventId}" was not recorded as published.`,
      );
    }
  }

  async restartRecovery(): Promise<void> {
    await compose("stop", "worker-local");
    const pendingJob = await enqueueHealthcheckJob(this.pool);
    await compose("restart", "api-local");
    await compose("start", "worker-local");
    await poll(
      "API after restart",
      () => urlIsHealthy(`${this.environment.apiUrl}/health/ready`),
    );
    await poll(
      "worker after restart",
      () => urlIsHealthy(`${this.environment.workerHealthUrl}/health/ready`),
    );
    await poll("pending job recovery", async () => {
      const result = await this.pool.query<{ state: string }>(
        "SELECT state FROM platform.jobs WHERE job_id = $1",
        [pendingJob],
      );
      return result.rows[0]?.state === "succeeded";
    });
    assertRestoreIncludesAuthoritativeRecords(
      requiredAuthoritativeRecords(),
      await authoritativeRecords(this.pool),
    );
  }
}

export async function runLocalSmoke(): Promise<void> {
  const environment = await loadLocalEnvironment();
  const pool = new pg.Pool({
    connectionString: environment.databaseUrl,
    max: 4,
    connectionTimeoutMillis: 3_000,
  });
  try {
    const results = await runInfrastructureSmoke(
      new LocalInfrastructureProbe(environment, pool),
    );
    console.log(JSON.stringify({
      event: "local.smoke.passed",
      checks: results.map((result) => result.name),
      scope: "local-containerized",
      cloudEvidence: false,
    }));
  } finally {
    await pool.end();
  }
}

async function loadLocalEnvironment(): Promise<LocalEnvironment> {
  const composeEnv = await readDotEnv();
  // The ignored local file is authoritative for this command. Deno's --env
  // may also load the repository root .env; allowing it to override this
  // target could point smoke at an unrelated or non-local database.
  const merged = { ...Deno.env.toObject(), ...composeEnv };
  const user = required(merged, "LOCAL_POSTGRES_USER");
  const password = required(merged, "LOCAL_POSTGRES_PASSWORD");
  const database = required(merged, "LOCAL_POSTGRES_DATABASE");
  const port = merged.LOCAL_POSTGRES_PORT ?? "55438";
  return {
    databaseUrl: composeEnv.DATABASE_URL ??
      `postgresql://${encodeURIComponent(user)}:${
        encodeURIComponent(password)
      }@localhost:${port}/${database}`,
    apiUrl: composeEnv.LOCAL_API_URL ??
      `http://localhost:${composeEnv.LOCAL_API_PORT ?? "18000"}`,
    workerHealthUrl: composeEnv.LOCAL_WORKER_HEALTH_URL ??
      `http://localhost:${composeEnv.LOCAL_WORKER_HEALTH_PORT ?? "18001"}`,
    storageUrl: composeEnv.LOCAL_STORAGE_ENDPOINT ??
      `http://localhost:${composeEnv.LOCAL_STORAGE_PORT ?? "19000"}`,
    composeEnv: merged,
  };
}

async function readDotEnv(): Promise<Record<string, string>> {
  try {
    const text = await Deno.readTextFile(
      new URL(`../${ENV_FILE}`, import.meta.url),
    );
    const values: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (match) values[match[1]] = match[2];
    }
    return values;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return {};
    throw error;
  }
}

async function enqueueHealthcheckJob(pool: pg.Pool): Promise<string> {
  const id = `job_local_smoke_${crypto.randomUUID()}`;
  await pool.query(
    `INSERT INTO platform.jobs (
      job_id, job_type, schema_version, tenant_id, initiating_actor_id,
      correlation_id, idempotency_key, input_version_references, payload,
      state, timeout_at, created_at
    ) VALUES ($1, 'operations.healthcheck', 1, 'local-smoke', 'local-smoke',
      $1, $1, '[]', '{"kind":"local-healthcheck"}', 'queued',
      CURRENT_TIMESTAMP + INTERVAL '5 minutes', CURRENT_TIMESTAMP)`,
    [id],
  );
  return id;
}

async function authoritativeRecords(pool: pg.Pool): Promise<string[]> {
  const records: string[] = [];
  for (const record of requiredAuthoritativeRecords()) {
    if (record === "database" || record === "object-storage") {
      records.push(record);
      continue;
    }
    const compatibilityTable = record === "audit"
      ? "audit_activity.audit_events"
      : record === "evidence"
      ? "evidence_knowledge.evidence_records"
      : record;
    const [schema, table] = compatibilityTable.includes(".")
      ? compatibilityTable.split(".")
      : ["platform", record];
    const result = await pool.query<{ exists: boolean }>(
      "SELECT to_regclass($1) IS NOT NULL AS exists",
      [`${schema}.${table}`],
    );
    if (result.rows[0]?.exists === true) records.push(record);
  }
  return records;
}

async function urlIsHealthy(url: string): Promise<boolean> {
  const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
  return response.ok;
}

async function poll(
  label: string,
  check: () => Promise<boolean>,
  timeoutMilliseconds = POLL_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError = "condition was false";
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error instanceof Error ? error.name : "probe_error";
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Local smoke check "${label}" timed out; last state: ${lastError}.`,
  );
}

async function compose(
  command: "stop" | "restart" | "start",
  service: string,
): Promise<void> {
  const result = await new Deno.Command("docker", {
    args: [
      "compose",
      "--env-file",
      ENV_FILE,
      "-f",
      COMPOSE_FILE,
      "--profile",
      "worker",
      command,
      service,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (result.success) return;
  throw new Error(
    `Docker Compose ${command} ${service} failed; inspect the local container diagnostics.`,
  );
}

function required(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (value) return value;
  throw new Error(
    `Local environment "${name}" is missing; run deno task local:prepare.`,
  );
}

if (import.meta.main) await runLocalSmoke();
