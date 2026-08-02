import { assertEquals, assertRejects } from "@std/assert";
import {
  type AuditEventRepository,
  TransactionalAuditOutboxAppender,
} from "../../src/audit_activity/v1.ts";
import type { OutboxEvent } from "../../src/platform/events/v1.ts";
import type { TransactionHandle } from "../../src/platform/persistence/transaction.ts";
import { PostgresTransactionRunner } from "../../src/platform/persistence/v1.ts";
import { fixtureEvent } from "./support.ts";

Deno.test("audited transition writes audit and outbox through one transaction handle", async () => {
  const audit = new RecordingAuditRepository();
  const outbox = new RecordingOutboxRepository();
  const appender = new TransactionalAuditOutboxAppender(audit, outbox);
  const event = fixtureEvent(1);
  const outboxEvent = fixtureOutboxEvent(event.eventId);
  const transaction = new RecordingTransaction();

  await appender.append(transaction, event, outboxEvent);

  assertEquals(audit.transactions, [transaction]);
  assertEquals(outbox.transactions, [transaction]);
  assertEquals(outbox.events, [outboxEvent.eventId]);
  assertEquals(audit.events, [event.eventId]);
});

Deno.test("audited transition rejects an outbox that is not linked to the audit event", async () => {
  const appender = new TransactionalAuditOutboxAppender(
    new RecordingAuditRepository(),
    new RecordingOutboxRepository(),
  );
  const event = fixtureEvent(1);

  await assertRejects(
    () =>
      appender.append(
        new RecordingTransaction(),
        event,
        fixtureOutboxEvent("audit-event-other"),
      ),
    Error,
    "payload.auditEventId",
  );
});

Deno.test("outbox failure rolls back the audit insert on the same transaction", async () => {
  const connection = new FailureTransactionConnection();
  const runner = new PostgresTransactionRunner(
    new FailureTransactionPool(connection),
  );
  const appender = new TransactionalAuditOutboxAppender(
    new SqlAuditRepository(),
    new FailingSqlOutboxRepository(),
  );

  await assertRejects(
    () =>
      runner.run((transaction) =>
        appender.append(
          transaction,
          fixtureEvent(1),
          fixtureOutboxEvent("audit-event-1"),
        )
      ),
    Error,
    "outbox write failed",
  );
  assertEquals(connection.commands, [
    "BEGIN",
    "AUDIT INSERT",
    "OUTBOX INSERT",
    "ROLLBACK",
    "RELEASE",
  ]);
});

class RecordingAuditRepository implements Pick<AuditEventRepository, "append"> {
  readonly events: string[] = [];
  readonly transactions: TransactionHandle[] = [];

  append(
    transaction: TransactionHandle,
    event: Parameters<AuditEventRepository["append"]>[1],
  ): Promise<ReturnType<typeof fixtureEvent>> {
    this.transactions.push(transaction);
    this.events.push(event.eventId);
    return Promise.resolve(fixtureEvent(1));
  }
}

class RecordingOutboxRepository {
  readonly events: string[] = [];
  readonly transactions: TransactionHandle[] = [];

  append(transaction: TransactionHandle, event: OutboxEvent): Promise<void> {
    this.transactions.push(transaction);
    this.events.push(event.eventId);
    return Promise.resolve();
  }
}

class RecordingTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};

  query<TRow>(): Promise<{ rows: TRow[]; rowCount: number }> {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
}

class SqlAuditRepository implements Pick<AuditEventRepository, "append"> {
  async append(
    transaction: TransactionHandle,
    event: Parameters<AuditEventRepository["append"]>[1],
  ): Promise<ReturnType<typeof fixtureEvent>> {
    await transaction.query("AUDIT INSERT");
    return fixtureEvent(1, { eventType: event.eventType });
  }
}

class FailingSqlOutboxRepository {
  async append(
    transaction: TransactionHandle,
    _event: OutboxEvent,
  ): Promise<void> {
    await transaction.query("OUTBOX INSERT");
    throw new Error("outbox write failed");
  }
}

class FailureTransactionConnection {
  readonly commands: string[] = [];

  query(
    text: string,
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    this.commands.push(text);
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  release(): void {
    this.commands.push("RELEASE");
  }
}

class FailureTransactionPool {
  constructor(private readonly connection: FailureTransactionConnection) {}

  connect(): Promise<FailureTransactionConnection> {
    return Promise.resolve(this.connection);
  }
}

function fixtureOutboxEvent(auditEventId: string): OutboxEvent {
  return {
    eventId: `outbox-${auditEventId}`,
    tenantId: "tenant_audit" as OutboxEvent["tenantId"],
    aggregateType: "fixture",
    aggregateId: "aggregate-audit",
    aggregateVersion: 1 as OutboxEvent["aggregateVersion"],
    eventType: "fixture.changed",
    schemaVersion: 1,
    payload: { auditEventId },
    correlationId: "cor_audit" as OutboxEvent["correlationId"],
    occurredAt: new Date("2026-08-01T12:00:00.000Z"),
    availableAt: new Date("2026-08-01T12:00:00.000Z"),
  };
}
