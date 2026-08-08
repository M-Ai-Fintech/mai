import pg from "pg";

const DEFAULT_BACKUP_ROOT = ".local/backups";
const ACTIVE_STORAGE_ROOT = ".local/storage";
const COMPOSE_FILE = "infra/local/docker-compose.yml";
const ENV_FILE = "infra/local/.env";

interface Artifact {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

interface BackupManifest {
  readonly format: "mai-local-backup-v1";
  readonly createdAt: string;
  readonly database: Artifact;
  readonly objectStorage: Artifact;
}

export async function createLocalBackup(): Promise<void> {
  const databaseUrl = requiredLocalUrl(Deno.env.get("DATABASE_URL"));
  const storageRoot = Deno.env.get("LOCAL_STORAGE_DATA_DIR") ??
    ACTIVE_STORAGE_ROOT;
  const backupDirectory = Deno.env.get("BACKUP_DIR") ??
    `${DEFAULT_BACKUP_ROOT}/${timestamp()}`;
  await Deno.mkdir(backupDirectory, { recursive: true });
  const databasePath = `${backupDirectory}/database.dump`;
  const storagePath = `${backupDirectory}/object-storage.tar`;
  await dumpLocalDatabase(databaseUrl, databasePath);
  await runHostCommand("tar", [
    "--sort=name",
    "--mtime=UTC 1970-01-01",
    "--owner=0",
    "--group=0",
    "--numeric-owner",
    "-cf",
    storagePath,
    "-C",
    storageRoot,
    ".",
  ]);
  const manifest: BackupManifest = {
    format: "mai-local-backup-v1",
    createdAt: new Date().toISOString(),
    database: await artifact(databasePath),
    objectStorage: await artifact(storagePath),
  };
  await Deno.writeTextFile(
    `${backupDirectory}/manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    event: "local.backup.created",
    backupDirectory,
    database: manifest.database,
    objectStorage: manifest.objectStorage,
  }));
}

export async function restoreLocalBackup(): Promise<void> {
  const activeDatabase = requiredLocalUrl(Deno.env.get("DATABASE_URL"));
  const restoreDatabase = requiredLocalUrl(
    Deno.env.get("RESTORE_DATABASE_URL"),
  );
  const activeName = new URL(activeDatabase).pathname;
  if (new URL(restoreDatabase).pathname === activeName) {
    throw new Error(
      `Restore database "${activeName}" is the active target; expected an isolated non-production database.`,
    );
  }
  const backupDirectory = Deno.env.get("BACKUP_DIR");
  if (backupDirectory === undefined) {
    throw new Error(
      "Backup directory is missing; expected BACKUP_DIR from a completed local backup.",
    );
  }
  const manifest = JSON.parse(
    await Deno.readTextFile(`${backupDirectory}/manifest.json`),
  ) as BackupManifest;
  await assertArtifact(
    `${backupDirectory}/${manifest.database.path.split("/").pop()}`,
    manifest.database,
  );
  await assertArtifact(
    `${backupDirectory}/${manifest.objectStorage.path.split("/").pop()}`,
    manifest.objectStorage,
  );
  const targetStorage = Deno.env.get("RESTORE_STORAGE_DIR");
  if (targetStorage === undefined) {
    throw new Error(
      "Restore storage directory is missing; expected an isolated target path.",
    );
  }
  const activeStorage = await absolutePath(
    Deno.env.get("LOCAL_STORAGE_DATA_DIR") ?? ACTIVE_STORAGE_ROOT,
  );
  const restoredStorage = await absolutePath(targetStorage);
  if (activeStorage === restoredStorage) {
    throw new Error(
      `Restore storage directory "${restoredStorage}" is active; expected an isolated target path.`,
    );
  }
  await Deno.mkdir(targetStorage, { recursive: true });
  if ((await Array.fromAsync(Deno.readDir(targetStorage))).length > 0) {
    throw new Error(
      `Restore storage directory "${targetStorage}" is not empty; expected a new isolated target.`,
    );
  }
  const databasePath = `${backupDirectory}/database.dump`;
  const storagePath = `${backupDirectory}/object-storage.tar`;
  await restoreLocalDatabase(restoreDatabase, databasePath, activeDatabase);
  await runHostCommand("tar", ["-xf", storagePath, "-C", targetStorage]);
  const evidence = await restoreEvidence(restoreDatabase);
  console.log(JSON.stringify({
    event: "local.backup.restored",
    restoreDatabase: new URL(restoreDatabase).pathname,
    restoreStorage: restoredStorage,
    ...evidence,
  }));
}

async function dumpLocalDatabase(
  databaseUrl: string,
  databasePath: string,
): Promise<void> {
  const credentials = localDatabaseCredentials(databaseUrl);
  const output = await runOutputCommand([
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "exec",
    "-T",
    "postgres-local",
    "pg_dump",
    "--format=custom",
    "-U",
    credentials.user,
    "-d",
    credentials.database,
  ]);
  await Deno.writeFile(databasePath, output);
}

async function restoreLocalDatabase(
  restoreDatabaseUrl: string,
  databasePath: string,
  activeDatabaseUrl: string,
): Promise<void> {
  const target = localDatabaseCredentials(restoreDatabaseUrl);
  const active = localDatabaseCredentials(activeDatabaseUrl);
  if (target.database === active.database) {
    throw new Error(
      `Restore database "${target.database}" is the active target; expected an isolated non-production database.`,
    );
  }
  await runCommand([
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "exec",
    "-T",
    "postgres-local",
    "createdb",
    "-U",
    target.user,
    target.database,
  ]);
  const dump = await Deno.readFile(databasePath);
  await runInputCommand([
    "compose",
    "--env-file",
    ENV_FILE,
    "-f",
    COMPOSE_FILE,
    "exec",
    "-T",
    "postgres-local",
    "pg_restore",
    "--exit-on-error",
    "--no-owner",
    "--dbname",
    target.database,
    "-U",
    target.user,
    "-",
  ], dump);
}

async function restoreEvidence(
  databaseUrl: string,
): Promise<Record<string, number>> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const result: Record<string, number> = {};
    for (const table of ["migration_ledger", "jobs", "outbox", "inbox"]) {
      const schema = table === "migration_ledger" ? "platform" : "platform";
      const rows = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${schema}.${table}`,
      );
      result[table] = Number(rows.rows[0]?.count ?? "0");
    }
    return result;
  } finally {
    await pool.end();
  }
}

