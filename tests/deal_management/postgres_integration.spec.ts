import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  addDealParty,
  commandReceiptKey,
  createDeal,
  createReceipt,
  DealIdempotencyConflictError,
  DealInvariantError,
  dealManagementMigrations,
  DealManagementService,
  DealScopeMismatchError,
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
  FixedDealClock,
  keyFor,
  RecordingDealAuthorization,
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
      "TRUNCATE deal_management.command_claims, deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.reconciliation_manifest, platform.outbox",
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
      "TRUNCATE deal_management.command_claims, deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.reconciliation_manifest, platform.outbox",
    );
    await pool.end();
  },
});

Deno.test({
  name:
    "Deal Management PostgreSQL claims concurrent creates and validates stored integrity",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createMai106Pool(databaseUrl!);
    try {
      await new PostgresMigrationRunner(pool).apply([
        ...platformMigrations,
        ...dealManagementMigrations,
      ]);
      await pool.query(
        "TRUNCATE deal_management.command_claims, deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.reconciliation_manifest, platform.outbox",
      );
      const transactions = new PostgresTransactionRunner(pool);
      const repository = new PostgresDealRepository(transactions);
      const command = {
        type: "create_deal" as const,
        context: contextFor(),
        idempotencyKey: keyFor("postgres-concurrent-create"),
        name: "Concurrent PostgreSQL deal",
        dealType: "acquisition",
        confidentiality: "standard" as const,
        currency: "USD",
      };
      const createService = (ids: SequentialDealIdFactory) =>
        new DealManagementService({
          repository,
          authorization: new RecordingDealAuthorization(),
          ids,
          clock: new FixedDealClock(),
        });
      const firstIds = new SequentialDealIdFactory("concurrent-first");
      const secondIds = new SequentialDealIdFactory("concurrent-second");
      const [first, second] = await Promise.all([
        createService(firstIds).createDeal(command),
        createService(secondIds).createDeal(command),
      ]);
      assertEquals(second, first);
      assert([
        "deal_concurrent-first-1",
        "deal_concurrent-second-1",
      ].includes(first.deal.id));
      const receiptKey = commandReceiptKey(command, "new");
      assertEquals(await count(pool, "deal_management.deals"), "1");
      assertEquals(await count(pool, "deal_management.aggregate_history"), "1");
      assertEquals(
        await countWhere(
          pool,
          "deal_management.command_claims",
          "idempotency_key",
          command.idempotencyKey,
        ),
        "1",
      );
      const events = await pool.query<{ eventId: string }>(
        `SELECT event_id AS "eventId" FROM deal_management.aggregate_history`,
      );
      assertEquals(events.rows.length, 1);
      assert([
        "event_concurrent-first-1",
        "event_concurrent-second-1",
      ].includes(events.rows[0].eventId));
      assertEquals(
        await countWhere(
          pool,
          "deal_management.command_receipts",
          "idempotency_key",
          receiptKey,
        ),
        "1",
      );
      assertEquals(
        await countWhere(
          pool,
          "platform.outbox",
          "aggregate_id",
          first.deal.id,
        ),
        "1",
      );
      await assertRejects(
        () =>
          createService(new SequentialDealIdFactory("payload-mismatch"))
            .createDeal({ ...command, name: "Different payload" }),
        DealIdempotencyConflictError,
      );
      assertEquals(await count(pool, "deal_management.deals"), "1");

      const scope = {
        tenantId: requiredTenantId(command.context.request.tenantId),
        workspaceId: requiredWorkspaceId(command.context.request.workspaceId!),
      };
      const stored = first.deal;
      await assertRejects(
        () =>
          repository.save({
            scope: { ...scope, tenantId: requiredTenantId("tenant_other") },
            aggregate: stored,
            event: eventFor(stored, command.context, "scope-mismatch"),
          }),
        DealScopeMismatchError,
      );
      const event = eventFor(stored, command.context, "integrity");
      await assertRejects(
        () =>
          repository.save({
            scope,
            aggregate: stored,
            event: { ...event, tenantId: requiredTenantId("tenant_other") },
          }),
        DealInvariantError,
      );
      await assertRejects(
        () =>
          repository.save({
            scope,
            aggregate: stored,
            event: {
              ...event,
              workspaceId: requiredWorkspaceId("workspace_other"),
            },
          }),
        DealInvariantError,
      );
      await assertRejects(
        () =>
          repository.save({
            scope,
            aggregate: stored,
            event: { ...event, dealId: "deal_other" as typeof stored.id },
          }),
        DealInvariantError,
      );
      await assertRejects(
        () =>
          repository.save({
            scope,
            aggregate: stored,
            event: { ...event, aggregateVersion: 2 as typeof stored.version },
          }),
        DealInvariantError,
      );

      await pool.query(
        `UPDATE deal_management.deals SET document = $1 WHERE tenant_id = $2 AND workspace_id = $3 AND deal_id = $4`,
        [
          JSON.stringify({ ...stored, name: 42 }),
          scope.tenantId,
          scope.workspaceId,
          stored.id,
        ],
      );
      await assertRejects(
        () => repository.find(scope, stored.id),
        DealInvariantError,
      );
      await pool.query(
        `UPDATE deal_management.deals SET document = $1 WHERE tenant_id = $2 AND workspace_id = $3 AND deal_id = $4`,
        [
          JSON.stringify({ ...stored, tenantId: "tenant_other" }),
          scope.tenantId,
          scope.workspaceId,
          stored.id,
        ],
      );
      await assertRejects(
        () => repository.find(scope, stored.id),
        DealInvariantError,
      );
    } finally {
      await pool.query(
        "TRUNCATE deal_management.command_claims, deal_management.command_receipts, deal_management.aggregate_history, deal_management.deals, deal_management.reconciliation_routing_history, deal_management.reconciliation_records, deal_management.reconciliation_manifest, platform.outbox",
      ).catch(() => {});
      await pool.end();
    }
  },
});

async function count(
  pool: {
    query<T>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  },
  table: string,
): Promise<string> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table}`,
  );
  return result.rows[0].count;
}

async function countWhere(
  pool: {
    query<T>(sql: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  },
  table: string,
  column: string,
  value: string,
): Promise<string> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table} WHERE ${column} = $1`,
    [value],
  );
  return result.rows[0].count;
}
