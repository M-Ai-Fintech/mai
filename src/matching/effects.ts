import type {
  AuditEventDraft,
  AuditPayloadValue,
} from "../audit_activity/v1.ts";
import { auditEventDigest } from "../audit_activity/v1.ts";
import type { AuditEventRepository } from "../audit_activity/v1.ts";
import type { OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type { MatchingScope } from "./model.ts";

export interface MatchingEffectInput {
  readonly context: RequestContext;
  readonly scope: MatchingScope;
  readonly actor: ActorReference;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, AuditPayloadValue>>;
  readonly occurredAt: Date;
}

export interface MatchingEffects {
  append(
    transaction: TransactionHandle,
    input: MatchingEffectInput,
  ): Promise<void>;
}

export interface RecordedMatchingEffect extends MatchingEffectInput {}

export class RecordingMatchingEffects implements MatchingEffects {
  readonly events: RecordedMatchingEffect[] = [];

  append(
    _transaction: TransactionHandle,
    input: MatchingEffectInput,
  ): Promise<void> {
    this.events.push(input);
    return Promise.resolve();
  }
}

export class PostgresMatchingEffects implements MatchingEffects {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly audit: AuditEventRepository,
  ) {}

  async append(
    transaction: TransactionHandle,
    input: MatchingEffectInput,
  ): Promise<void> {
    const authority = syntheticAuthority(input);
    const event = createOutboxEvent(input);
    const auditEvent = await createAuditEvent(input, authority);
    await this.outbox.append(transaction, event);
    await this.audit.append(transaction, auditEvent);
  }
}

function createOutboxEvent(input: MatchingEffectInput): OutboxEvent {
  const eventId = eventIdentity(input);
  return {
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
  };
}

async function createAuditEvent(
  input: MatchingEffectInput,
  authority: MatchingAuthority,
): Promise<AuditEventDraft> {
  const event: AuditEventDraft = {
    eventId: eventIdentity(input) as AuditEventDraft["eventId"],
    tenantId: input.scope.tenantId,
    workspaceId: input.scope.workspaceId,
    dealId: input.scope.dealId,
    actorId: input.actor.id,
    actorKind: auditActorKind(input.actor),
    origin: input.context.origin,
    correlationId: input.context.correlationId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion,
    eventType: input.eventType,
    schemaVersion: 1,
    authoritySnapshot: authority,
    evidenceSnapshot: { capturedAt: input.occurredAt, references: [] },
    provenance: {
      actorId: input.actor.id,
      actorKind: auditActorKind(input.actor),
      origin: input.context.origin,
      operationReference: `${input.aggregateType}:${input.aggregateId}`,
    },
    payload: input.payload,
    classifications: Object.fromEntries(
      Object.keys(input.payload).map((key) => [key, "internal"]),
    ),
    contentDigest: "0".repeat(64),
    occurredAt: input.occurredAt,
  };
  return { ...event, contentDigest: await auditEventDigest(event) };
}

interface MatchingAuthority {
  readonly snapshotId: string;
  readonly actorId: import("../shared/contracts/identifiers.ts").ActorId;
  readonly actorKind: "human" | "agent" | "system";
  readonly policyVersion: string;
  readonly scope: MatchingScope;
  readonly capturedAt: Date;
}

function syntheticAuthority(input: MatchingEffectInput): MatchingAuthority {
  return {
    snapshotId: `matching-local-${input.actor.id}`,
    actorId: input.actor.id,
    actorKind: auditActorKind(input.actor),
    policyVersion: "matching-v1",
    scope: input.scope,
    capturedAt: input.occurredAt,
  };
}

function auditActorKind(actor: ActorReference): "human" | "agent" | "system" {
  if (actor.kind === "human") return "human";
  if (actor.kind === "ai") return "agent";
  return "system";
}

function eventIdentity(input: MatchingEffectInput): string {
  return `matching-${input.aggregateType}-${input.aggregateId}-${input.eventType}-${input.aggregateVersion}`;
}
