import { assertEquals } from "@std/assert";
import {
  ClaimedOutboxEvent,
  OutboxDispatcher,
  OutboxPublisher,
  OutboxStore,
  sanitizedFailure,
} from "../../../src/platform/events/v1.ts";
import { parseAggregateVersion } from "../../../src/platform/api/v1.ts";

Deno.test("dispatcher publishes once and records durable completion", async () => {
  const store = new RecordingOutboxStore(fixtureClaimedEvent());
  const publisher = new RecordingPublisher();
  const dispatcher = new OutboxDispatcher({
    transactions: new ImmediateTransactions(),
    store,
    publisher,
    clock: new FixedClock(),
    retryPolicy: new NeverRetryPolicy(),
    failureSanitizer: new CodeOnlyFailureSanitizer(),
  });

  assertEquals(await dispatcher.dispatchOne("dispatcher_a", 60_000), {
    status: "published",
    eventId: "event_dispatch",
  });
  assertEquals(publisher.eventIds, ["event_dispatch"]);
  assertEquals(store.completed, ["event_dispatch"]);
});

Deno.test("dispatcher records sanitized retry or dead-letter outcomes", async () => {
  const retryStore = new RecordingOutboxStore(fixtureClaimedEvent());
  const retryDispatcher = new OutboxDispatcher({
    transactions: new ImmediateTransactions(),
    store: retryStore,
    publisher: new FailingPublisher(),
    clock: new FixedClock(),
    retryPolicy: new OneRetryPolicy(),
    failureSanitizer: new CodeOnlyFailureSanitizer(),
  });
  assertEquals(
    (await retryDispatcher.dispatchOne("dispatcher_a", 60_000)).status,
    "retry_scheduled",
  );
  assertEquals(retryStore.failures, [{
    eventId: "event_dispatch",
    failure: "PUBLISH_FAILED",
    retryAt: "2026-07-30T12:01:00.000Z",
  }]);

  const deadStore = new RecordingOutboxStore(fixtureClaimedEvent());
  const deadDispatcher = new OutboxDispatcher({
    transactions: new ImmediateTransactions(),
    store: deadStore,
    publisher: new FailingPublisher(),
    clock: new FixedClock(),
    retryPolicy: new NeverRetryPolicy(),
    failureSanitizer: new CodeOnlyFailureSanitizer(),
  });
  assertEquals(
    (await deadDispatcher.dispatchOne("dispatcher_a", 60_000)).status,
    "dead_lettered",
  );
});

function fixtureClaimedEvent(): ClaimedOutboxEvent {
  const version = parseAggregateVersion(1);
  if (!version.ok) throw new Error("Fixture aggregate version is invalid.");
  return {
    eventId: "event_dispatch",
    tenantId: "tenant_mai106" as ClaimedOutboxEvent["tenantId"],
    aggregateType: "fixture",
    aggregateId: "aggregate_1",
    aggregateVersion: version.value,
    eventType: "fixture.updated",
    schemaVersion: 1,
    payload: {},
    correlationId: "cor_mai106" as ClaimedOutboxEvent["correlationId"],
    occurredAt: new Date("2026-07-30T12:00:00.000Z"),
    availableAt: new Date("2026-07-30T12:00:00.000Z"),
    attemptCount: 1,
    leaseOwner: "dispatcher_a",
    leaseExpiresAt: new Date("2026-07-30T12:01:00.000Z"),
  };
}

class RecordingOutboxStore implements OutboxStore {
  readonly completed: string[] = [];
  readonly failures: Array<{
    eventId: string;
    failure: string;
    retryAt: string | undefined;
  }> = [];

  constructor(private readonly event: ClaimedOutboxEvent | undefined) {}

  claim(): Promise<ClaimedOutboxEvent[]> {
    return Promise.resolve(this.event === undefined ? [] : [this.event]);
  }

  markPublished(
    _transaction: unknown,
    event: ClaimedOutboxEvent,
  ): Promise<void> {
    this.completed.push(event.eventId);
    return Promise.resolve();
  }

  recordFailure(
    _transaction: unknown,
    event: ClaimedOutboxEvent,
    failure: string,
    retryAt: Date | undefined,
  ): Promise<"retry_scheduled" | "dead_lettered"> {
    this.failures.push({
      eventId: event.eventId,
      failure,
      retryAt: retryAt?.toISOString(),
    });
    return Promise.resolve(
      retryAt === undefined ? "dead_lettered" : "retry_scheduled",
    );
  }
}

class RecordingPublisher implements OutboxPublisher {
  readonly eventIds: string[] = [];

  publish(event: ClaimedOutboxEvent): Promise<void> {
    this.eventIds.push(event.eventId);
    return Promise.resolve();
  }
}

class FailingPublisher implements OutboxPublisher {
  publish(): Promise<void> {
    return Promise.reject(new Error("raw provider stack must not persist"));
  }
}

class FixedClock {
  now(): Date {
    return new Date("2026-07-30T12:00:00.000Z");
  }
}

class OneRetryPolicy {
  nextAttempt(): Date {
    return new Date("2026-07-30T12:01:00.000Z");
  }
}

class NeverRetryPolicy {
  nextAttempt(): undefined {
    return undefined;
  }
}

class CodeOnlyFailureSanitizer {
  sanitize(): ReturnType<typeof sanitizedFailure> {
    return sanitizedFailure("PUBLISH_FAILED");
  }
}

class ImmediateTransactions {
  run<TResult>(
    callback: (transaction: never) => Promise<TResult> | TResult,
  ): Promise<TResult> {
    return Promise.resolve(callback(undefined as never));
  }
}
