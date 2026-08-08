import type { DatabaseProbe, PreflightResult } from "./preflight.ts";

const TEST_DATABASE_NAME = "mai_test_postgres_integration";
const NOTIFICATIONS_DATABASE_NAME = "mai_test_notifications_integration";
const DEFAULT_TEST_DATABASE_PORT = "55432";
const DEFAULT_CANONICAL_ENV_PATH = ".local/canonical-postgres.env";

export const DATABASE_TARGETS = [
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

/** Creates the ignored canonical Compose/test target without a committed password. */
export async function loadCanonicalPostgresEnvironment(
  environment: Readonly<Record<string, string | undefined>> = Deno.env
    .toObject(),
): Promise<Record<string, string | undefined>> {
  const path = canonicalEnvironmentPath();
  const fileValues = await readEnvironmentFile(path);
  const values = { ...fileValues, ...environment };
  const user = values.POSTGRES_INTEGRATION_TEST_USER ?? "mai_test";
  const password = values.POSTGRES_INTEGRATION_TEST_PASSWORD ??
    `local-test-${crypto.randomUUID()}`;
  const database = values.POSTGRES_INTEGRATION_TEST_DATABASE ??
    TEST_DATABASE_NAME;
  const port = values.POSTGRES_INTEGRATION_TEST_PORT ??
    DEFAULT_TEST_DATABASE_PORT;
  const notificationsDatabase =
    values.NOTIFICATIONS_INTEGRATION_TEST_DATABASE ??
      NOTIFICATIONS_DATABASE_NAME;
  const generated = {
    POSTGRES_INTEGRATION_TEST_USER: user,
    POSTGRES_INTEGRATION_TEST_PASSWORD: password,
    POSTGRES_INTEGRATION_TEST_DATABASE: database,
    POSTGRES_INTEGRATION_TEST_PORT: port,
    POSTGRES_INTEGRATION_TEST_DATABASE_URL: values
      .POSTGRES_INTEGRATION_TEST_DATABASE_URL ??
      `postgresql://${encodeURIComponent(user)}:${
        encodeURIComponent(password)
      }@localhost:${port}/${database}`,
    NOTIFICATIONS_INTEGRATION_TEST_DATABASE: notificationsDatabase,
    NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL: values
      .NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL ??
      `postgresql://${encodeURIComponent(user)}:${
        encodeURIComponent(password)
      }@localhost:${port}/${notificationsDatabase}`,
  };
  if (Object.keys(fileValues).length === 0) {
    const persisted = await writeEnvironmentFile(path, generated);
    if (!persisted) {
      for (const [key, value] of Object.entries(generated)) {
        Deno.env.set(key, value);
      }
    }
  }
  return { ...generated, ...environment };
}

export function canonicalEnvironmentPath(): string {
  return Deno.env.get("MAI_CANONICAL_ENV_FILE") ?? DEFAULT_CANONICAL_ENV_PATH;
}

/**
 * Reuses approved local targets when the compose service belongs to another project.
 */
export async function fallbackToApprovedTargets(
  environment: Record<string, string | undefined>,
  databaseProbe: DatabaseProbe,
): Promise<PreflightResult> {
  if (await approvedTargetsReachable(environment, databaseProbe)) {
    return {
      id: "docker",
      label: "Docker daemon",
      required: true,
      status: "passed",
      detail:
        "Docker is available and both approved local PostgreSQL targets are reachable.",
    };
  }
  return {
    id: "postgres-service",
    label: "PostgreSQL service",
    required: true,
    status: "failed",
    detail:
      "postgres-integration-test is not healthy and both approved PostgreSQL targets are not reachable; run deno task prepare.",
  };
}

/**
 * Probes every approved semantic database before reusing an existing service.
 */
export async function approvedTargetsReachable(
  environment: Record<string, string | undefined>,
  databaseProbe: DatabaseProbe,
): Promise<boolean> {
  try {
    const checks = await Promise.all(DATABASE_TARGETS.map(async (target) => {
      const databaseUrl = environment[target.environmentKey];
      assertApprovedDatabaseUrl(databaseUrl, environment, target.expectedName);
      const database = await databaseProbe(databaseUrl);
      return database === target.expectedName;
    }));
    return checks.every(Boolean);
  } catch {
    return false;
  }
}

/**
 * Rejects non-local or non-semantic PostgreSQL targets before any connection.
 */
export function assertApprovedDatabaseUrl(
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

async function readEnvironmentFile(
  path: string,
): Promise<Record<string, string>> {
  try {
    const text = await Deno.readTextFile(path);
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

async function writeEnvironmentFile(
  path: string,
  values: Readonly<Record<string, string>>,
): Promise<boolean> {
  try {
    const parent = path.slice(0, path.lastIndexOf("/"));
    await Deno.mkdir(parent || ".", { recursive: true });
  } catch (error) {
    if (isWritePermissionError(error)) return false;
    throw error;
  }
  const contents =
    Object.entries(values).map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n";
  try {
    await Deno.writeTextFile(path, contents);
  } catch (error) {
    if (isWritePermissionError(error)) return false;
    throw error;
  }
  try {
    await Deno.chmod(path, 0o600);
  } catch (error) {
    if (error instanceof Deno.errors.NotSupported) return true;
    throw error;
  }
  return true;
}

function isWritePermissionError(error: unknown): boolean {
  return error instanceof Deno.errors.PermissionDenied ||
    error instanceof Deno.errors.NotCapable;
}
