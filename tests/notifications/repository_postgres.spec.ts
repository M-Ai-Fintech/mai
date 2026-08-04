import { assert, assertEquals, assertRejects } from "@std/assert";
import type { TransactionHandle } from "../../src/platform/persistence/transaction.ts";
import type {
  ActorId,
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import {
  createNotificationId,
  freezeProjection,
  type NotificationProjection,
  type NotificationScope,
} from "../../src/notifications/model.ts";
import {
  InMemoryNotificationRepository,
  PostgresNotificationRepository,
} from "../../src/notifications/repository.ts";
import { SubscriptionVersionConflictError } from "../../src/notifications/subscriptions.ts";
import type { AuthorizedNotificationScope } from "../../src/notifications/projection.ts";
import {
  createSubscription,
  type Subscription,
} from "../../src/notifications/subscriptions.ts";
import { PostgresMigrationRunner } from "../../src/platform/persistence/v1.ts";
import { notificationMigrations } from "../../src/notifications/migrations/index.ts";
import pg from "pg";

const scope: NotificationScope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
const actorAlice = "actor_alice" as ActorId;

Deno.test("Postgres repository hydrates subscriptions and enforces scoped SQL", async () => {
  const repository = new PostgresNotificationRepository();
  transaction.enqueue({
    rows: [{
      subscriptionId: "sub_alice-deal",
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      recipientId: actorAlice,
      eventType: "deal.updated",
      preferences: { channels: { in_app: true, email: false } },
      version: "3",
      createdAt: "2026-08-03T12:00:00.000Z",
      updatedAt: "2026-08-03T12:05:00.000Z",
    }],
    rowCount: 1,
  });

  const found = await repository.findSubscription(transaction, {
    scope,
    recipientId: actorAlice,
    eventType: "deal.updated",
  });

  assertEquals(found?.version, 3);
  assertEquals(found?.updatedAt, new Date("2026-08-03T12:05:00.000Z"));
  assert(transaction.queries[0]?.text.includes("tenant_id = $1"));
  assert(transaction.queries[0]?.text.includes("recipient_id = $4"));
  assertEquals(transaction.queries[0]?.parameters.slice(0, 4), [
    scope.tenantId,
    scope.workspaceId,
    scope.dealId,
    actorAlice,
  ]);
});

Deno.test("Postgres repository rejects a stale subscription replacement", async () => {
  const repository = new PostgresNotificationRepository();
  const current = subscription();
  const updated = {
    ...current,
    version: 2 as Subscription["version"],
    preferences: { channels: { in_app: false, email: true } },
  };
  transaction.enqueue({ rows: [], rowCount: 0 });
  transaction.enqueue({
    rows: [{
      subscriptionId: current.subscriptionId,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      dealId: scope.dealId,
      recipientId: actorAlice,
      eventType: current.eventType,
      preferences: current.preferences,
      version: "2",
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    }],
    rowCount: 1,
  });

  await assertRejects(
    () => repository.replaceSubscription(transaction, updated, 1 as never),
    SubscriptionVersionConflictError,
  );
});

Deno.test("in-memory repository makes cross-scope and cross-recipient reads equivalent to absence", async () => {
  const repository = new InMemoryNotificationRepository();
  const allowed = access(scope, actorAlice);
  await repository.insertProjection(transaction, projection(scope, actorAlice));

  const own = await repository.listProjections(transaction, {
    access: allowed,
    limit: 20,
  });
  const otherRecipient = await repository.listProjections(transaction, {
    access: access(scope, "actor_bob" as ActorId),
    limit: 20,
  });
  const otherTenant = await repository.listProjections(transaction, {
    access: access({
      ...scope,
      tenantId: "tenant_other" as TenantId,
    }, actorAlice),
    limit: 20,
  });

  assertEquals(own.length, 1);
  assertEquals(otherRecipient, []);
  assertEquals(otherTenant, []);
});

Deno.test("in-memory projection insert is idempotent on source event and recipient", async () => {
  const repository = new InMemoryNotificationRepository();
  const first = projection(scope, actorAlice);
  const second = {
    ...first,
    notificationId: createNotificationId("notif_other"),
  };

  assertEquals(
    await repository.insertProjection(transaction, first),
    "inserted",
  );
  assertEquals(
    await repository.insertProjection(transaction, second),
    "duplicate",
  );
});

const databaseUrl = Deno.env.get("MAI123_DATABASE_URL");

Deno.test({
  name:
    "notification PostgreSQL migration applies its owned schema and ledger entry",
  ignore: databaseUrl === undefined,
  async fn() {
    if (databaseUrl === undefined) return;
    const parsed = new URL(databaseUrl);
    if (parsed.pathname !== "/mai_test_mai123") {
      throw new Error(
        `MAI123_DATABASE_URL database "${parsed.pathname}" is unsafe; expected "/mai_test_mai123".`,
      );
    }
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
    try {
      const runner = new PostgresMigrationRunner(pool);
      await runner.apply(notificationMigrations);
      await runner.apply(notificationMigrations);
      const result = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'notifications' ORDER BY table_name`,
      );
      assertEquals(result.rows.map((row) => row.table_name), [
        "delivery_receipts",
        "idempotency_records",
        "projections",
        "subscriptions",
      ]);
    } finally {
      await pool.end();
    }
  },
});

function subscription(): Subscription {
  return createSubscription({
    subscriptionId: "sub_alice-deal",
    scope,
    recipientId: actorAlice,
    eventType: "deal.updated",
    preferences: { channels: { in_app: true, email: false } },
    now: new Date("2026-08-03T12:00:00.000Z"),
  });
}

function projection(
  projectionScope: NotificationScope,
  recipientId: ActorId,
): NotificationProjection {
  return freezeProjection({
    notificationId: createNotificationId("notif_event-1-actor-alice"),
    scope: projectionScope,
    recipientId,
    sourceEventId: "event-1",
    sourceEventType: "deal.updated",
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    createdAt: new Date("2026-08-03T12:00:00.000Z"),
    deliveryState: "queued",
    idempotencyKey: "idem_notification-event-1-actor-alice" as IdempotencyKey,
  });
}

function access(
  authorizedScope: NotificationScope,
  recipientId: ActorId,
): AuthorizedNotificationScope {
  return {
    ...authorizedScope,
    recipientId,
    action: "read",
    decision: {} as AuthorizedNotificationScope["decision"],
  };
}

class NamedTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};
  readonly queries: Array<{
    readonly text: string;
    readonly parameters: readonly unknown[];
  }> = [];
  private readonly responses: Array<{
    readonly rows: readonly Record<string, unknown>[];
    readonly rowCount: number;
  }> = [];

  enqueue(response: {
    readonly rows: readonly Record<string, unknown>[];
    readonly rowCount: number;
  }): void {
    this.responses.push(response);
  }

  query<TRow>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<{ rows: TRow[]; rowCount: number }> {
    this.queries.push({ text, parameters });
    const response = this.responses.shift();
    if (response === undefined) {
      return Promise.reject(new Error(`Named response missing for "${text}".`));
    }
    return Promise.resolve({
      rows: response.rows as TRow[],
      rowCount: response.rowCount,
    });
  }
}

const transaction = new NamedTransaction();
