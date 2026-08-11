import type { DemoResetTarget } from "./contracts.ts";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);

/** Validates the exact local-only database boundary used by destructive reset.
 *
 * @example assertSafeDemoDatabaseUrl(url, target)
 */
export function assertSafeDemoDatabaseUrl(
  value: string,
  target: DemoResetTarget,
): URL {
  const url = new URL(value);
  const protocolAllowed = url.protocol === "postgresql:" ||
    url.protocol === "postgres:";
  const databaseAllowed = url.pathname === `/${target.databaseName}`;
  const environmentAllowed = target.environment === "local-demo" ||
    target.environment === "test";
  if (
    protocolAllowed && databaseAllowed && environmentAllowed &&
    loopbackHosts.has(url.hostname) && url.port === "55435"
  ) return url;
  throw new Error(
    `Demo database target "${url.protocol}//${url.hostname}:${url.port}${url.pathname}" is unsafe; expected PostgreSQL loopback port 55435 and database "${target.databaseName}" in a local demo/test profile.`,
  );
}
