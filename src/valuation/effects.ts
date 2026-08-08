import type { RequestContext } from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import { OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { ValuationScope } from "./basis.ts";

export interface ValuationEffectInput {
  readonly context: RequestContext;
  readonly scope: ValuationScope;
  readonly actor: ActorReference;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly basisDigest?: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
}

export interface ValuationEffects {
  append(
    transaction: TransactionHandle,
    input: ValuationEffectInput,
  ): Promise<void>;
}

export class PostgresValuationEffects implements ValuationEffects {
  constructor(private readonly outbox = new OutboxRepository()) {}

  async append(
    transaction: TransactionHandle,
    input: ValuationEffectInput,
  ): Promise<void> {
    const eventId = eventIdentity(input);
    await transaction.query(
      `INSERT INTO valuation.audit_events (event_id, tenant_id, workspace_id, deal_id, actor_id, aggregate_type, aggregate_id, aggregate_version, event_type, basis_digest, payload, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        eventId,
        input.scope.tenantId,
        input.scope.workspaceId,
        input.scope.dealId,
        input.actor.id,
        input.aggregateType,
        input.aggregateId,
        input.aggregateVersion,
        input.eventType,
        input.basisDigest ?? null,
        JSON.stringify(input.payload),
        input.occurredAt,
      ],
    );
    await this.outbox.append(transaction, {
      eventId,
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      dealId: input.scope.dealId,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      aggregateVersion: input.aggregateVersion,
      eventType: input.eventType,
      schemaVersion: 1,
      payload: input.payload,
      correlationId: input.context.correlationId,
      occurredAt: input.occurredAt,
      availableAt: input.occurredAt,
    });
  }
}

function eventIdentity(input: ValuationEffectInput): string {
  return `valuation-${input.aggregateType}-${input.aggregateId}-${input.eventType}-${input.aggregateVersion}`;
}
