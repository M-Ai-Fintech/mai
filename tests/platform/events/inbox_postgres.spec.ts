import { assertEquals, assertRejects } from "@std/assert";
import { parseTenantId } from "../../../src/platform/api/v1.ts";
import {
  payloadDigest,
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../../src/platform/persistence/v1.ts";
import {
  InboxConflictError,
  InboxRepository,
  sanitizedFailure,
} from "../../../src/platform/events/v1.ts";
import {
  createPostgresIntegrationTestPool,
  dropTaskSchema,
  postgresIntegrationTestDatabaseUrl,
  PostgresTestTransactionPool,
} from "../support/postgres.ts";
import pg from "pg";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "inbox deduplicates effects and exposes conflicting payload digests",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await resetInboxFixture(pool);
    const transactions = transactionRunner(pool);
    const repository = new InboxRepository();
    const message = await fixtureMessage({ value: 1 });

    await transactions.run(async (transaction) => {
      assertEquals(await repository.claim(transaction, message), {
        status: "claimed",
      });
      await transaction.query(
        "INSERT INTO postgres_integration_inbox.effects (message_id) VALUES ($1)",
        [message.messageIdentity],
      );
      await repository.complete(
        transaction,
        message,
        new Date("2026-07-30T12:00:01.000Z"),
      );
    });
    assertEquals(
      await transactions.run((transaction) =>
        repository.claim(transaction, message)
      ),
      { status: "duplicate", state: "processed" },
    );
    const effects = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM postgres_integration_inbox.effects",
    );
    assertEquals(effects.rows[0].count, "1");
    const processed = await pool.query<{ processed_at: Date }>(
      "SELECT processed_at FROM platform.inbox",
    );
    assertEquals(
      processed.rows[0].processed_at.toISOString(),
      "2026-07-30T12:00:01.000Z",
    );
    await assertRejects(
      () =>
        transactions.run(async (transaction) =>
          repository.claim(transaction, {
            ...message,
            payloadDigest: await payloadDigest({ value: 2 }),
          })
        ),
      InboxConflictError,
      "INBOX_CONFLICT",
    );
    await dropTaskSchema(pool, "postgres_integration_inbox");
    await pool.end();
  },
});

Deno.test({
  name:
    "concurrent inbox claims have one winner and retry keeps failure evidence",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query("TRUNCATE platform.inbox");
    const transactions = transactionRunner(pool);
    const repository = new InboxRepository();
    const message = await fixtureMessage({ retry: true });
    const claims = await Promise.all([
      transactions.run((transaction) => repository.claim(transaction, message)),
      transactions.run((transaction) => repository.claim(transaction, message)),
    ]);
    assertEquals(
      claims.map(({ status }) => status).sort(),
      ["claimed", "duplicate"],
    );
    await transactions.run((transaction) =>
      repository.fail(
        transaction,
        message,
        sanitizedFailure("CONSUMER_FAILED"),
      )
    );
    assertEquals(
      await transactions.run((transaction) =>
        repository.claim(transaction, {
          ...message,
          receivedAt: new Date("2026-07-30T12:01:00.000Z"),
        })
      ),
      { status: "retry", previousFailure: "CONSUMER_FAILED" },
    );
    const evidence = await pool.query<{
      delivery_count: number;
      sanitized_failure_reference: string;
    }>(
      `SELECT delivery_count, sanitized_failure_reference
       FROM platform.inbox`,
    );
    assertEquals(evidence.rows, [{
      delivery_count: 3,
      sanitized_failure_reference: "CONSUMER_FAILED",
    }]);
    await pool.end();
  },
});

function transactionRunner(pool: pg.Pool): PostgresTransactionRunner {
  return new PostgresTransactionRunner(new PostgresTestTransactionPool(pool));
}

async function resetInboxFixture(pool: pg.Pool): Promise<void> {
  await pool.query("TRUNCATE platform.inbox");
  await dropTaskSchema(pool, "postgres_integration_inbox");
  await pool.query(`
    CREATE SCHEMA postgres_integration_inbox;
    CREATE TABLE postgres_integration_inbox.effects (
      message_id TEXT PRIMARY KEY
    )
  `);
}

async function fixtureMessage(payload: unknown) {
  const tenant = parseTenantId("tenant_postgresintegration");
  if (!tenant.ok) throw new Error("Fixture tenant is invalid.");
  return {
    tenantId: tenant.value,
    sourceIdentity: "provider_fixture",
    messageIdentity: "message_1",
    payloadDigest: await payloadDigest(payload),
    receivedAt: new Date("2026-07-30T12:00:00.000Z"),
  };
}
