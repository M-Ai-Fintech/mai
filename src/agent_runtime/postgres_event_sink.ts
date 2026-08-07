import {
  auditEventDigest,
  type AuditEventDraft,
  type AuditPayload,
  normalizeAuditPayload,
} from "../audit_activity/model.ts";
import { PostgresAuditEventRepository } from "../audit_activity/repository.ts";
import { TransactionalAuditOutboxAppender } from "../audit_activity/transaction.ts";
import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type { AuditEventId } from "../audit_activity/model.ts";
import type { RuntimeEvent, RuntimeEventSink } from "./repository.ts";

export class PostgresRuntimeAuditOutboxSink implements RuntimeEventSink {
  private readonly appender = new TransactionalAuditOutboxAppender(
    new PostgresAuditEventRepository(),
    new OutboxRepository(),
  );

  async append(
    transaction: TransactionHandle,
    event: RuntimeEvent,
  ): Promise<void> {
    const auditEvent = await auditDraft(event);
    await this.appender.append(
      transaction,
      auditEvent,
      outboxEvent(event, auditEvent.payload),
    );
  }
}

async function auditDraft(event: RuntimeEvent): Promise<AuditEventDraft> {
  const actorKind = auditActorKind(event.actor.kind);
  const payload = normalizeAuditPayload(event.payload, event.eventId);
  const draft: AuditEventDraft = {
    eventId: event.eventId as AuditEventId,
    tenantId: event.scope.tenantId,
    workspaceId: event.scope.workspaceId,
    dealId: event.scope.dealId,
    actorId: event.actor.actorId,
    actorKind,
    origin: "internal",
    correlationId: event.correlationId,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: 1,
    authoritySnapshot: {
      snapshotId: `authority-${event.eventId}`,
      actorId: event.actor.actorId,
      actorKind,
      policyVersion: "agent_runtime",
      scope: event.scope,
      capturedAt: event.occurredAt,
    },
    evidenceSnapshot: { capturedAt: event.occurredAt, references: [] },
    provenance: {
      actorId: event.actor.actorId,
      actorKind,
      origin: "internal",
      operationReference: event.correlationId,
    },
    payload,
    classifications: classifyPayload(payload),
    contentDigest: "0".repeat(64),
    occurredAt: event.occurredAt,
  };
  return { ...draft, contentDigest: await auditEventDigest(draft) };
}

function outboxEvent(event: RuntimeEvent, payload: AuditPayload): OutboxEvent {
  return {
    eventId: event.eventId,
    tenantId: event.scope.tenantId,
    workspaceId: event.scope.workspaceId,
    dealId: event.scope.dealId,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    aggregateVersion: event.aggregateVersion,
    eventType: event.eventType,
    schemaVersion: 1,
    payload: { ...payload, auditEventId: event.eventId },
    correlationId: event.correlationId,
    occurredAt: event.occurredAt,
    availableAt: event.occurredAt,
  };
}

function classifyPayload(
  payload: AuditPayload,
): Readonly<Record<string, "internal">> {
  return Object.fromEntries(
    Object.keys(payload).map((key) => [key, "internal"]),
  );
}

function auditActorKind(
  kind: RuntimeEvent["actor"]["kind"],
): "human" | "agent" | "system" {
  if (kind === "human") return "human";
  if (kind === "ai") return "agent";
  return "system";
}
