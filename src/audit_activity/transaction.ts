import type { OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { AuditEventDraft, StoredAuditEvent } from "./model.ts";
import type { AuditEventRepository } from "./repository.ts";

export interface AuditOutboxAppender {
  append(
    transaction: TransactionHandle,
    auditEvent: AuditEventDraft,
    outboxEvent: OutboxEvent,
  ): Promise<StoredAuditEvent>;
}

export class TransactionalAuditOutboxAppender implements AuditOutboxAppender {
  constructor(
    private readonly auditEvents: Pick<AuditEventRepository, "append">,
    private readonly outbox: Pick<OutboxRepository, "append">,
  ) {}

  async append(
    transaction: TransactionHandle,
    auditEvent: AuditEventDraft,
    outboxEvent: OutboxEvent,
  ): Promise<StoredAuditEvent> {
    assertEventLink(auditEvent.eventId, outboxEvent);
    const stored = await this.auditEvents.append(transaction, auditEvent);
    await this.outbox.append(transaction, outboxEvent);
    return stored;
  }
}

function assertEventLink(
  auditEventId: string,
  outboxEvent: OutboxEvent,
): void {
  const linkedEventId = outboxEvent.payload.auditEventId;
  if (linkedEventId === auditEventId) return;
  throw new Error(
    `Audit event "${auditEventId}" is not linked by outbox event "${outboxEvent.eventId}"; expected payload.auditEventId to match.`,
  );
}
