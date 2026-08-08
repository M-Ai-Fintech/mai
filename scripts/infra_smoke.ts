import pg from "pg";
import {
  type ClaimedOutboxEvent,
  OutboxDispatcher,
  type OutboxPublisher,
  OutboxRepository,
  sanitizedFailure,
} from "../src/platform/events/v1.ts";
import { PostgresTransactionRunner } from "../src/platform/persistence/v1.ts";
import {
  assertRecoveryIdentitiesPreserved,
  captureRecoveryManifest,
} from "./recovery_manifest.ts";
import { runLocalStorageProbe } from "./local_storage_probe.ts";
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
    await runLocalStorageProbe(this.environment);
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
    const transactions = new PostgresTransactionRunner(this.pool);
    const repository = new OutboxRepository();
    const sink = new LocalOutboxSink();
    const now = new Date();
    await transactions.run((transaction) =>
      repository.append(transaction, {
        eventId,
        tenantId: "tenant_local-smoke" as ClaimedOutboxEvent["tenantId"],
        aggregateType: "operations",
        aggregateId: eventId,
        aggregateVersion: 1 as ClaimedOutboxEvent["aggregateVersion"],
        eventType: "operations.healthcheck",
        schemaVersion: 1,
        payload: { source: "local-smoke" },
        correlationId: eventId as ClaimedOutboxEvent["correlationId"],
        occurredAt: now,
        availableAt: now,
      })
    );
    const dispatcher = new OutboxDispatcher({
      transactions,
      store: repository,
      publisher: sink,
      clock: new LocalClock(),
      retryPolicy: new NoRetryPolicy(),
      failureSanitizer: new LocalFailureSanitizer(),
    });
    const outcome = await dispatcher.dispatchOne("local-smoke", 30_000);
    if (outcome.status !== "published" || !sink.eventIds.has(eventId)) {
      throw new Error(
        `Outbox event "${eventId}" did not complete the lease-fenced local publication protocol.`,
      );
    }
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
    const before = await captureRecoveryManifest(
      this.pool,
      ".local/storage-check",
    );
    await compose("restart", "api-local");
    await compose("start", "worker-local");
    await compose("restart", "storage-local");
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
    await runLocalStorageProbe(this.environment, false);
    const after = await captureRecoveryManifest(
      this.pool,
      ".local/storage-check",
    );
    assertRecoveryIdentitiesPreserved(before, after);
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
    await ensureOperationalSentinels(pool);
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

async function ensureOperationalSentinels(pool: pg.Pool): Promise<void> {
  const digest = "a".repeat(64);
  await pool.query(
    `INSERT INTO deal_management.deals (
       deal_id, tenant_id, workspace_id, version, state, document,
       created_at, updated_at
     ) VALUES (
       'deal-local-smoke', 'tenant_local-smoke', 'workspace_local-smoke',
       1, 'draft', '{"source":"local-smoke"}', now(), now()
     ) ON CONFLICT (tenant_id, workspace_id, deal_id) DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO audit_activity.audit_events (
       event_id, tenant_id, workspace_id, deal_id, actor_id, actor_kind,
       origin, correlation_id, aggregate_type, aggregate_id, aggregate_version,
       event_type, schema_version, authority_snapshot, evidence_snapshot,
       provenance, payload, classifications, content_digest, occurred_at
     ) VALUES (
       'audit-local-smoke', 'tenant_local-smoke', 'workspace_local-smoke',
       'deal_local-smoke', 'actor_local-smoke', 'system', 'internal',
       'cor_local-smoke', 'operations', 'local-smoke', 1,
       'operations.local_smoke', 1, '{}', '{}', '{}', '{}', '{}', $1, now()
     ) ON CONFLICT (event_id) DO NOTHING`,
    [digest],
  );
  await pool.query(
    `INSERT INTO evidence_knowledge.citations (
       citation_id, tenant_id, workspace_id, deal_id, document_version_id,
       checksum_algorithm, checksum_value, location, classification,
       processing_version, excerpt, freshness_state, freshness_checked_at,
       created_at
     ) VALUES (
       'citation-local-smoke', 'tenant_local-smoke', 'workspace_local-smoke',
       'deal_local-smoke', 'document-local-smoke', 'sha256', $1, '{}',
       'operational', 'local-smoke-v1', 'local recovery sentinel', 'current',
       now(), now()
     ) ON CONFLICT (citation_id) DO NOTHING`,
    [digest],
  );
  await pool.query(
    `INSERT INTO evidence_knowledge.evidence_records (
       evidence_id, tenant_id, workspace_id, deal_id, citation_id, created_at
     ) VALUES (
       'evidence-local-smoke', 'tenant_local-smoke', 'workspace_local-smoke',
       'deal_local-smoke', 'citation-local-smoke', now()
     ) ON CONFLICT (evidence_id) DO NOTHING`,
  );
}

async function loadLocalEnvironment(): Promise<LocalEnvironment> {
  const composeEnv = await readDotEnv();
  // The ignored local file is authoritative for this command. Deno's --env
  // may also load the repository root .env; allowing it to override this
  // target could point smoke at an unrelated or non-local database.
  const merged = { ...Deno.env.toObject(), ...composeEnv };
  if (merged.LOCAL_RUNTIME_PROFILE !== "local") {
    throw new Error(
      `Local smoke runtime profile is "${
        String(merged.LOCAL_RUNTIME_PROFILE)
      }"; expected explicit LOCAL_RUNTIME_PROFILE=local.`,
    );
  }
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
      : record === "domain"
      ? "deal_management.deals"
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

class LocalOutboxSink implements OutboxPublisher {
  readonly eventIds = new Set<string>();

  publish(event: ClaimedOutboxEvent): Promise<void> {
    if (this.eventIds.has(event.eventId)) {
      throw new Error(
        `Local outbox sink received duplicate event "${event.eventId}".`,
      );
    }
    this.eventIds.add(event.eventId);
    return Promise.resolve();
  }
}

class LocalClock {
  now(): Date {
    return new Date();
  }
}

class NoRetryPolicy {
  nextAttempt(): undefined {
    return undefined;
  }
}

class LocalFailureSanitizer {
  sanitize(): ReturnType<typeof sanitizedFailure> {
    return sanitizedFailure("LOCAL_SINK_FAILED");
  }
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
