import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  action,
  type AuthorizationDecision,
  evaluateAuthorization,
  field,
  resourceKind,
  type RoleFact,
} from "../../src/platform/authz/v1.ts";
import { parseRequestContext } from "../../src/shared/contracts/request_context.ts";
import type {
  ActorId,
  DealId,
  IdempotencyKey,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import {
  createNotificationCursor,
  createNotificationId,
  createSubscription,
  deterministicNotificationId,
  deterministicNotificationIdempotencyKey,
  freezeEventPayload,
  type NotificationEventPayload,
  type NotificationProjection,
  type NotificationScope,
  parseNotificationCursor,
  projectNotification,
  requireAuthorizedNotificationScope,
  type Subscription,
  type SubscriptionPreferences,
  updateSubscription,
} from "../../src/notifications/v1.ts";

const scope: NotificationScope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
const actorAlice = "actor_alice" as ActorId;
const actorBob = "actor_bob" as ActorId;
const preferences: SubscriptionPreferences = {
  channels: { in_app: true, email: false },
};

Deno.test("notification contracts preserve immutable source and recipient scope", () => {
  const source: NotificationEventPayload = {
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    recipients: [{ recipientId: actorAlice }],
  };
  const payload = freezeEventPayload(source);

  assertEquals(payload.recipients[0]?.recipientId, actorAlice);
  assertEquals(Object.isFrozen(payload.recipients), true);
  assertThrows(() => {
    (payload.recipients as NotificationEventPayload["recipients"] & unknown[])
      .push({
        recipientId: actorAlice,
      });
  });

  const notification = projection(actorAlice);
  assertEquals(notification.scope.tenantId, scope.tenantId);
  assertEquals(notification.recipientId, actorAlice);
  assertEquals(notification.title, "Deal updated");
});

Deno.test("subscription updates require the current version and advance once", () => {
  const current = subscription();
  const updated = updateSubscription(current, {
    expectedVersion: current.version,
    preferences: { channels: { in_app: false, email: true } },
    now: new Date("2026-08-03T12:01:00.000Z"),
  });

  assertEquals(current.version, 1);
  assertEquals(updated.version, 2);
  assertEquals(updated.preferences.channels.email, true);
  assertThrows(
    () =>
      updateSubscription(current, {
        expectedVersion: 2 as never,
        preferences,
        now: new Date("2026-08-03T12:02:00.000Z"),
      }),
    Error,
    "expected version",
  );
});

Deno.test("authorized projection returns recipient-safe fields only", () => {
  const decision = authorizationDecision();
  const access = requireAuthorizedNotificationScope({
    scope,
    recipientId: actorAlice,
    action: "read",
    decision,
  });
  const read = projectNotification(projection(actorAlice), access);

  assertEquals(read, {
    id: createNotificationId("notif_event-1-actor-alice"),
    dealId: scope.dealId,
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    createdAt: "2026-08-03T12:00:00.000Z",
    deliveryState: "queued",
  });
  assert("sourceEventId" in read === false);
  assert("recipientId" in read === false);
});

Deno.test("projection rejects another recipient as protected-not-found", () => {
  const access = requireAuthorizedNotificationScope({
    scope,
    recipientId: actorAlice,
    action: "read",
    decision: authorizationDecision(),
  });

  assertThrows(
    () => projectNotification(projection(actorBob), access),
    Error,
    "protected notification",
  );
});

Deno.test("notification cursors are opaque and deterministic identifiers are stable", () => {
  const notificationId = deterministicNotificationId("event/1", actorAlice);
  const cursor = createNotificationCursor({
    createdAt: "2026-08-03T12:00:00.000Z",
    notificationId,
  });
  const parsed = parseNotificationCursor(cursor);

  assertEquals(parsed, {
    createdAt: "2026-08-03T12:00:00.000Z",
    notificationId,
  });
  assertEquals(
    deterministicNotificationIdempotencyKey("event/1", actorAlice),
    deterministicNotificationIdempotencyKey("event/1", actorAlice),
  );
  assertEquals(
    createNotificationId("notif_event-1-actor-alice"),
    notificationId,
  );
});

function subscription(): Subscription {
  return createSubscription({
    subscriptionId: "sub_alice-deal",
    scope,
    recipientId: actorAlice,
    eventType: "deal.updated",
    preferences,
    now: new Date("2026-08-03T12:00:00.000Z"),
  });
}

function projection(recipientId: ActorId): NotificationProjection {
  return {
    notificationId: createNotificationId("notif_event-1-actor-alice"),
    scope,
    recipientId,
    sourceEventId: "event-1",
    sourceEventType: "deal.updated",
    notificationType: "deal.updated",
    title: "Deal updated",
    body: "A deal changed.",
    createdAt: new Date("2026-08-03T12:00:00.000Z"),
    deliveryState: "queued",
    idempotencyKey: "idem_notification-event-1-actor-alice" as IdempotencyKey,
  };
}

function authorizationDecision(): AuthorizationDecision {
  const contextResult = parseRequestContext({
    actorId: actorAlice,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_notification",
    origin: "http",
  });
  if (!contextResult.ok) {
    throw new Error("Notification fixture context invalid.");
  }
  const role: RoleFact = {
    id: "role_notification_reader",
    scope,
    resourceKinds: [resourceKind("notification")],
    actions: [action("read")],
    fields: [field("notification")],
  };
  return evaluateAuthorization({
    context: contextResult.value,
    actor: { id: actorAlice, kind: "human", state: "active" },
    scope,
    resource: {
      kind: resourceKind("notification"),
      id: "notif_event-1-actor-alice",
    },
    action: action("read"),
    requestedFields: [],
    roleFacts: [role],
    grantFacts: [],
    restrictionFacts: [],
    relationshipFacts: [],
    clock: { now: () => "2026-08-03T12:00:00.000Z" },
  });
}
