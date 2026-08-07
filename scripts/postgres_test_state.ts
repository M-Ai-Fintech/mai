import pg from "pg";

const APPROVED_DATABASE_NAME = "mai_test_postgres_integration";
const NOTIFICATIONS_DATABASE_NAME = "mai_test_notifications_integration";
const SUITE_PREFIX = "mai_test_postgres_integration_suite_";
const NOTIFICATIONS_SUITE_PREFIX = "mai_test_notifications_integration_suite_";
const DATABASE_NAME =
  /^mai_test_(?:postgres|notifications)_integration(?:_suite_[a-z0-9_]+)?$/;
const APPROVED_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const APPROVED_PORT = "55432";

export function isolatedPostgresDatabaseName(
  testPath: string,
  baseDatabaseName = APPROVED_DATABASE_NAME,
): string {
  const prefix = suitePrefix(baseDatabaseName);
  const slug = testPath
    .toLowerCase()
    .replace(/mai[_-]?\d+/g, "context")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const availableSlugLength = 63 - prefix.length;
  return `${prefix}${slug}`.slice(0, prefix.length + availableSlugLength);
}

export function isolatedPostgresDatabaseUrl(
  baseUrl: string,
  databaseName: string,
): string {
  assertApprovedPostgresDatabaseUrl(baseUrl);
  assertDatabaseName(databaseName);
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export async function createIsolatedPostgresDatabase(
  baseUrl: string,
  testPath: string,
): Promise<string> {
  const baseDatabaseName = new URL(baseUrl).pathname.slice(1);
  const databaseName = isolatedPostgresDatabaseName(
    testPath,
    baseDatabaseName,
  );
  const admin = new pg.Client(adminUrl(baseUrl));
  try {
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    return isolatedPostgresDatabaseUrl(baseUrl, databaseName);
  } finally {
    await admin.end().catch(() => {});
  }
}

export async function dropIsolatedPostgresDatabase(
  baseUrl: string,
  databaseName: string,
): Promise<void> {
  assertDatabaseName(databaseName);
  const admin = new pg.Client(adminUrl(baseUrl));
  try {
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  } finally {
    await admin.end().catch(() => {});
  }
}

export function isApprovedIntegrationDatabaseName(name: string): boolean {
  return DATABASE_NAME.test(name);
}

export function isApprovedPostgresDatabaseName(name: string): boolean {
  return isApprovedIntegrationDatabaseName(name);
}

function adminUrl(baseUrl: string): string {
  assertApprovedPostgresDatabaseUrl(baseUrl);
  const url = new URL(baseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export function assertApprovedPostgresDatabaseUrl(baseUrl: string): void {
  const url = new URL(baseUrl);
  const expectedPort = Deno.env.get("POSTGRES_INTEGRATION_TEST_PORT") ??
    APPROVED_PORT;
  if (!APPROVED_HOSTS.has(url.hostname) || url.port !== expectedPort) {
    throw new Error(
      `PostgreSQL test target '${url.hostname}:${url.port}' is unsafe; expected a local target on port ${expectedPort}.`,
    );
  }
  const baseDatabase = url.pathname.slice(1);
  if (!isApprovedIntegrationDatabaseName(baseDatabase)) {
    throw new Error(
      `PostgreSQL test base '${url.pathname}' is unsafe; expected the approved base or suite database.`,
    );
  }
}

function suitePrefix(baseDatabaseName: string): string {
  if (baseDatabaseName === NOTIFICATIONS_DATABASE_NAME) {
    return NOTIFICATIONS_SUITE_PREFIX;
  }
  if (baseDatabaseName === APPROVED_DATABASE_NAME) return SUITE_PREFIX;
  if (baseDatabaseName.startsWith(SUITE_PREFIX)) return SUITE_PREFIX;
  if (baseDatabaseName.startsWith(NOTIFICATIONS_SUITE_PREFIX)) {
    return NOTIFICATIONS_SUITE_PREFIX;
  }
  throw new Error(
    `PostgreSQL test base '${baseDatabaseName}' is unsafe; expected an approved integration database.`,
  );
}

function assertDatabaseName(name: string): void {
  if (DATABASE_NAME.test(name)) return;
  throw new Error(
    `PostgreSQL test database '${name}' is unsafe; expected the approved integration name or suite prefix.`,
  );
}
