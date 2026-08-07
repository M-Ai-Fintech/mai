import { assertEquals } from "@std/assert";
import {
  countIgnoredTests,
  databaseTargetForTest,
  isPostgresIntegrationTest,
  partitionTestFiles,
  requiredDatabaseTestsPassed,
} from "./run_canonical_deno_tests.ts";

Deno.test("canonical runner classifies PostgreSQL integration files", () => {
  assertEquals(
    isPostgresIntegrationTest("createPostgresIntegrationTestPool"),
    true,
  );
  assertEquals(isPostgresIntegrationTest("PostgresMigrationRunner"), true);
  assertEquals(isPostgresIntegrationTest("pure unit test"), false);
});

Deno.test("canonical runner routes notification files to isolated notification state", () => {
  assertEquals(
    databaseTargetForTest("NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL"),
    {
      environmentKey: "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL",
      baseDatabaseName: "mai_test_notifications_integration",
    },
  );
});

Deno.test("canonical runner partitions database files from parallel tests", () => {
  assertEquals(
    partitionTestFiles(
      ["tests/db.spec.ts", "tests/unit.spec.ts"],
      new Map([
        ["tests/db.spec.ts", "POSTGRES_INTEGRATION_TEST_DATABASE_URL"],
        ["tests/unit.spec.ts", "assertEquals(true, true)"],
      ]),
    ),
    {
      parallel: ["tests/unit.spec.ts"],
      postgres: ["tests/db.spec.ts"],
    },
  );
});

Deno.test("canonical runner isolates path and URL-marked PostgreSQL tests", () => {
  assertEquals(
    partitionTestFiles(
      [
        "tests/identity_access/repository_postgres.spec.ts",
        "tests/api/v1/documents.spec.ts",
        "tests/unit/pure.spec.ts",
      ],
      new Map([
        ["tests/identity_access/repository_postgres.spec.ts", "unit"],
        [
          "tests/api/v1/documents.spec.ts",
          "mai_test_postgres_integration",
        ],
        ["tests/unit/pure.spec.ts", "pure"],
      ]),
    ),
    {
      parallel: ["tests/unit/pure.spec.ts"],
      postgres: [
        "tests/identity_access/repository_postgres.spec.ts",
        "tests/api/v1/documents.spec.ts",
      ],
    },
  );
});

Deno.test("canonical runner counts ignored tests only from summary fields", () => {
  assertEquals(countIgnoredTests("ok | 2 passed | 0 failed | 3 ignored"), 3);
  assertEquals(countIgnoredTests("test named ignored is still a pass"), 0);
});

Deno.test("required PostgreSQL tests reject ignored and timed-out results", () => {
  assertEquals(
    requiredDatabaseTestsPassed({
      success: true,
      ignoredTests: 0,
      timedOut: false,
    }),
    true,
  );
  assertEquals(
    requiredDatabaseTestsPassed({
      success: true,
      ignoredTests: 1,
      timedOut: false,
    }),
    false,
  );
  assertEquals(
    requiredDatabaseTestsPassed({
      success: true,
      ignoredTests: 0,
      timedOut: true,
    }),
    false,
  );
});
