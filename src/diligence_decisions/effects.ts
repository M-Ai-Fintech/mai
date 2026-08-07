import type {
  AuditEventDraft,
  AuditEventId,
  AuditPayloadValue,
  AuditProvenance,
  AuthoritySnapshot as AuditAuthoritySnapshot,
  EvidenceSnapshot,
} from "../audit_activity/v1.ts";
import { auditEventDigest } from "../audit_activity/v1.ts";
import type { AuditEventRepository } from "../audit_activity/v1.ts";
import type { OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type { RequestContext } from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { EvidenceBasisReference, ExactEvidenceBasis } from "./basis.ts";
import type { DecisionAuthoritySnapshot, DiligenceScope } from "./model.ts";

export interface DecisionEffectInput {
  readonly context: RequestContext;
  readonly scope: DiligenceScope;
  readonly actor: ActorReference;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: import("../platform/api/v1.ts").AggregateVersion;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, AuditPayloadValue>>;
  readonly basis: ExactEvidenceBasis;
  readonly authority?: DecisionAuthoritySnapshot;
  readonly occurredAt: Date;
}

export interface DiligenceDecisionEffects {
  append(
    transaction: TransactionHandle,
    input: DecisionEffectInput,
  ): Promise<void>;
}

export class PostgresDiligenceDecisionEffects
  implements DiligenceDecisionEffects {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly audit: AuditEventRepository,
  ) {}

  async append(
    transaction: TransactionHandle,
    input: DecisionEffectInput,
  ): Promise<void> {
    const authority = input.authority ?? syntheticAuthority(input);
    const event = createOutboxEvent(input);
    const auditEvent = await createAuditEvent(input, authority);
    await this.outbox.append(transaction, event);
    await this.audit.append(transaction, auditEvent);
  }
}

function createOutboxEvent(input: DecisionEffectInput): OutboxEvent {
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
  input: DecisionEffectInput,
  authority: DecisionAuthoritySnapshot,
): Promise<AuditEventDraft> {
  const event: AuditEventDraft = {
    eventId: eventIdentity(input) as AuditEventId,
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
    authoritySnapshot: auditAuthority(authority, input.actor),
    evidenceSnapshot: evidenceSnapshot(input.basis, input.occurredAt),
    provenance: provenance(input),
    payload: input.payload,
    classifications: classifications(input.payload),
    contentDigest: "0".repeat(64),
    occurredAt: input.occurredAt,
  };
  return { ...event, contentDigest: await auditEventDigest(event) };
}

function syntheticAuthority(
  input: DecisionEffectInput,
): DecisionAuthoritySnapshot {
  return {
    snapshotId: `local-${input.actor.id}`,
    actorId: input.actor.id,
    policyVersion: "diligence-decisions-v1",
    scope: input.scope,
    capturedAt: input.occurredAt,
  };
}

function auditAuthority(
  authority: DecisionAuthoritySnapshot,
  actor: ActorReference,
): AuditAuthoritySnapshot {
  return {
    snapshotId: authority.snapshotId,
    actorId: authority.actorId,
    actorKind: authority.snapshotId.startsWith("local-")
      ? auditActorKind(actor)
      : "human",
    policyVersion: authority.policyVersion,
    scope: authority.scope,
    capturedAt: authority.capturedAt,
  };
}

function evidenceSnapshot(
  basis: ExactEvidenceBasis,
  capturedAt: Date,
): EvidenceSnapshot {
  return {
    capturedAt,
    references: basis.references.map(evidenceReference),
  };
}

function evidenceReference(reference: EvidenceBasisReference) {
  if (reference.kind === "document_version") {
    return {
      sourceType: "document_version",
      sourceId: reference.reference.documentVersionId,
      sourceVersion: reference.reference.processingVersion,
      checksum: reference.reference.checksum.value,
    };
  }
  return {
    sourceType: reference.kind,
    sourceId: reference.kind === "evidence"
      ? reference.evidenceId
      : reference.factVersionId,
    sourceVersion: "exact",
  };
}

function provenance(input: DecisionEffectInput): AuditProvenance {
  return {
    actorId: input.actor.id,
    actorKind: auditActorKind(input.actor),
    origin: input.context.origin,
    operationReference: `${input.aggregateType}:${input.aggregateId}`,
  };
}

function classifications(
  payload: Readonly<Record<string, AuditPayloadValue>>,
): Readonly<Record<string, "internal">> {
  return Object.fromEntries(
    Object.keys(payload).map((key) => [key, "internal"]),
  );
}

function auditActorKind(actor: ActorReference): "human" | "agent" | "system" {
  if (actor.kind === "human") return "human";
  if (actor.kind === "ai") return "agent";
  return "system";
}

function eventIdentity(input: DecisionEffectInput): string {
  return `diligence-${input.aggregateType}-${input.aggregateId}-${input.eventType}-${input.aggregateVersion}`;
}
