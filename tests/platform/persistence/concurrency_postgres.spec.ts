import { assertEquals, assertRejects } from "@std/assert";
import {
  assertReferencedVersion,
  PostgresTransactionRunner,
  updateAggregateVersion,
  VersionConflictError,
} from "../../../src/platform/persistence/v1.ts";
import {
  parseAggregateVersion,
  parseTenantId,
} from "../../../src/platform/api/v1.ts";
import {
  createMai106Pool,
  dropTaskSchema,
  mai106DatabaseUrl,
  PostgresTestTransactionPool,
} from "../support/postgres.ts";
import pg from "pg";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name: "concurrent tenant-scoped aggregate updates have one winner",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetConcurrencyFixture(pool);
    const runner = new PostgresTransactionRunner(
      new PostgresTestTransactionPool(pool),
    );
    const expectedVersion = requiredVersion(1);
    const tenantId = requiredTenant("tenant_mai106");
    const update = (materialValue: string) =>
      runner.run((transaction) =>
        updateAggregateVersion(transaction, {
          table: "mai106_concurrency.aggregate_fixture",
          tenantId,
          aggregateId: "aggregate_1",
          expectedVersion,
          changes: { material_value: materialValue },
        })
      );

    const outcomes = await Promise.allSettled([
      update("first"),
      update("second"),
    ]);
    assertEquals(
      outcomes.filter(({ status }) => status === "fulfilled").length,
      1,
    );
    const rejection = outcomes.find(({ status }) => status === "rejected");
    assertEquals(
      rejection?.status === "rejected" &&
        rejection.reason instanceof VersionConflictError,
      true,
    );
    const row = await pool.query<{ version: string }>(
      "SELECT version::text FROM mai106_concurrency.aggregate_fixture",
    );
    assertEquals(row.rows[0].version, "2");
    await dropTaskSchema(pool, "mai106_concurrency");
    await pool.end();
  },
});

Deno.test({
  name: "exact referenced aggregate versions are checked independently",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await resetConcurrencyFixture(pool);
    const runner = new PostgresTransactionRunner(
      new PostgresTestTransactionPool(pool),
    );
    const reference = {
      table: "mai106_concurrency.aggregate_fixture",
      tenantId: requiredTenant("tenant_mai106"),
      aggregateId: "aggregate_1",
    };

    await runner.run((transaction) =>
      assertReferencedVersion(transaction, {
        ...reference,
        exactVersion: requiredVersion(1),
      })
    );
    await assertRejects(
      () =>
        runner.run((transaction) =>
          assertReferencedVersion(transaction, {
            ...reference,
            exactVersion: requiredVersion(2),
          })
        ),
      VersionConflictError,
      "REFERENCED_VERSION_MISMATCH",
    );
    await dropTaskSchema(pool, "mai106_concurrency");
    await pool.end();
  },
});

async function resetConcurrencyFixture(pool: pg.Pool): Promise<void> {
  await dropTaskSchema(pool, "mai106_concurrency");
  await pool.query(`
    CREATE SCHEMA mai106_concurrency;
    CREATE TABLE mai106_concurrency.aggregate_fixture (
      tenant_id TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      material_value TEXT NOT NULL,
      version BIGINT NOT NULL CHECK (version > 0),
      PRIMARY KEY (tenant_id, aggregate_id)
    );
    INSERT INTO mai106_concurrency.aggregate_fixture
      (tenant_id, aggregate_id, material_value, version)
    VALUES ('tenant_mai106', 'aggregate_1', 'initial', 1);
  `);
}

function requiredVersion(value: number) {
  const result = parseAggregateVersion(value);
  if (result.ok) return result.value;
  throw new Error(
    `Version "${value}" is invalid; expected test fixture version.`,
  );
}

function requiredTenant(value: string) {
  const result = parseTenantId(value);
  if (result.ok) return result.value;
  throw new Error(
    `Tenant "${value}" is invalid; expected test fixture tenant.`,
  );
}
