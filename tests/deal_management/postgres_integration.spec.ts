import { assertEquals, assertRejects } from "@std/assert";
import {
  addDealParty,
  createDeal,
  createReceipt,
  dealManagementMigrations,
  DealVersionConflictError,
  PostgresDealRepository,
} from "../../src/deal_management/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createMai106Pool,
  mai106DatabaseUrl,
} from "../platform/support/postgres.ts";
import {
  contextFor,
  eventFor,
  requiredTenantId,
  requiredWorkspaceId,
  SequentialDealIdFactory,
} from "./support.ts";

const databaseUrl = mai106DatabaseUrl();

Deno.test({
  name:
    "Deal Management PostgreSQL migration and repository retain atomic history, receipts, and outbox rows",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply([
      ...platformMigrations,
      ...dealManagementMigrations,
    ]);
    await pool.query(
      "TRUNCATE deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_manifest, platform.outbox",
    );
    const transactions = new PostgresTransactionRunner(pool);
    const repository = new PostgresDealRepository(transactions);
    const ids = new SequentialDealIdFactory();
    const context = contextFor();
    const scope = {
      tenantId: requiredTenantId(context.request.tenantId),
      workspaceId: requiredWorkspaceId(context.request.workspaceId!),
    };
    const deal = createDeal({
      id: ids.nextDealId(),
      ...scope,
      name: "Postgres Deal",
      dealType: "acquisition",
      confidentiality: "standard",
      currency: "USD",
      now: context.now,
    });
    await repository.save({
      scope,
      aggregate: deal,
      event: eventFor(deal, context, "postgres-create"),
      receipt: createReceipt({
        key: `${context.actor.id}:create:${deal.id}`,
        actorId: context.actor.id,
        commandType: "create_deal",
        targetId: deal.id,
        fingerprint: "fingerprint-postgres-create",
        result: { operation: "created", deal },
        sequence: "postgres-create",
      }),
    });
    const updated = addDealParty(deal, {
      expectedVersion: 1,
      id: ids.nextDealPartyId(),
      reference: { kind: "organization", id: "org_postgres-target" },
      side: "target",
      label: "Postgres target",
      now: "2026-08-02T12:01:00.000Z",
    });
    await repository.save({
      scope,
      aggregate: updated,
      expectedVersion: 1,
      event: eventFor(updated, context, "postgres-update"),
    });

    assertEquals((await repository.find(scope, deal.id))?.version, 2);
    assertEquals(
      (await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM deal_management.aggregate_history WHERE deal_id = $1",
        [deal.id],
      )).rows[0].count,
      "2",
    );
    assertEquals(
      (await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM deal_management.command_receipts WHERE target_id = $1",
        [deal.id],
      )).rows[0].count,
      "1",
    );
    assertEquals(
      (await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM platform.outbox WHERE aggregate_id = $1",
        [deal.id],
      )).rows[0].count,
      "2",
    );
    await assertRejects(
      () =>
        repository.save({
          scope,
          aggregate: { ...updated, version: 3 as typeof updated.version },
          expectedVersion: 1,
          event: eventFor(
            { ...updated, version: 3 as typeof updated.version },
            context,
            "postgres-stale",
          ),
        }),
      DealVersionConflictError,
    );
    await pool.query(
      "TRUNCATE deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_manifest, platform.outbox",
    );
    await pool.end();
  },
});
