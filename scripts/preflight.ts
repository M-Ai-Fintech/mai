import { Client } from "pg";
import {
  checkBrowserDependencies,
  checkDenoCache,
  checkNodeDependencies,
  prepareBrowserDependencies,
  prepareNodeDependencies,
} from "./preflight_dependencies.ts";

export type PreflightStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "unavailable";

export interface PreflightResult {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  readonly status: PreflightStatus;
  readonly detail: string;
}

export interface PreflightCommandResult {
  readonly success: boolean;
  readonly output: string;
}

export type PreflightCommandRunner = (
  command: string,
  args: readonly string[],
) => Promise<PreflightCommandResult>;

export type DatabaseProbe = (databaseUrl: string) => Promise<string>;
export type FilePresenceProbe = (path: string) => Promise<boolean>;

export interface PreflightOptions {
  readonly environment?: Record<string, string | undefined>;
  readonly commandRunner?: PreflightCommandRunner;
  readonly databaseProbe?: DatabaseProbe;
  readonly databaseProvisioner?: (databaseUrl: string) => Promise<void>;
  readonly filePresenceProbe?: FilePresenceProbe;
  readonly prepare?: boolean;
  readonly checkPush?: boolean;
}

const TEST_DATABASE_NAME = "mai_test_postgres_integration";
const NOTIFICATIONS_DATABASE_NAME = "mai_test_notifications_integration";
const DEFAULT_TEST_DATABASE_PORT = "55432";
const COMMAND_TIMEOUT_MS = 15_000;
const PREPARE_COMMAND_TIMEOUT_MS = 300_000;
const DATABASE_TARGETS = [
  {
    environmentKey: "POSTGRES_INTEGRATION_TEST_DATABASE_URL",
    expectedName: TEST_DATABASE_NAME,
    id: "postgres-target",
    label: "Approved PostgreSQL target",
  },
  {
    environmentKey: "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL",
    expectedName: NOTIFICATIONS_DATABASE_NAME,
    id: "notifications-target",
    label: "Approved Notifications PostgreSQL target",
  },
] as const;

export async function runPreflight(
  options: PreflightOptions = {},
): Promise<PreflightResult[]> {
  const environment = options.environment ?? Deno.env.toObject();
  const commandRunner = options.commandRunner ?? runCommand;
  const databaseProbe = options.databaseProbe ?? probeDatabase;
  const databaseProvisioner = options.databaseProvisioner ?? ensureDatabase;
  const filePresenceProbe = options.filePresenceProbe ?? fileExists;
  const results: PreflightResult[] = [];
  if (options.prepare) {
    results.push(await prepareEnvironment(commandRunner));
    results.push(
      await prepareNodeDependencies(commandRunner, filePresenceProbe),
    );
    results.push(
      await prepareBrowserDependencies(
        environment,
        commandRunner,
        filePresenceProbe,
      ),
    );
    results.push(
      await prepareDatabaseTargets(environment, databaseProvisioner),
    );
  }
  results.push(await checkDocker(commandRunner));
  for (const target of DATABASE_TARGETS) {
    results.push(await checkDatabaseTarget(environment, databaseProbe, target));
  }
  results.push(await checkDenoCache(commandRunner, options.prepare === true));
  results.push(await checkNodeDependencies(filePresenceProbe));
  results.push(await checkBrowserDependencies(environment, filePresenceProbe));
  results.push(await checkGitRemote(commandRunner, options.checkPush === true));
  results.push(papermarkHookResult(environment));
  return results;
}

export function hasPreflightFailures(
  results: readonly PreflightResult[],
): boolean {
  return results.some((result) =>
    result.required && result.status !== "passed"
  );
}

export function formatPreflight(
  results: readonly PreflightResult[],
): string {
  const lines = ["MA&I environment preflight:"];
  for (const result of results) {
    lines.push(
      `  ${result.status.toUpperCase()} ${result.label}: ${result.detail}`,
    );
  }
  const failed = results.filter((result) => result.status === "failed").length;
  const unavailable =
    results.filter((result) => result.status === "unavailable").length;
  lines.push(
    `Preflight summary: ${failed} failed, ${unavailable} unavailable.`,
  );
  lines.push(`PREFLIGHT_RESULT_JSON=${JSON.stringify({ results })}`);
  return lines.join("\n");
}

