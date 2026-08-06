import { assertEquals } from "@std/assert";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  actorId,
  createAdministrationContext,
  createIdentityAccessEvent,
  createUserIdentity,
  identityAccessMigrations,
  PostgresIdentityAccessRepository,
  tenantId,
  userIdentityId,
} from "../../src/identity_access/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name:
    "identity access PostgreSQL migrations and repository retain atomic history/outbox behavior",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...identityAccessMigrations,
    ]);
    await pool.query(
      "TRUNCATE iam.user_identities, iam.aggregate_history, platform.outbox",
    );
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new PostgresIdentityAccessRepository(transactions);
    const actor = {
      id: actorId("actor_pg-integration"),
      kind: "human" as const,
      state: "active" as const,
    };
    const context = createAdministrationContext({
      actor,
      request: {
        actorId: actor.id,
        tenantId: tenantId("tenant_pg-integration"),
        correlationId: "cor_pg-integration" as never,
        origin: "internal",
      },
      now: "2026-08-01T12:00:00.000Z",
    });
    const identity = createUserIdentity({
      id: userIdentityId("identity_pg-integration"),
      tenantId: context.tenantId,
      providerSubject: "provider-pg-integration",
      displayName: "Postgres Integration",
    }, context);
    const event = createIdentityAccessEvent({
      aggregate: identity,
      eventId: "event_pg-integration",
      eventType: "user_identity.created",
      context,
    });
    await repository.save(identity, undefined, event);
    assertEquals(
      (await repository.find(
        { tenantId: context.tenantId },
        "user_identity",
        identity.id,
      ))?.id,
      identity.id,
    );
    assertEquals(
      (await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM iam.aggregate_history WHERE aggregate_id = $1",
        [identity.id],
      )).rows[0].count,
      "1",
    );
    assertEquals(
      (await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM platform.outbox WHERE aggregate_id = $1",
        [identity.id],
      )).rows[0].count,
      "1",
    );
    await pool.query(
      "TRUNCATE iam.user_identities, iam.aggregate_history, platform.outbox",
    );
    await pool.end();
  },
});
