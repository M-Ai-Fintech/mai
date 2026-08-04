import { assert, assertEquals, assertRejects } from "@std/assert";
import type { OutboxEvent } from "../../src/platform/events/v1.ts";
import type { InboxMessage } from "../../src/platform/events/inbox.ts";
import type { TransactionHandle } from "../../src/platform/persistence/transaction.ts";
import type { DurableJob } from "../../src/platform/jobs/v1.ts";
import type {
  AggregateVersion,
} from "../../src/shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../../src/shared/contracts/identifiers.ts";
import {
  InMemoryNotificationRepository,
  type NotificationRepository,
} from "../../src/notifications/repository.ts";
import {
  createSubscription,
  type Subscription,
} from "../../src/notifications/subscriptions.ts";
import {
  type NotificationEventAuthorizer,
  NotificationEventConsumer,
  type NotificationTransactionRunner,
} from "../../src/notifications/consumer.ts";
import type { AuthorizedNotificationScope } from "../../src/notifications/projection.ts";
import type { NotificationScope } from "../../src/notifications/model.ts";

const scope: NotificationScope = {
  tenantId: "tenant_alpha" as TenantId,
  workspaceId: "workspace_main" as WorkspaceId,
  dealId: "deal_solar" as DealId,
};
const actorAlice = "actor_alice" as ActorId;
const now = new Date("2026-08-03T12:00:00.000Z");

Deno.test("consumer uses inbox deduplication, projects recipients, and never mutates source payload", async () => {
  const repository = new InMemoryNotificationRepository();
  await addSubscription(repository);
  const inbox = new FakeInbox();
  const jobs = new FakeJobQueue();
  const event = notificationEvent();
  const originalPayload = structuredClone(event.payload);
  const consumer = new NotificationEventConsumer(
    dependencies(repository, inbox, jobs),
  );

  const first = await consumer.consume(event);
  const duplicate = await consumer.consume(event);

  assertEquals(first, {
    status: "projected",
    eventId: "event_notification_1",
    projectionCount: 1,
    jobCount: 1,
  });
  assertEquals(duplicate, {
    status: "duplicate",
    eventId: "event_notification_1",
  });
  assertEquals(inbox.claimCalls, 2);
  assertEquals(inbox.completed.length, 1);
  assertEquals(jobs.jobs.length, 1);
  assertEquals(event.payload, originalPayload);
  assertEquals(jobs.jobs[0]?.payload.channel, "in_app");
});

Deno.test("consumer ignores recipients without an eligible subscription", async () => {
  const repository = new InMemoryNotificationRepository();
  const inbox = new FakeInbox();
  const jobs = new FakeJobQueue();
  const result = await new NotificationEventConsumer(
    dependencies(repository, inbox, jobs),
  ).consume(notificationEvent());

  assertEquals(result, { status: "ignored", eventId: "event_notification_1" });
  assertEquals(jobs.jobs, []);
  assertEquals(inbox.completed.length, 1);
});

Deno.test("consumer rejects an event without workspace scope before projection", async () => {
  const repository = new InMemoryNotificationRepository();
  const inbox = new FakeInbox();
  const jobs = new FakeJobQueue();
  const event = { ...notificationEvent(), workspaceId: undefined };

  await assertRejects(
    () =>
      new NotificationEventConsumer(dependencies(repository, inbox, jobs))
        .consume(event),
    Error,
    "workspace scope",
  );
  assertEquals(jobs.jobs, []);
});

async function addSubscription(
  repository: NotificationRepository,
): Promise<void> {
  await repository.insertSubscription(
    new FakeTransaction(),
    createSubscription({
      subscriptionId: "sub_alice-deal",
      scope,
      recipientId: actorAlice,
      eventType: "deal.updated",
      preferences: { channels: { in_app: true, email: false } },
      now,
    }),
  );
}

function dependencies(
  repository: NotificationRepository,
  inbox: FakeInbox,
  jobs: FakeJobQueue,
) {
  return {
    transactions: new ImmediateRunner(),
    inbox,
    repository,
    jobs,
    authorizer: new FakeNotificationEventAuthorizer(),
    clock: { now: () => now },
  };
}

function notificationEvent(): OutboxEvent {
  return {
    eventId: "event_notification_1",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    aggregateType: "deal",
    aggregateId: "deal_solar",
    aggregateVersion: 1 as AggregateVersion,
    eventType: "deal.updated",
    schemaVersion: 1,
    payload: {
      notificationType: "deal.updated",
      title: "Deal updated",
      body: "A deal changed.",
      recipients: [{ recipientId: actorAlice }],
    },
    correlationId: "cor_notification" as CorrelationId,
    occurredAt: now,
    availableAt: now,
  };
}

class ImmediateRunner implements NotificationTransactionRunner {
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

class FakeInbox {
  claimCalls = 0;
  completed: InboxMessage[] = [];

  claim(
    _transaction: TransactionHandle,
    _message: InboxMessage,
  ): Promise<
    { status: "claimed" } | { status: "duplicate"; state: "processed" }
  > {
    this.claimCalls++;
    return Promise.resolve(
      this.claimCalls === 1
        ? { status: "claimed" }
        : { status: "duplicate", state: "processed" },
    );
  }

  complete(
    _transaction: TransactionHandle,
    message: InboxMessage,
    _processedAt: Date,
  ): Promise<void> {
    this.completed.push(message);
    return Promise.resolve();
  }
}

class FakeJobQueue {
  readonly jobs: DurableJob[] = [];

  enqueue(_transaction: TransactionHandle, job: DurableJob): Promise<void> {
    this.jobs.push(job);
    return Promise.resolve();
  }
}

class FakeNotificationEventAuthorizer implements NotificationEventAuthorizer {
  readonly requests: Array<{
    readonly scope: NotificationScope;
    readonly recipientId: ActorId;
  }> = [];

  authorize(
    authorizedScope: NotificationScope,
    recipientId: ActorId,
  ): Promise<AuthorizedNotificationScope> {
    this.requests.push({ scope: authorizedScope, recipientId });
    return Promise.resolve({
      ...authorizedScope,
      recipientId,
      action: "deliver",
      decision: {} as AuthorizedNotificationScope["decision"],
    });
  }
}