function prepareEnvironment(
  commandRunner: PreflightCommandRunner,
): Promise<PreflightResult> {
  return commandResult(
    "prepare-postgres-service",
    "Prepare approved PostgreSQL service",
    true,
    commandRunner,
    "docker",
    ["compose", "up", "-d", "--wait", "postgres-integration-test"],
    "Persistent service requested; healthy containers are reused.",
  );
}

async function prepareDatabaseTargets(
  environment: Record<string, string | undefined>,
  provisioner: (databaseUrl: string) => Promise<void>,
): Promise<PreflightResult> {
  try {
    for (const target of DATABASE_TARGETS) {
      const databaseUrl = environment[target.environmentKey];
      if (databaseUrl === undefined) continue;
      assertApprovedDatabaseUrl(databaseUrl, environment, target.expectedName);
      await provisioner(databaseUrl);
    }
    return passedResult(
      "prepare-database-targets",
      "Prepare approved database targets",
      "Configured isolated databases are ready or already exist.",
    );
  } catch (error) {
    return failedResult(
      "prepare-database-targets",
      "Prepare approved database targets",
      errorMessage(error),
    );
  }
}

async function checkDocker(
  commandRunner: PreflightCommandRunner,
): Promise<PreflightResult> {
  const info = await commandRunner("docker", ["info"]);
  if (!info.success) {
    return unavailableResult(
      "docker",
      "Docker daemon",
      "Docker is unavailable; start Docker before canonical verification.",
    );
  }
  const service = await commandRunner("docker", [
    "compose",
    "ps",
    "--status",
    "running",
    "--services",
  ]);
  if (
    !service.success || !service.output.includes("postgres-integration-test")
  ) {
    return failedResult(
      "postgres-service",
      "PostgreSQL service",
      "postgres-integration-test is not running; run deno task prepare.",
    );
  }
  const health = await commandRunner("docker", [
    "compose",
    "ps",
    "--status",
    "running",
    "--format",
    "{{.Service}} {{.Health}}",
    "postgres-integration-test",
  ]);
  if (!health.success || !health.output.includes("healthy")) {
    return failedResult(
      "postgres-health",
      "PostgreSQL health",
      "postgres-integration-test is running but not healthy.",
    );
  }
  return passedResult(
    "docker",
    "Docker daemon",
    "Docker and PostgreSQL are healthy.",
  );
}

async function checkDatabaseTarget(
  environment: Record<string, string | undefined>,
  databaseProbe: DatabaseProbe,
  target: (typeof DATABASE_TARGETS)[number],
): Promise<PreflightResult> {
  const databaseUrl = environment[target.environmentKey];
  try {
    assertApprovedDatabaseUrl(databaseUrl, environment, target.expectedName);
    const database = await databaseProbe(databaseUrl);
    return passedResult(
      target.id,
      target.label,
      `Connected to isolated database '${database}'.`,
    );
  } catch (error) {
    return failedResult(
      target.id,
      target.label,
      errorMessage(error),
    );
  }
}

async function checkGitRemote(
  commandRunner: PreflightCommandRunner,
  checkPush: boolean,
): Promise<PreflightResult> {
  const remote = await commandRunner("git", ["remote", "get-url", "origin"]);
  if (!remote.success) {
    return failedResult(
      "git-remote",
      "Git remote",
      "origin is not configured.",
    );
  }
  if (!checkPush) {
    return passedResult(
      "git-remote",
      "Git remote",
      "origin is configured; push check not requested.",
    );
  }
  const push = await commandRunner("git", [
    "push",
    "--dry-run",
    "origin",
    "HEAD",
  ]);
  return push.success
    ? passedResult(
      "git-push",
      "Authorized Git push",
      "git push --dry-run succeeded.",
    )
    : failedResult("git-push", "Authorized Git push", push.output);
}

function papermarkHookResult(
  environment: Record<string, string | undefined>,
): PreflightResult {
  const enabled = environment.MAI_PAPERMARK_PREWARM === "1";
  return enabled
    ? unavailableResult(
      "papermark-hook",
      "Papermark prewarm hook",
      "Hook requested but no Papermark prewarm implementation is configured.",
    )
    : {
      id: "papermark-hook",
      label: "Papermark prewarm hook",
      required: false,
      status: "skipped",
      detail: "Future-provider hook is disabled by configuration.",
    };
}

