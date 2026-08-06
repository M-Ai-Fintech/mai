import { assertEquals, assertRejects } from "@std/assert";
import {
  parseAggregateVersion,
  parseCorrelationId,
  parseTenantId,
} from "../../../src/platform/api/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
  updateAggregateVersion,
} from "../../../src/platform/persistence/v1.ts";
import { OutboxRepository } from "../../../src/platform/events/v1.ts";
import {
  createPostgresIntegrationTestPool,
  dropTaskSchema,
  postgresIntegrationTestDatabaseUrl,
} from "../support/postgres.ts";
import pg from "pg";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "aggregate update and outbox append are atomic and restart durable",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await resetOutboxFixture(pool);
    const transactions = transactionRunner(pool);
    const outbox = new OutboxRepository();
    const event = fixtureEvent("event_atomic");
    const update = fixtureUpdate("committed");

    await assertRejects(
      () =>
        transactions.run(async (transaction) => {
          await updateAggregateVersion(transaction, update);
          await outbox.append(transaction, event);
          throw new Error("crash before commit");
        }),
      Error,
      "crash before commit",
    );
    assertEquals(await fixtureVersion(pool), "1");
    assertEquals(await outboxCount(pool), "0");

    await transactions.run(async (transaction) => {
      await updateAggregateVersion(transaction, update);
      await outbox.append(transaction, event);
    });
    assertEquals(await fixtureVersion(pool), "2");
    const recreated = new OutboxRepository();
    const claimed = await transactions.run((transaction) =>
      recreated.claim(transaction, {
        owner: "dispatcher_a",
        now: new Date("2026-07-30T12:00:00.000Z"),
        leaseUntil: new Date("2026-07-30T12:01:00.000Z"),
        limit: 1,
      })
    );
    assertEquals(claimed.map(({ eventId }) => eventId), ["event_atomic"]);
    await dropTaskSchema(pool, "postgres_integration_events");
    await pool.end();
  },
});

Deno.test({
  name: "expired outbox leases recover without an early duplicate claim",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query("TRUNCATE platform.outbox");
    const transactions = transactionRunner(pool);
    const repository = new OutboxRepository();
    await transactions.run((transaction) =>
      repository.append(transaction, fixtureEvent("event_recovery"))
    );
    const first = await transactions.run((transaction) =>
      repository.claim(transaction, {
        owner: "dispatcher_a",
        now: new Date("2026-07-30T12:00:00.000Z"),
        leaseUntil: new Date("2026-07-30T12:01:00.000Z"),
        limit: 1,
      })
    );
    const early = await transactions.run((transaction) =>
      repository.claim(transaction, {
        owner: "dispatcher_b",
        now: new Date("2026-07-30T12:00:30.000Z"),
        leaseUntil: new Date("2026-07-30T12:01:30.000Z"),
        limit: 1,
      })
    );
    const recovered = await transactions.run((transaction) =>
      repository.claim(transaction, {
        owner: "dispatcher_b",
        now: new Date("2026-07-30T12:01:01.000Z"),
        leaseUntil: new Date("2026-07-30T12:02:01.000Z"),
        limit: 1,
      })
    );

    assertEquals(first.length, 1);
    assertEquals(early, []);
    assertEquals(recovered.map(({ eventId }) => eventId), ["event_recovery"]);
    await assertRejects(
      () =>
        transactions.run((transaction) =>
          repository.markPublished(
            transaction,
            first[0],
            new Date("2026-07-30T12:01:02.000Z"),
          )
        ),
      Error,
      "did not match",
    );
    await pool.end();
  },
});

Deno.test({
  name: "outbox publication, retry, and dead-letter states stay durable",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query("TRUNCATE platform.outbox");
    const transactions = transactionRunner(pool);
    const repository = new OutboxRepository();
    await transactions.run(async (transaction) => {
      await repository.append(transaction, fixtureEvent("event_a_success"));
      await repository.append(transaction, fixtureEvent("event_b_failure"));
    });
    const success = await claimOne(transactions, repository, "event_a_success");
    await transactions.run((transaction) =>
      repository.markPublished(
        transaction,
        success,
        new Date("2026-07-30T12:00:05.000Z"),
      )
    );
    const failure = await claimOne(transactions, repository, "event_b_failure");
    const retryAt = new Date("2026-07-30T12:02:00.000Z");
    assertEquals(
      await transactions.run((transaction) =>
        repository.recordFailure(
          transaction,
          failure,
          "PUBLISH_FAILED",
          retryAt,
        )
      ),
      "retry_scheduled",
    );
    const retried = await transactions.run((transaction) =>
      repository.claim(transaction, {
        owner: "dispatcher_b",
        now: retryAt,
        leaseUntil: new Date("2026-07-30T12:03:00.000Z"),
        limit: 1,
      })
    );
    assertEquals(
      await transactions.run((transaction) =>
        repository.recordFailure(
          transaction,
          retried[0],
          "PUBLISH_EXHAUSTED",
          undefined,
        )
      ),
      "dead_lettered",
    );
    const states = await pool.query<{
      event_id: string;
      dispatch_state: string;
      last_failure: string | null;
    }>(
      `SELECT event_id, dispatch_state, last_failure
       FROM platform.outbox ORDER BY event_id`,
    );
    assertEquals(states.rows, [
      {
        event_id: "event_a_success",
        dispatch_state: "published",
        last_failure: null,
      },
      {
        event_id: "event_b_failure",
        dispatch_state: "dead_lettered",
        last_failure: "PUBLISH_EXHAUSTED",
      },
    ]);
    await pool.end();
  },
});

