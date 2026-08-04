import { assertEquals } from "@std/assert";
import type { TransactionHandle } from "../../../src/platform/persistence/transaction.ts";
import type { AuthorizationDecision } from "../../../src/platform/authz/v1.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  IdempotencyKey,
  JobId,
  OperationId,
  TenantId,
  WorkspaceId,
} from "../../../src/shared/contracts/identifiers.ts";
import type { RequestContext } from "../../../src/shared/contracts/request_context.ts";
import {
  createNotificationId,
  freezeProjection,
  type NotificationScope,
} from "../../../src/notifications/model.ts";
import { InMemoryNotificationRepository } from "../../../src/notifications/repository.ts";
import {
  handleNotificationV1Route,
  type NotificationV1RouteDependencies,
} from "../../../src/api/v1/notifications_routes.ts";

const scope: NotificationScope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
const actorAlice = "actor_alice" as ActorId;
const correlationId = "cor_notifications" as CorrelationId;

Deno.test("v1 notification list is recipient-authorized and returns an opaque cursor contract", async () => {
  const repository = new InMemoryNotificationRepository();
  await seedProjection(repository);
  const dependencies = routeDependencies(repository, actorAlice, true);
  const response = await handleNotificationV1Route(
    request("GET", "/api/v1/notifications?limit=20"),
    dependencies,
  );
  const body = await response?.json();

  assertEquals(response?.status, 200);
  assertEquals(body.data.notifications[0].title, "Deal updated");
  assertEquals(body.data.notifications[0].recipientId, undefined);
  assertEquals(body.meta.correlationId, correlationId);
});

Deno.test("v1 subscription command uses ETag and idempotency replay", async () => {
  const repository = new InMemoryNotificationRepository();
  const dependencies = routeDependencies(repository, actorAlice, true);
  const first = await handleNotificationV1Route(
    request("POST", "/api/v1/notifications/subscriptions", {
      subscriptionId: "sub_alice-deal",
      eventType: "deal.updated",
      preferences: { channels: { in_app: true, email: false } },
    }, "idem_subscription-create"),
    dependencies,
  );
  const replay = await handleNotificationV1Route(
    request("POST", "/api/v1/notifications/subscriptions", {
      subscriptionId: "sub_alice-deal",
      eventType: "deal.updated",
      preferences: { channels: { in_app: true, email: false } },
    }, "idem_subscription-create"),
    dependencies,
  );

  assertEquals(first?.status, 201);
  assertEquals(first?.headers.get("ETag"), '"v1"');
  assertEquals(replay?.status, 201);
  assertEquals(await first?.json(), await replay?.json());
});

Deno.test("v1 subscription update rejects a stale If-Match version", async () => {
  const repository = new InMemoryNotificationRepository();
  const dependencies = routeDependencies(repository, actorAlice, true);
  await handleNotificationV1Route(
    request("POST", "/api/v1/notifications/subscriptions", {
      subscriptionId: "sub_alice-deal",
      eventType: "deal.updated",
      preferences: { channels: { in_app: true, email: false } },
    }, "idem_subscription-create"),
    dependencies,
  );
  await handleNotificationV1Route(
    request(
      "PUT",
      "/api/v1/notifications/subscriptions/sub_alice-deal",
      {
        preferences: { channels: { in_app: false, email: true } },
      },
      "idem_subscription-update-1",
      '"v1"',
    ),
    dependencies,
  );
  const response = await handleNotificationV1Route(
    request(
      "PUT",
      "/api/v1/notifications/subscriptions/sub_alice-deal",
      {
        preferences: { channels: { in_app: false, email: true } },
      },
      "idem_subscription-update-2",
      '"v1"',
    ),
    dependencies,
  );

  assertEquals(response?.status, 409);
  assertEquals((await response?.json()).error.code, "VERSION_CONFLICT");
});

Deno.test("v1 unauthorized and absent notification reads both return protected-not-found", async () => {
  const repository = new InMemoryNotificationRepository();
  const absent = await handleNotificationV1Route(
    request("GET", "/api/v1/notifications/notif_missing"),
    routeDependencies(repository, actorAlice, true),
  );
  const unauthorized = await handleNotificationV1Route(
    request("GET", "/api/v1/notifications/notif_existing"),
    routeDependencies(repository, actorAlice, false),
  );

  assertEquals(absent?.status, 404);
  assertEquals(unauthorized?.status, 404);
  assertEquals(await absent?.json(), await unauthorized?.json());
});

Deno.test("v1 delivery returns the durable job reference", async () => {
  const repository = new InMemoryNotificationRepository();
  await seedProjection(repository, true);
  const response = await handleNotificationV1Route(
    request(
      "POST",
      "/api/v1/notifications/notif_event-1-actor-alice/deliver",
      {},
      "idem_delivery-1",
    ),
    routeDependencies(repository, actorAlice, true),
  );
  const body = await response?.json();

  assertEquals(response?.status, 202);
  assertEquals(body.data.status, "accepted");
  assertEquals(body.data.jobId, "job_notification-notif-event-1-actor-alice");
  assertEquals(
    body.data.operationId,
    "op_notification-notif-event-1-actor-alice",
  );
});

function routeDependencies(
  repository: InMemoryNotificationRepository,
  actorId: ActorId,
  allowed: boolean,
): NotificationV1RouteDependencies {
  const context = contextFor(actorId);
  return {
    repository,
    transactions: new ImmediateRunner(),
    authorization: new NamedAuthorization(allowed),
    clock: { now: () => new Date("2026-08-03T12:00:00.000Z") },
    authenticate: () => Promise.resolve(context),
  };
}

function contextFor(actorId: ActorId): RequestContext {
  return {
    actorId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId,
    origin: "http",
  };
}

async function seedProjection(
  repository: InMemoryNotificationRepository,
  attachJob = false,
): Promise<void> {
  const projection = freezeProjection({
    notificationId: createNotificationId("notif_event-1-actor-alice"),
    scope,
    recipientId: actorAlice,
    sourceEventId: "event-1",
    sourceEventType: "deal.updated",
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    createdAt: new Date("2026-08-03T12:00:00.000Z"),
    deliveryState: "queued",
    idempotencyKey: "idem_notification-event-1-actor-alice" as IdempotencyKey,
    ...(attachJob
      ? {
        jobId: "job_notification-notif-event-1-actor-alice" as JobId,
        operationId: "op_notification-notif-event-1-actor-alice" as OperationId,
      }
      : {}),
  });
  await repository.insertProjection(new FakeTransaction(), projection);
}

function request(
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string,
  ifMatch?: string,
): Request {
  const headers = new Headers({ "X-Correlation-Id": correlationId });
  if (idempotencyKey !== undefined) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  if (ifMatch !== undefined) headers.set("If-Match", ifMatch);
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

class NamedAuthorization {
  constructor(private readonly allowed: boolean) {}

  authorize(): Promise<AuthorizationDecision> {
    return Promise.resolve(
      this.allowed
        ? ({ outcome: "allow", approvedScope: {} } as AuthorizationDecision)
        : ({
          outcome: "deny",
          reasonCode: "NO_MATCHING_GRANT",
        } as AuthorizationDecision),
    );
  }
}

class ImmediateRunner {
  run<TResult>(
    callback: (transaction: TransactionHandle) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(new FakeTransaction()));
  }
}

class FakeTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};

  query<TRow>(): Promise<{ rows: TRow[]; rowCount: number }> {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
}
