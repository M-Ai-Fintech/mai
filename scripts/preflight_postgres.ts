import type { DatabaseProbe, PreflightResult } from "./preflight.ts";

const TEST_DATABASE_NAME = "mai_test_postgres_integration";
const NOTIFICATIONS_DATABASE_NAME = "mai_test_notifications_integration";
const DEFAULT_TEST_DATABASE_PORT = "55432";

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
