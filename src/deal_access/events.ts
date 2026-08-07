import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  CorrelationId,
} from "../shared/contracts/identifiers.ts";
import type { OutboxEvent } from "../platform/events/v1.ts";
import type { DealAccessScope } from "./model.ts";

export interface DealAccessEvent {
  readonly eventId: string;
  readonly scope: DealAccessScope;
  readonly actorId: ActorId;
  readonly correlationId: CorrelationId;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
  readonly availableAt: Date;
}

export function toOutboxEvent(event: DealAccessEvent): OutboxEvent {
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
    payload: event.payload,
    correlationId: event.correlationId,
    occurredAt: event.occurredAt,
    availableAt: event.availableAt,
  };
}