async function artifact(path: string): Promise<Artifact> {
  const bytes = await Deno.readFile(path);
  return { path, bytes: bytes.byteLength, sha256: await sha256(bytes) };
}

async function assertArtifact(path: string, expected: Artifact): Promise<void> {
  const actual = await artifact(path);
  if (actual.bytes === expected.bytes && actual.sha256 === expected.sha256) {
    return;
  }
  throw new Error(
    `Backup artifact "${path}" failed checksum verification; expected ${expected.sha256}, received ${actual.sha256}.`,
  );
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as BufferSource,
  );
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

async function runCommand(args: readonly string[]): Promise<void> {
  const result = await new Deno.Command("docker", {
    args: [...args],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (result.success) return;
  throw new Error(
    "Local recovery Docker command failed; inspect its exit code without printing credentials.",
  );
}

async function runHostCommand(
  command: string,
  args: readonly string[],
): Promise<void> {
  const result = await new Deno.Command(command, {
    args: [...args],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (result.success) return;
  throw new Error(
    `Local recovery command "${command}" failed; inspect its exit code without printing credentials.`,
  );
}

async function runOutputCommand(args: readonly string[]): Promise<Uint8Array> {
  const result = await new Deno.Command("docker", {
    args: [...args],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (result.success) return result.stdout;
  throw new Error(
    "Local recovery Docker dump command failed; inspect its exit code without printing credentials.",
  );
}

async function runInputCommand(
  args: readonly string[],
  input: Uint8Array,
): Promise<void> {
  const child = new Deno.Command("docker", {
    args: [...args],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = child.stdin.getWriter();
  await writer.write(input);
  await writer.close();
  const result = await child.output();
  if (result.success) return;
  throw new Error(
    "Local recovery Docker restore command failed; inspect its exit code without printing credentials.",
  );
}

function localDatabaseCredentials(value: string): {
  readonly user: string;
  readonly database: string;
} {
  const url = new URL(value);
  const user = Deno.env.get("LOCAL_POSTGRES_USER") ??
    decodeURIComponent(url.username);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (
    !/^[a-z_][a-z0-9_]*$/.test(user) ||
    !/^[a-z_][a-z0-9_]*$/.test(database)
  ) {
    throw new Error(
      `Local recovery database identity "${user}/${database}" is invalid; expected safe PostgreSQL identifiers.`,
    );
  }
  return { user, database };
}

function requiredLocalUrl(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      "Local recovery database URL is missing; expected DATABASE_URL or RESTORE_DATABASE_URL.",
    );
  }
  const url = new URL(value);
  if (
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    !["postgres:", "postgresql:"].includes(url.protocol)
  ) {
    throw new Error(
      `Local recovery database target "${url.hostname}/${url.protocol}" is not local; cloud targets are out of scope.`,
    );
  }
  return value;
}

async function absolutePath(path: string): Promise<string> {
  const resolved = await Deno.realPath(path).catch(() => undefined);
  return resolved ?? `${Deno.cwd()}/${path}`;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[.:]/g, "-");
}

const command = Deno.args[0];
if (import.meta.main && command === "backup") await createLocalBackup();
if (import.meta.main && command === "restore") await restoreLocalBackup();
