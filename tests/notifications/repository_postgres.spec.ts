import { assert, assertEquals, assertRejects } from "@std/assert";
import type { AuthorizationDecision } from "../../src/platform/authz/v1.ts";
import type { TransactionHandle } from "../../src/platform/persistence/transaction.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import {
  createDeliveryReceiptId,
  createNotificationId,
  freezeProjection,
  type NotificationProjection,
  type NotificationScope,
} from "../../src/notifications/model.ts";
import {
  InMemoryNotificationRepository,
  PostgresNotificationRepository,
} from "../../src/notifications/repository.ts";
import {
  SubscriptionVersionConflictError,
  updateSubscription,
} from "../../src/notifications/subscriptions.ts";
import type { AuthorizedNotificationScope } from "../../src/notifications/projection.ts";
import {
  createSubscription,
  type Subscription,
} from "../../src/notifications/subscriptions.ts";
import {
  NotificationIdempotencyConflictError,
  NotificationV1Service,
} from "../../src/api/v1/notifications.ts";
import type { RequestContext } from "../../src/shared/contracts/request_context.ts";
import {
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import { notificationMigrations } from "../../src/notifications/migrations/index.ts";
import type { DeliveryReceipt } from "../../src/notifications/model.ts";
import type { NotificationIdempotencyRecord } from "../../src/notifications/repository.ts";
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

Deno.test("Postgres repository persists scoped notification lifecycle evidence", async () => {
  const fixture = await openFixture();
  const suffix = testSuffix();
  const testScope: NotificationScope = {
    tenantId: `tenant_${suffix}` as TenantId,
    workspaceId: `workspace_${suffix}` as WorkspaceId,
    dealId: `deal_${suffix}` as DealId,
  };
  const recipientId = `actor_${suffix}` as ActorId;
  const subscriptionId = `sub_${suffix}` as Subscription["subscriptionId"];
  const current = createSubscription({
    subscriptionId,
    scope: testScope,
    recipientId,
    eventType: "deal.updated",
    preferences: { channels: { in_app: true, email: false } },
    now: new Date("2026-08-04T12:00:00.000Z"),
  });
  const access = accessFor(testScope, recipientId);
  const projection = freezeProjection({
    notificationId: createNotificationId(`notif_${suffix}`),
    scope: testScope,
    recipientId,
    sourceEventId: `event_${suffix}`,
    sourceEventType: "deal.updated",
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    subscriptionId: current.subscriptionId,
    subscriptionVersion: current.version,
    createdAt: current.createdAt,
    expiresAt: new Date("2026-08-05T12:00:00.000Z"),
    deliveryState: "queued",
    idempotencyKey: `idem_${suffix}` as IdempotencyKey,
  });
  try {
    await fixture.transactions.run((transaction) =>
      fixture.repository.insertSubscription(transaction, current)
    );
    assertEquals(
      (await fixture.transactions.run((transaction) =>
        fixture.repository.findSubscription(transaction, {
          scope: testScope,
          recipientId,
          eventType: current.eventType,
        })
      ))?.version,
      1,
    );
    assertEquals(
      await fixture.transactions.run((transaction) =>
        fixture.repository.findSubscription(transaction, {
          scope: {
            ...testScope,
            workspaceId: "workspace_other" as WorkspaceId,
          },
          recipientId,
          eventType: current.eventType,
        })
      ),
      undefined,
    );
    const updated = updateSubscription(current, {
      expectedVersion: current.version,
      preferences: { channels: { in_app: false, email: true } },
      now: new Date("2026-08-04T12:01:00.000Z"),
    });
    await fixture.transactions.run((transaction) =>
      fixture.repository.replaceSubscription(
        transaction,
        updated,
        current.version,
      )
    );
    await assertRejects(
      () =>
        fixture.transactions.run((transaction) =>
          fixture.repository.replaceSubscription(
            transaction,
            { ...updated, version: 3 as Subscription["version"] },
            current.version,
          )
        ),
      SubscriptionVersionConflictError,
    );
    assertEquals(
      await fixture.transactions.run((transaction) =>
        fixture.repository.insertProjection(transaction, projection)
      ),
      "inserted",
    );
    assertEquals(
      await fixture.transactions.run((transaction) =>
        fixture.repository.insertProjection(transaction, {
          ...projection,
          notificationId: createNotificationId(`notif_duplicate-${suffix}`),
        })
      ),
      "duplicate",
    );
    await fixture.transactions.run((transaction) =>
      fixture.repository.attachDeliveryJob(transaction, {
        access,
        notificationId: projection.notificationId,
        idempotencyKey: projection.idempotencyKey,
        jobId: `job_${suffix}` as JobId,
        operationId: `op_${suffix}` as OperationId,
      })
    );
    for (
      const state of [
        "attempting",
        "retry_scheduled",
        "expired",
        "dead_lettered",
      ] as const
    ) {
      await fixture.transactions.run((transaction) =>
        fixture.repository.updateDeliveryState(transaction, {
          access,
          notificationId: projection.notificationId,
          jobId: `job_${suffix}`,
          state,
        })
      );
    }
    const outcomes: DeliveryReceipt["outcome"][] = [
      "attempted",
      "retry_scheduled",
      "expired",
      "terminal",
    ];
    for (const [index, outcome] of outcomes.entries()) {
      await fixture.transactions.run((transaction) =>
        fixture.repository.appendReceipt(transaction, {
          receiptId: createDeliveryReceiptId(
            `receipt_${suffix}-${index}-${outcome.replaceAll("_", "-")}`,
          ),
          scope: testScope,
          recipientId,
          notificationId: projection.notificationId,
          jobId: `job_${suffix}` as DeliveryReceipt["jobId"],
          channel: "email",
          attemptNumber: index + 1,
          outcome,
          ...(outcome === "terminal" ? { failureCode: "REMOTE_FAILED" } : {}),
          occurredAt: new Date(2026, 7, 4, 12, index),
        })
      );
    }
    const foundProjection = await fixture.transactions.run((transaction) =>
      fixture.repository.findProjection(transaction, {
        access,
        notificationId: projection.notificationId,
      })
    );
    assertEquals(foundProjection?.deliveryState, "dead_lettered");
    assertEquals(
      (await fixture.transactions.run((transaction) =>
        fixture.repository.listReceipts(transaction, {
          access,
          notificationId: projection.notificationId,
        })
      )).map((receipt) => receipt.outcome),
      outcomes,
    );
    assertEquals(
      await fixture.transactions.run((transaction) =>
        fixture.repository.listProjections(transaction, {
          access: accessFor(
            { ...testScope, dealId: "deal_other" as DealId },
            recipientId,
          ),
          limit: 20,
        })
      ),
      [],
    );
    assertEquals(
      await fixture.transactions.run((transaction) =>
        fixture.repository.listProjections(transaction, {
          access: accessFor(testScope, "actor_other" as ActorId),
          limit: 20,
        })
      ),
      [],
    );
    assertEquals(
      await fixture.transactions.run((transaction) =>
        fixture.repository.listProjections(transaction, {
          access: accessFor({
            ...testScope,
            tenantId: "tenant_other" as TenantId,
          }, recipientId),
          limit: 20,
        })
      ),
      [],
    );
  } finally {
    await fixture.pool.end();
  }
});

Deno.test("Postgres idempotency records use exact scope and atomic duplicate observation", async () => {
  const fixture = await openFixture();
  const suffix = testSuffix();
  const base: NotificationIdempotencyRecord = {
    tenantId: `tenant_${suffix}` as TenantId,
    workspaceId: `workspace_${suffix}` as WorkspaceId,
    dealId: `deal_${suffix}` as DealId,
    actorId: `actor_${suffix}` as ActorId,
    commandType: "subscription",
    targetId: `sub_${suffix}`,
    idempotencyKey: `idem_${suffix}` as IdempotencyKey,
    payloadDigest: "a".repeat(64),
    result: { subscription: { status: "created" } },
    createdAt: new Date("2026-08-04T12:00:00.000Z"),
  };
  const identities = [
    base,
    { ...base, dealId: `deal_other_${suffix}` as DealId },
    { ...base, dealId: undefined },
    { ...base, workspaceId: `workspace_other_${suffix}` as WorkspaceId },
    { ...base, tenantId: `tenant_other_${suffix}` as TenantId },
    { ...base, actorId: `actor_other_${suffix}` as ActorId },
  ];
  try {
    for (const record of identities) {
      assertEquals(
        await fixture.transactions.run((transaction) =>
          fixture.repository.insertIdempotency(transaction, record)
        ),
        "inserted",
      );
      const found = await fixture.transactions.run((transaction) =>
        fixture.repository.findIdempotency(transaction, record)
      );
      assertEquals(found?.dealId, record.dealId);
      assertEquals(found?.actorId, record.actorId);
    }
    assertEquals(
      await fixture.transactions.run((transaction) =>
        fixture.repository.insertIdempotency(transaction, base)
      ),
      "duplicate",
    );
  } finally {
    await fixture.pool.end();
  }
});

Deno.test("Postgres concurrent notification commands have one winner and one replay", async () => {
  const fixture = await openFixture();
  const suffix = testSuffix();
  const scope: NotificationScope = {
    tenantId: `tenant_${suffix}` as TenantId,
    workspaceId: `workspace_${suffix}` as WorkspaceId,
    dealId: `deal_${suffix}` as DealId,
  };
  const context: RequestContext = {
    actorId: `actor_${suffix}` as ActorId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: `cor_${suffix}` as CorrelationId,
    origin: "internal",
  };
  const service = new NotificationV1Service({
    repository: fixture.repository,
    transactions: fixture.transactions,
    authorization: new AllowAuthorization(),
    clock: { now: () => new Date("2026-08-04T12:00:00.000Z") },
  });
  const input = {
    context,
    scope,
    subscriptionId: `sub_${suffix}`,
    eventType: "deal.updated",
    preferences: { channels: { in_app: true, email: false } },
    idempotencyKey: `idem_${suffix}` as IdempotencyKey,
  };
  try {
    const outcomes = await Promise.all([
      service.saveSubscription(input),
      service.saveSubscription(input),
    ]);
    assertEquals(
      outcomes.map((outcome) => outcome.replayed).sort(),
      [false, true],
    );
    const stored = await fixture.transactions.run((transaction) =>
      fixture.repository.findSubscription(transaction, {
        scope,
        recipientId: context.actorId,
        eventType: input.eventType,
      })
    );
    assertEquals(stored?.version, 1);
    await assertRejects(
      () =>
        service.saveSubscription({
          ...input,
          preferences: { channels: { in_app: false, email: true } },
        }),
      NotificationIdempotencyConflictError,
    );
  } finally {
    await fixture.pool.end();
  }
});

Deno.test("Postgres concurrent delivery commands replay one durable job reference", async () => {
  const fixture = await openFixture();
  const suffix = testSuffix();
  const scope: NotificationScope = {
    tenantId: `tenant_${suffix}` as TenantId,
    workspaceId: `workspace_${suffix}` as WorkspaceId,
    dealId: `deal_${suffix}` as DealId,
  };
  const actorId = `actor_${suffix}` as ActorId;
  const notificationId = createNotificationId(`notif_${suffix}`);
  const jobId = `job_${suffix}` as JobId;
  const operationId = `op_${suffix}` as OperationId;
  const projection = freezeProjection({
    notificationId,
    scope,
    recipientId: actorId,
    sourceEventId: `event_${suffix}`,
    sourceEventType: "deal.updated",
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    createdAt: new Date("2026-08-04T12:00:00.000Z"),
    deliveryState: "queued",
    jobId,
    operationId,
    idempotencyKey: `idem_projection_${suffix}` as IdempotencyKey,
  });
  const context: RequestContext = {
    actorId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: `cor_${suffix}` as CorrelationId,
    origin: "internal",
  };
  const service = new NotificationV1Service({
    repository: fixture.repository,
    transactions: fixture.transactions,
    authorization: new AllowAuthorization(),
    clock: { now: () => new Date("2026-08-04T12:00:00.000Z") },
  });
  const input = {
    context,
    scope,
    notificationId,
    idempotencyKey: `idem_delivery_${suffix}` as IdempotencyKey,
  };
  try {
    await fixture.transactions.run((transaction) =>
      fixture.repository.insertProjection(transaction, projection)
    );
    const outcomes = await Promise.all([
      service.requestDelivery(input),
      service.requestDelivery(input),
    ]);
    assertEquals(
      outcomes.map((outcome) => outcome.replayed).sort(),
      [false, true],
    );
    assertEquals(outcomes.map((outcome) => outcome.jobId), [jobId, jobId]);
  } finally {
    await fixture.pool.end();
  }
});

interface PostgresFixture {
  readonly pool: pg.Pool;
  readonly transactions: PostgresTransactionRunner;
  readonly repository: PostgresNotificationRepository;
}

async function openFixture(): Promise<PostgresFixture> {
  const pool = new pg.Pool({ connectionString: requiredDatabaseUrl(), max: 8 });
  try {
    await new PostgresMigrationRunner(pool).apply(notificationMigrations);
    return {
      pool,
      transactions: new PostgresTransactionRunner(pool),
      repository: new PostgresNotificationRepository(),
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

function requiredDatabaseUrl(): string {
  const databaseUrl = Deno.env.get(
    "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL",
  );
  if (databaseUrl === undefined) {
    throw new Error(
      "NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL is required; expected a fresh isolated PostgreSQL database for MAI-123 integration evidence.",
    );
  }
  const parsed = new URL(databaseUrl);
  if (parsed.pathname !== "/mai_test_notifications_integration") {
    throw new Error(
      `NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL database "${parsed.pathname}" is unsafe; expected "/mai_test_notifications_integration".`,
    );
  }
  return databaseUrl;
}

function testSuffix(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

function accessFor(
  scope: NotificationScope,
  recipientId: ActorId,
): AuthorizedNotificationScope {
  return {
    ...scope,
    recipientId,
    action: "read",
    decision: {} as AuthorizedNotificationScope["decision"],
  };
}

class AllowAuthorization {
  authorize(): Promise<AuthorizationDecision> {
    return Promise.resolve({
      outcome: "allow",
      approvedScope: {},
    } as AuthorizationDecision);
  }
}

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