function assertApprovedDatabaseUrl(
  value: string | undefined,
  environment: Record<string, string | undefined>,
  expectedDatabaseName: string,
): asserts value is string {
  if (value === undefined) {
    throw new Error(
      `Approved database target is missing; expected '/${expectedDatabaseName}'.`,
    );
  }
  const parsed = new URL(value);
  const expectedPort = environment.POSTGRES_INTEGRATION_TEST_PORT ??
    DEFAULT_TEST_DATABASE_PORT;
  if (!/^postgres(?:ql)?$/.test(parsed.protocol.slice(0, -1))) {
    throw new Error(
      `PostgreSQL target protocol '${parsed.protocol}' is unsafe; expected postgres or postgresql.`,
    );
  }
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(parsed.hostname)) {
    throw new Error(
      `PostgreSQL target host '${parsed.hostname}' is unsafe; expected a local approved test host.`,
    );
  }
  if (parsed.port !== expectedPort) {
    throw new Error(
      `PostgreSQL target port '${parsed.port}' is unsafe; expected '${expectedPort}'.`,
    );
  }
  if (parsed.pathname !== `/${expectedDatabaseName}`) {
    throw new Error(
      `PostgreSQL target database '${parsed.pathname}' is unsafe; expected '/${expectedDatabaseName}'.`,
    );
  }
}

async function ensureDatabase(databaseUrl: string): Promise<void> {
  const target = new URL(databaseUrl);
  const databaseName = target.pathname.slice(1);
  target.pathname = "/postgres";
  const client = new Client(target.toString());
  try {
    await client.connect();
    const existing = await client.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [databaseName],
    );
    if (existing.rows[0]?.exists === true) return;
    await client.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await client.end().catch(() => {});
  }
}

function passedResult(
  id: string,
  label: string,
  detail: string,
): PreflightResult {
  return { id, label, required: true, status: "passed", detail };
}

function failedResult(
  id: string,
  label: string,
  detail: string,
): PreflightResult {
  return { id, label, required: true, status: "failed", detail };
}

function unavailableResult(
  id: string,
  label: string,
  detail: string,
): PreflightResult {
  return { id, label, required: true, status: "unavailable", detail };
}

async function runCommand(
  command: string,
  args: readonly string[],
): Promise<PreflightCommandResult> {
  try {
    const timeoutMs = commandTimeout(command, args);
    const child = new Deno.Command(command, {
      args: [...args],
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<PreflightCommandResult>((resolve) => {
      timeoutId = setTimeout(() => {
        try {
          child.kill("SIGTERM");
        } catch {
          // The child may have exited between the race and the timeout.
        }
        resolve({ success: false, output: `Command '${command}' timed out.` });
      }, timeoutMs);
    });
    const output = child.output().then((result) => ({
      success: result.success,
      output: decodeOutput(result.stdout, result.stderr),
    }));
    try {
      return await Promise.race([output, timeout]);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  } catch (error) {
    return { success: false, output: errorMessage(error) };
  }
}

function commandTimeout(command: string, args: readonly string[]): number {
  const isPreparation = command === "npm" || args.includes("cache") ||
    args.includes("up");
  return isPreparation ? PREPARE_COMMAND_TIMEOUT_MS : COMMAND_TIMEOUT_MS;
}

function commandResult(
  id: string,
  label: string,
  required: boolean,
  commandRunner: PreflightCommandRunner,
  command: string,
  args: readonly string[],
  successDetail: string,
): Promise<PreflightResult> {
  return commandRunner(command, args).then((result) =>
    result.success
      ? { id, label, required, status: "passed", detail: successDetail }
      : { id, label, required, status: "failed", detail: result.output }
  );
}

async function probeDatabase(databaseUrl: string): Promise<string> {
  const client = new Client(databaseUrl);
  try {
    await client.connect();
    const result = await client.query<{ database: string }>(
      "SELECT current_database() AS database",
    );
    return result.rows[0]?.database ?? "";
  } finally {
    await client.end().catch(() => {});
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const entry = await Deno.stat(path);
    return entry.isDirectory || entry.isFile;
  } catch {
    return false;
  }
}

function decodeOutput(stdout: Uint8Array, stderr: Uint8Array): string {
  const decoder = new TextDecoder();
  return `${decoder.decode(stdout)}${decoder.decode(stderr)}`.trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.main) {
  const results = await runPreflight({
    checkPush: Deno.args.includes("--check-push"),
    prepare: Deno.args.includes("--prepare"),
  });
  console.log(formatPreflight(results));
  if (hasPreflightFailures(results)) Deno.exit(1);
}
