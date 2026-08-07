import { assertEquals, assertThrows } from "@std/assert";
import {
  isApprovedIntegrationDatabaseName,
  isApprovedPostgresDatabaseName,
  isolatedPostgresDatabaseName,
  isolatedPostgresDatabaseUrl,
} from "./postgres_test_state.ts";

Deno.test("PostgreSQL suite state uses deterministic semantic names", () => {
  const name = isolatedPostgresDatabaseName(
    "tests/evidence_knowledge/fact_command_postgres.spec.ts",
  );
  assertEquals(isApprovedPostgresDatabaseName(name), true);
  assertEquals(name.length <= 63, true);
  assertEquals(
    isolatedPostgresDatabaseUrl(
      testDatabaseUrl("mai_test_postgres_integration"),
      name,
    ).includes(`/${name}`),
    true,
  );
});

Deno.test("PostgreSQL suite state rejects development database names", () => {
  assertEquals(isApprovedPostgresDatabaseName("mai"), false);
  assertThrows(
    () =>
      isolatedPostgresDatabaseUrl(
        "postgres://postgres:postgres@localhost:5432/mai",
        "mai",
      ),
    Error,
    "unsafe",
  );
});

Deno.test("PostgreSQL suite state can derive a child from an isolated suite", () => {
  const child = isolatedPostgresDatabaseUrl(
    testDatabaseUrl("mai_test_postgres_integration_suite_parent"),
    "mai_test_postgres_integration_suite_child",
  );
  assertEquals(
    child.endsWith("/mai_test_postgres_integration_suite_child"),
    true,
  );
});

function testDatabaseUrl(databaseName: string): string {
  const port = Deno.env.get("POSTGRES_INTEGRATION_TEST_PORT") ?? "55432";
  return `postgres://postgres:postgres@localhost:${port}/${databaseName}`;
}

Deno.test("PostgreSQL suite state preserves notification context in names", () => {
  const name = isolatedPostgresDatabaseName(
    "tests/notifications/repository_postgres.spec.ts",
    "mai_test_notifications_integration",
  );
  assertEquals(isApprovedIntegrationDatabaseName(name), true);
  assertEquals(
    name.startsWith("mai_test_notifications_integration_suite_"),
    true,
  );
});
