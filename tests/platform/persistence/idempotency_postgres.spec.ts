import { assertEquals, assertRejects } from "@std/assert";
import {
  IdempotencyConflictError,
  IdempotencyRepository,
  payloadDigest,
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../../src/platform/persistence/v1.ts";
import {
  parseActorId,
  parseIdempotencyKey,
  parseTenantId,
} from "../../../src/platform/api/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
  PostgresTestTransactionPool,
} from "../support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "idempotency replays terminal results and rejects digest drift",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query("TRUNCATE platform.idempotency_records");
    const transactions = new PostgresTransactionRunner(
      new PostgresTestTransactionPool(pool),
    );
    const repository = new IdempotencyRepository(new FixedClock());
    const claim = await commandClaim({ amount: 10 });

    const first = await transactions.run(async (transaction) => {
      const claimed = await repository.claim(transaction, claim);
      await assertRejects(
        () =>
          repository.complete(
            transaction,
            { ...claim, payloadDigest: "f".repeat(64) },
            "wrong_result",
          ),
        IdempotencyConflictError,
        "IDEMPOTENCY_CONFLICT",
      );
      await repository.complete(transaction, claim, "result_ref_1");
      return claimed;
    });
    assertEquals(first.status, "claimed");
    const replay = await transactions.run((transaction) =>
      repository.claim(transaction, claim)
    );
    assertEquals(replay, {
      status: "replay",
      state: "completed",
      resultReference: "result_ref_1",
      errorReference: undefined,
    });
    await assertRejects(
      () =>
        transactions.run(async (transaction) =>
          repository.claim(transaction, {
            ...claim,
            payloadDigest: await payloadDigest({ amount: 11 }),
          })
        ),
      IdempotencyConflictError,
      "IDEMPOTENCY_CONFLICT",
    );
    const failedClaim = {
      ...claim,
      idempotencyKey: requiredId(
        parseIdempotencyKey("idem_postgresintegration-failed"),
      ),
    };
    await transactions.run(async (transaction) => {
      await repository.claim(transaction, failedClaim);
      await repository.fail(transaction, failedClaim, "error_ref_1");
    });
    assertEquals(
      await transactions.run((transaction) =>
        repository.claim(transaction, failedClaim)
      ),
      {
        status: "replay",
        state: "failed",
        resultReference: undefined,
        errorReference: "error_ref_1",
      },
    );
    await pool.end();
  },
});

Deno.test({
  name: "abandoned idempotency claims remain visible and are never auto-stolen",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query("TRUNCATE platform.idempotency_records");
    const transactions = new PostgresTransactionRunner(
      new PostgresTestTransactionPool(pool),
    );
    const repository = new IdempotencyRepository(new FixedClock());
    const claim = await commandClaim({ uncertain: true });
    await transactions.run((transaction) =>
      repository.claim(transaction, claim)
    );
    assertEquals(
      await transactions.run((transaction) =>
        repository.abandonExpired(
          transaction,
          new Date("2026-07-30T12:00:01.000Z"),
          "RECOVERY_REQUIRED",
        )
      ),
      1,
    );
    assertEquals(
      await transactions.run((transaction) =>
        repository.claim(transaction, claim)
      ),
      { status: "abandoned" },
    );
    await pool.end();
  },
});

Deno.test({
  name: "concurrent idempotency claims have one durable winner",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query("TRUNCATE platform.idempotency_records");
    const transactions = new PostgresTransactionRunner(
      new PostgresTestTransactionPool(pool),
    );
    const repository = new IdempotencyRepository(new FixedClock());
    const claim = await commandClaim({ operation: "retry" });
    const outcomes = await Promise.all([
      transactions.run((transaction) => repository.claim(transaction, claim)),
      transactions.run((transaction) => repository.claim(transaction, claim)),
    ]);

    assertEquals(
      outcomes.map(({ status }) => status).sort(),
      ["claimed", "in_progress"],
    );
    await pool.end();
  },
});

async function commandClaim(payload: unknown) {
  return {
    tenantId: requiredId(parseTenantId("tenant_postgresintegration")),
    actorId: requiredId(parseActorId("actor_postgresintegration")),
    commandType: "fixture.update",
    targetType: "fixture",
    targetId: "aggregate_1",
    idempotencyKey: requiredId(
      parseIdempotencyKey("idem_postgresintegration-command"),
    ),
    payloadDigest: await payloadDigest(payload),
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  };
}

function requiredId<TResult>(
  result: { ok: true; value: TResult } | { ok: false },
): TResult {
  if (result.ok) return result.value;
  throw new Error("Test identifier is invalid; expected a valid MAI-104 ID.");
}

class FixedClock {
  now(): Date {
    return new Date("2026-07-30T12:00:00.000Z");
  }
}
