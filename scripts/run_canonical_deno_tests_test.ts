import { assertEquals } from "@std/assert";
import {
  isPostgresIntegrationTest,
  partitionTestFiles,
} from "./run_canonical_deno_tests.ts";

Deno.test("canonical runner classifies PostgreSQL integration files", () => {
  assertEquals(
    isPostgresIntegrationTest("createPostgresIntegrationTestPool"),
    true,
  );
  assertEquals(isPostgresIntegrationTest("PostgresMigrationRunner"), true);
  assertEquals(isPostgresIntegrationTest("pure unit test"), false);
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
