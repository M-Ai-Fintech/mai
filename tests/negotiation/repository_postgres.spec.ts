import { assertEquals } from "@std/assert";
import {
  PostgresNegotiationEffects,
  PostgresNegotiationUnitOfWork,
} from "../../src/negotiation/v1.ts";
import { NegotiationService } from "../../src/negotiation/service.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { negotiationMigrations } from "../../src/negotiation/migrations/index.ts";
import {
  createIsolatedPostgresDatabase,
  dropIsolatedPostgresDatabase,
} from "../../scripts/postgres_test_state.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  actor,
  AllowingNegotiationAuthorization,
  contextFor,
  scope,
} from "./support.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "PostgreSQL Negotiation repository persists and replays one command",
  ignore: databaseUrl === undefined,
  async fn() {
    const suiteUrl = await createIsolatedPostgresDatabase(
      databaseUrl!,
      "tests/negotiation/repository_postgres.spec.ts",
    );
    const databaseName = new URL(suiteUrl).pathname.slice(1);
    const pool = createPostgresIntegrationTestPool(suiteUrl);
    try {
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...negotiationMigrations,
      ]);
      const unitOfWork = new PostgresNegotiationUnitOfWork(
        new PostgresTransactionRunner(pool),
        { now: () => new Date("2026-08-08T12:00:00.000Z") },
      );
      const service = new NegotiationService({
        unitOfWork,
        effects: new PostgresNegotiationEffects(),
        clock: { now: () => "2026-08-08T12:00:00.000Z" },
        authorization: new AllowingNegotiationAuthorization(),
      });
      const input = {
        context: contextFor(),
        scope,
        roundId: "round_postgres",
        negotiationId: "negotiation_postgres",
        number: 1,
        actor: actor(),
        idempotencyKey: "idem_negotiation-postgres-create" as never,
      };
      const first = await service.createRound(input);
      const replay = await service.createRound(input);
      assertEquals(first.replayed, false);
      assertEquals(replay.replayed, true);
      assertEquals(replay.round.history.length, 1);
      const row = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM negotiation.effect_records",
      );
      assertEquals(row.rows[0]?.count, "2");
    } finally {
      await pool.end();
      await dropIsolatedPostgresDatabase(databaseUrl!, databaseName);
    }
  },
});
