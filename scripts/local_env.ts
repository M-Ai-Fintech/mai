const outputPath = new URL("../infra/local/.env", import.meta.url);

const mvpEnvironmentLines = Object.freeze([
  "MAI_API_BASE_URL=http://localhost:18000",
  "MAI_FRONTEND_DATA_SOURCE=v1",
  "NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED=false",
  "MAI_LOCAL_MVP_ENABLED=true",
  "MAI_LOCAL_SESSION_ID=session_local-banker",
  "MAI_LOCAL_DEAL_ID=deal_serra-azul",
]);

export interface LocalSecretPair {
  readonly postgres: string;
  readonly storage: string;
}

export interface LocalEnvironmentOptions {
  readonly force?: boolean;
  readonly output?: URL;
  readonly secretFactory?: () => LocalSecretPair;
}

/** Builds the complete local runtime contract without emitting credentials. */
export function buildLocalEnvironment(
  secrets: LocalSecretPair = randomSecrets(),
): string {
  if (secrets.postgres === secrets.storage) {
    throw new Error(
      "Local PostgreSQL and storage secrets must be independently generated.",
    );
  }
  return [
    "LOCAL_POSTGRES_USER=mai_local",
    `LOCAL_POSTGRES_PASSWORD=${secrets.postgres}`,
    "LOCAL_POSTGRES_DATABASE=mai_local",
    "LOCAL_POSTGRES_PORT=55438",
    `DATABASE_URL=postgresql://mai_local:${
      encodeURIComponent(secrets.postgres)
    }@localhost:55438/mai_local`,
    "LOCAL_API_PORT=18000",
    "LOCAL_API_URL=http://localhost:18000",
    "LOCAL_STORAGE_PORT=19000",
    "LOCAL_STORAGE_ENDPOINT=http://localhost:19000",
    "LOCAL_STORAGE_ACCESS_KEY=mai_local",
    `LOCAL_STORAGE_SECRET_KEY=${secrets.storage}`,
    "LOCAL_STORAGE_BUCKET=mai-local",
    "LOCAL_STORAGE_DATA_DIR=.local/storage",
    "LOCAL_STORAGE_COMPOSE_DATA_DIR=../../.local/storage",
    "LOCAL_STORAGE_CHECK_DIR=.local/storage-check",
    "LOCAL_STORAGE_COMPOSE_CHECK_DIR=../../.local/storage-check",
    "LOCAL_WORKER_ID=worker_local",
    "LOCAL_WORKER_MODULE=./src/platform/jobs/local_worker.ts",
    "LOCAL_WORKER_HEALTH_PORT=18001",
    "LOCAL_WORKER_HEALTH_URL=http://localhost:18001",
    "LOCAL_RUNTIME_PROFILE=local",
    "MAI_AI_PROVIDER=disabled",
    "MAI_PAPERMARK_ENABLED=false",
    "MAI_STORAGE_PROVIDER=local-minio",
    "LOCAL_PREPROVISION_ROLES=true",
    ...mvpEnvironmentLines,
    "",
  ].join("\n");
}

/** Creates a local-only Compose environment without committing credentials. */
export async function writeLocalEnvironment(
  options: LocalEnvironmentOptions | boolean = {},
): Promise<void> {
  const normalized = typeof options === "boolean"
    ? { force: options }
    : options;
  const destination = normalized.output ?? outputPath;
  const force = normalized.force ?? Deno.args.includes("--force");
  if (await pathExists(destination)) {
    if (!force) {
      await backfillLocalMvpEnvironment(destination);
      console.log(
        "Local Compose environment already exists; preserved credentials and completed operational keys.",
      );
      return;
    }
  }
  const secretFactory = normalized.secretFactory ?? randomSecrets;
  const contents = buildLocalEnvironment(secretFactory());
  await Deno.mkdir(new URL(".", destination), { recursive: true });
  if (destination.pathname.endsWith("/infra/local/.env")) {
    await Deno.mkdir(new URL("../../.local/", destination), {
      recursive: true,
    });
  }
  await Deno.writeTextFile(destination, contents);
  await setOwnerOnlyPermissions(destination);
  console.log(
    `Created ignored local Compose environment at ${
      destination.pathname.replace(
        /^.*infra\//,
        "infra/",
      )
    }.`,
  );
}

async function backfillLocalMvpEnvironment(destination: URL): Promise<void> {
  const existing = await Deno.readTextFile(destination);
  const known = new Set(
    existing.split("\n").flatMap((line) => {
      const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
      return match === null ? [] : [match[1]];
    }),
  );
  const additions = mvpEnvironmentLines.filter((line) =>
    !known.has(line.slice(0, line.indexOf("=")))
  );
  if (additions.length === 0) return;
  const separator = existing.endsWith("\n") ? "" : "\n";
  await Deno.writeTextFile(
    destination,
    `${existing}${separator}${additions.join("\n")}\n`,
  );
  await setOwnerOnlyPermissions(destination);
}

function randomSecrets(): LocalSecretPair {
  return {
    postgres: `local-postgres-${crypto.randomUUID()}`,
    storage: `local-storage-${crypto.randomUUID()}`,
  };
}

async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function setOwnerOnlyPermissions(path: URL): Promise<void> {
  try {
    await Deno.chmod(path, 0o600);
  } catch (error) {
    if (error instanceof Deno.errors.NotSupported) return;
    throw error;
  }
}

if (import.meta.main) await writeLocalEnvironment();
