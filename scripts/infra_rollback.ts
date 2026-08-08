import pg from "pg";
import {
  assertRecoveryManifestsEqual,
  captureRecoveryManifest,
} from "./recovery_manifest.ts";

const COMPOSE_FILE = "infra/local/docker-compose.yml";
const ENV_FILE = "infra/local/.env";

/** Exercises a prior compatible local image without changing database/storage data. */
export async function runPriorImageRollback(): Promise<void> {
  if (Deno.env.get("LOCAL_RUNTIME_PROFILE") !== "local") {
    throw new Error(
      `Local rollback runtime profile is "${
        String(Deno.env.get("LOCAL_RUNTIME_PROFILE"))
      }"; expected explicit LOCAL_RUNTIME_PROFILE=local.`,
    );
  }
  const priorImage = required("LOCAL_PRIOR_IMAGE");
  const databaseUrl = required("DATABASE_URL");
  assertLocalDatabase(databaseUrl);
  await docker(["image", "inspect", priorImage]);
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const currentImage = Deno.env.get("LOCAL_APP_IMAGE") ?? "mai-local:current";
  const beforeStorage = ".local/rollback-storage-before";
  const afterStorage = ".local/rollback-storage-after";
  await runStorageExport(beforeStorage);
  const before = await captureRecoveryManifest(pool, beforeStorage);
  try {
    await compose(["stop", "api-local", "worker-local"]);
    await composeWithImage(priorImage, [
      "up",
      "-d",
      "--no-build",
      "--wait",
      "api-local",
      "worker-local",
    ]);
    await pollReadiness("api", Deno.env.get("LOCAL_API_PORT") ?? "18000");
    await pollReadiness(
      "worker",
      Deno.env.get("LOCAL_WORKER_PORT") ?? "18001",
    );
    await runStorageExport(afterStorage);
    const after = await captureRecoveryManifest(pool, afterStorage);
    assertRecoveryManifestsEqual(before, after);
    console.log(JSON.stringify({
      event: "local.rollback.passed",
      priorImage,
      databaseRetained: true,
      authoritative: summarizeManifest(before),
      restoredAuthoritative: summarizeManifest(after),
      migrationsReversed: false,
    }));
  } finally {
    await composeWithImage(currentImage, [
      "up",
      "-d",
      "--no-build",
      "--wait",
      "api-local",
      "worker-local",
    ]);
    await Deno.remove(beforeStorage, { recursive: true }).catch(() => {});
    await Deno.remove(afterStorage, { recursive: true }).catch(() => {});
    await pool.end();
  }
}

async function pollReadiness(service: string, port: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/health/ready`,
      );
      if (response.ok) return;
    } catch {
      // The bounded poll records only the final state, never credentials.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Prior-image rollback did not restore ${service} readiness within 30 seconds.`,
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

async function compose(args: readonly string[]): Promise<void> {
  await docker([
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "--profile",
    "worker",
    ...args,
  ]);
}

async function runStorageExport(directory: string): Promise<void> {
  const relative = directory.replace(/^\.local\//, "");
  await docker([
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "--profile",
    "backup",
    "run",
    "--rm",
    "-e",
    `LOCAL_STORAGE_BACKUP_SUBPATH=${relative}`,
    "storage-export-local",
  ]);
}

function summarizeManifest(
  manifest: Awaited<ReturnType<typeof captureRecoveryManifest>>,
): Record<string, unknown> {
  return {
    format: manifest.format,
    migrationLedger: manifest.migrationLedger.length,
    jobs: manifest.jobs.length,
    outbox: manifest.outbox.length,
    inbox: manifest.inbox.length,
    audit: manifest.audit.length,
    evidence: manifest.evidence.length,
    domain: manifest.domain.length,
    objects: manifest.objects.map(({ key, bytes, sha256 }) => ({
      key,
      bytes,
      sha256,
    })),
  };
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