Deno.test({
  name: "concurrent outbox dispatchers have one lease winner",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query("TRUNCATE platform.outbox");
    const transactions = transactionRunner(pool);
    const repository = new OutboxRepository();
    await transactions.run((transaction) =>
      repository.append(transaction, fixtureEvent("event_concurrent"))
    );
    const claim = (owner: string) =>
      transactions.run((transaction) =>
        repository.claim(transaction, {
          owner,
          now: new Date("2026-07-30T12:00:00.000Z"),
          leaseUntil: new Date("2026-07-30T12:01:00.000Z"),
          limit: 1,
        })
      );
    const outcomes = await Promise.all([
      claim("dispatcher_a"),
      claim("dispatcher_b"),
    ]);

    assertEquals(outcomes.map(({ length }) => length).sort(), [0, 1]);
    await pool.end();
  },
});

function transactionRunner(pool: pg.Pool): PostgresTransactionRunner {
  return new PostgresTransactionRunner(pool);
}

async function claimOne(
  transactions: PostgresTransactionRunner,
  repository: OutboxRepository,
  expectedEventId: string,
) {
  const claimed = await transactions.run((transaction) =>
    repository.claim(transaction, {
      owner: "dispatcher_a",
      now: new Date("2026-07-30T12:00:00.000Z"),
      leaseUntil: new Date("2026-07-30T12:01:00.000Z"),
      limit: 1,
    })
  );
  assertEquals(claimed[0].eventId, expectedEventId);
  return claimed[0];
}

async function resetOutboxFixture(pool: pg.Pool): Promise<void> {
  await pool.query("TRUNCATE platform.outbox");
  await dropTaskSchema(pool, "postgres_integration_events");
  await pool.query(`
    CREATE SCHEMA postgres_integration_events;
    CREATE TABLE postgres_integration_events.aggregate_fixture (
      tenant_id TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      material_value TEXT NOT NULL,
      version BIGINT NOT NULL CHECK (version > 0),
      PRIMARY KEY (tenant_id, aggregate_id)
    );
    INSERT INTO postgres_integration_events.aggregate_fixture
      (tenant_id, aggregate_id, material_value, version)
    VALUES ('tenant_postgresintegration', 'aggregate_1', 'initial', 1);
  `);
}

function fixtureUpdate(materialValue: string) {
  return {
    table: "postgres_integration_events.aggregate_fixture",
    tenantId: requiredId(parseTenantId("tenant_postgresintegration")),
    aggregateId: "aggregate_1",
    expectedVersion: requiredId(parseAggregateVersion(1)),
    changes: { material_value: materialValue },
  };
}

function fixtureEvent(eventId: string) {
  return {
    eventId,
    tenantId: requiredId(parseTenantId("tenant_postgresintegration")),
    aggregateType: "fixture",
    aggregateId: "aggregate_1",
    aggregateVersion: requiredId(parseAggregateVersion(2)),
    eventType: "fixture.updated",
    schemaVersion: 1,
    payload: { material: true },
    correlationId: requiredId(parseCorrelationId("cor_postgresintegration")),
    occurredAt: new Date("2026-07-30T12:00:00.000Z"),
    availableAt: new Date("2026-07-30T12:00:00.000Z"),
  };
}

async function fixtureVersion(pool: pg.Pool): Promise<string> {
  const result = await pool.query<{ version: string }>(
    "SELECT version::text FROM postgres_integration_events.aggregate_fixture",
  );
  return result.rows[0].version;
}

async function outboxCount(pool: pg.Pool): Promise<string> {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM platform.outbox",
  );
  return result.rows[0].count;
}

function requiredId<TResult>(
  result: { ok: true; value: TResult } | { ok: false },
): TResult {
  if (result.ok) return result.value;
  throw new Error(
    "Fixture value is invalid; expected a MAI-104 contract value.",
  );
}
