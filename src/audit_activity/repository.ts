import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import {
  assertAuditEvent,
  assertRedactionOverlay,
  type AuditEventDraft,
  type AuditEventId,
  type AuditPayload,
  type AuditPosition,
  type AuditReadQuery,
  freezeAuditEvent,
  freezeRedactionOverlay,
  normalizeAuditPayload,
  type RedactionOverlayDraft,
  type StoredAuditEvent,
  type StoredRedactionOverlay,
} from "./model.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  AuditActorKind,
  AuditFieldClassification,
  AuditProvenance,
} from "./model.ts";
import type { AuthoritySnapshot, EvidenceSnapshot } from "./model.ts";
import type { RequestOrigin } from "../shared/contracts/request_context.ts";

export interface AuditEventRepository {
  append(
    transaction: TransactionHandle,
    event: AuditEventDraft,
  ): Promise<StoredAuditEvent>;
  list(
    transaction: TransactionHandle,
    query: AuditReadQuery,
  ): Promise<StoredAuditEvent[]>;
  appendRedaction(
    transaction: TransactionHandle,
    overlay: RedactionOverlayDraft,
  ): Promise<StoredRedactionOverlay>;
  listRedactions(
    transaction: TransactionHandle,
    tenantId: TenantId,
    eventIds: readonly AuditEventId[],
  ): Promise<StoredRedactionOverlay[]>;
}

export class PostgresAuditEventRepository implements AuditEventRepository {
  async append(
    transaction: TransactionHandle,
    event: AuditEventDraft,
  ): Promise<StoredAuditEvent> {
    assertAuditEvent(event);
    const result = await transaction.query<PositionRow>(
      `INSERT INTO audit_activity.audit_events (
         event_id, tenant_id, workspace_id, deal_id, actor_id, actor_kind,
         origin, correlation_id, causation_id, aggregate_type, aggregate_id,
         aggregate_version, event_type, schema_version, authority_snapshot,
         evidence_snapshot, provenance, payload, classifications,
         content_digest, occurred_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19, $20, $21
       ) RETURNING position::text AS "position"`,
      auditEventValues(event),
    );
    return freezeAuditEvent({
      ...event,
      position: parsePosition(result.rows[0]?.position, event.eventId),
    });
  }

  async list(
    transaction: TransactionHandle,
    query: AuditReadQuery,
  ): Promise<StoredAuditEvent[]> {
    const statement = auditReadStatement(query);
    const result = await transaction.query<AuditEventRow>(
      statement.sql,
      statement.parameters,
    );
    return result.rows.map(toStoredAuditEvent);
  }

  async appendRedaction(
    transaction: TransactionHandle,
    overlay: RedactionOverlayDraft,
  ): Promise<StoredRedactionOverlay> {
    assertRedactionOverlay(overlay);
    const result = await transaction.query<PositionRow>(
      `INSERT INTO audit_activity.redaction_overlays (
         overlay_id, tenant_id, workspace_id, deal_id, target_event_id, actor_id,
         authority_snapshot, reason, fields, applied_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING position::text AS "position"`,
      [
        overlay.overlayId,
        overlay.tenantId,
        overlay.workspaceId ?? null,
        overlay.dealId ?? null,
        overlay.targetEventId,
        overlay.actorId,
        JSON.stringify(overlay.authoritySnapshot),
        overlay.reason,
        JSON.stringify(overlay.fields),
        overlay.appliedAt,
      ],
    );
    return freezeRedactionOverlay({
      ...overlay,
      position: parsePosition(result.rows[0]?.position, overlay.overlayId),
    });
  }

  async listRedactions(
    transaction: TransactionHandle,
    tenantId: TenantId,
    eventIds: readonly AuditEventId[],
  ): Promise<StoredRedactionOverlay[]> {
    if (eventIds.length === 0) return [];
    const result = await transaction.query<RedactionRow>(
      `SELECT position::text AS "position", overlay_id AS "overlayId",
         tenant_id AS "tenantId", workspace_id AS "workspaceId",
         deal_id AS "dealId", target_event_id AS "targetEventId",
         actor_id AS "actorId", authority_snapshot AS "authoritySnapshot",
         reason, fields, applied_at AS "appliedAt"
       FROM audit_activity.redaction_overlays
       WHERE tenant_id = $1 AND target_event_id = ANY($2::text[])
       ORDER BY position ASC`,
      [tenantId, [...eventIds]],
    );
    return result.rows.map(toStoredRedactionOverlay);
  }
}

interface PositionRow {
  readonly position?: string | number;
}

interface AuditReadStatement {
  readonly sql: string;
  readonly parameters: readonly unknown[];
}

interface AuditEventRow {
  readonly position: string | number;
  readonly eventId: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly dealId: string | null;
  readonly actorId: string;
  readonly actorKind: AuditActorKind;
  readonly origin: RequestOrigin;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: string | number;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly authoritySnapshot: unknown;
  readonly evidenceSnapshot: unknown;
  readonly provenance: unknown;
  readonly payload: unknown;
  readonly classifications: unknown;
  readonly contentDigest: string;
  readonly occurredAt: Date | string;
}

interface RedactionRow {
  readonly position: string | number;
  readonly overlayId: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly dealId: string | null;
  readonly targetEventId: string;
  readonly actorId: string;
  readonly authoritySnapshot: unknown;
  readonly reason: RedactionOverlayDraft["reason"];
  readonly fields: unknown;
  readonly appliedAt: Date | string;
}

function auditEventValues(event: AuditEventDraft): readonly unknown[] {
  return [
    event.eventId,
    event.tenantId,
    event.workspaceId ?? null,
    event.dealId ?? null,
    event.actorId,
    event.actorKind,
    event.origin,
    event.correlationId,
    event.causationId ?? null,
    event.aggregateType,
    event.aggregateId,
    event.aggregateVersion,
    event.eventType,
    event.schemaVersion,
    JSON.stringify(event.authoritySnapshot),
    JSON.stringify(event.evidenceSnapshot),
    JSON.stringify(event.provenance),
    JSON.stringify(normalizeAuditPayload(event.payload, event.eventId)),
    JSON.stringify(event.classifications),
    event.contentDigest,
    event.occurredAt,
  ];
}

function auditReadStatement(query: AuditReadQuery): AuditReadStatement {
  const parameters: unknown[] = [query.tenantId];
  const conditions = ["tenant_id = $1"];
  appendScopeCondition(
    conditions,
    parameters,
    "workspace_id",
    query.workspaceId,
  );
  appendScopeCondition(conditions, parameters, "deal_id", query.dealId);
  const afterPosition = query.afterPosition ?? 0;
  parameters.push(afterPosition);
  const afterParameter = parameters.length;
  const limit = query.limit ?? 100;
  assertReadLimit(limit);
  parameters.push(limit);
  return {
    sql: `SELECT ${auditEventColumns()}
      FROM audit_activity.audit_events
      WHERE ${conditions.join(" AND ")} AND position > $${afterParameter}
      ORDER BY position ASC LIMIT $${parameters.length}`,
    parameters,
  };
}

function appendScopeCondition(
  conditions: string[],
  parameters: unknown[],
  column: string,
  value: string | undefined,
): void {
  if (value === undefined) return;
  parameters.push(value);
  conditions.push(`${column} = $${parameters.length}`);
}

function auditEventColumns(): string {
  return `position::text AS "position", event_id AS "eventId",
    tenant_id AS "tenantId", workspace_id AS "workspaceId",
    deal_id AS "dealId", actor_id AS "actorId", actor_kind AS "actorKind",
    origin, correlation_id AS "correlationId", causation_id AS "causationId",
    aggregate_type AS "aggregateType", aggregate_id AS "aggregateId",
    aggregate_version::text AS "aggregateVersion", event_type AS "eventType",
    schema_version AS "schemaVersion", authority_snapshot AS "authoritySnapshot",
    evidence_snapshot AS "evidenceSnapshot", provenance, payload,
    classifications, content_digest AS "contentDigest", occurred_at AS "occurredAt"`;
}

function toStoredAuditEvent(row: AuditEventRow): StoredAuditEvent {
  const event: AuditEventDraft = {
    eventId: row.eventId as AuditEventId,
    tenantId: row.tenantId as TenantId,
    workspaceId: row.workspaceId as WorkspaceId | undefined,
    dealId: row.dealId as DealId | undefined,
    actorId: row.actorId as ActorId,
    actorKind: row.actorKind,
    origin: row.origin,
    correlationId: row.correlationId as CorrelationId,
    causationId: row.causationId as AuditEventId | undefined,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    aggregateVersion: parseNumber(
      row.aggregateVersion,
      row.eventId,
    ) as AggregateVersion,
    eventType: row.eventType,
    schemaVersion: row.schemaVersion,
    authoritySnapshot: parseObject(
      row.authoritySnapshot,
    ) as unknown as AuthoritySnapshot,
    evidenceSnapshot: parseObject(
      row.evidenceSnapshot,
    ) as unknown as EvidenceSnapshot,
    provenance: parseObject(row.provenance) as unknown as AuditProvenance,
    payload: parseObject(row.payload) as unknown as AuditPayload,
    classifications: parseObject(row.classifications) as unknown as Readonly<
      Record<string, AuditFieldClassification>
    >,
    contentDigest: row.contentDigest,
    occurredAt: parseDate(row.occurredAt, row.eventId),
  };
  return freezeAuditEvent({
    ...event,
    position: parsePosition(row.position, row.eventId),
  });
}

function toStoredRedactionOverlay(row: RedactionRow): StoredRedactionOverlay {
  const overlay: RedactionOverlayDraft = {
    overlayId: row.overlayId as RedactionOverlayDraft["overlayId"],
    tenantId: row.tenantId as TenantId,
    workspaceId: row.workspaceId as WorkspaceId | undefined,
    dealId: row.dealId as DealId | undefined,
    targetEventId: row.targetEventId as AuditEventId,
    actorId: row.actorId as ActorId,
    authoritySnapshot: parseObject(
      row.authoritySnapshot,
    ) as unknown as AuthoritySnapshot,
    reason: row.reason,
    fields: parseStringArray(row.fields),
    appliedAt: parseDate(row.appliedAt, row.overlayId),
  };
  return freezeRedactionOverlay({
    ...overlay,
    position: parsePosition(row.position, row.overlayId),
  });
}

function parsePosition(
  value: string | number | undefined,
  subject: string,
): AuditPosition {
  return parsePositiveNumber(value, "position", subject) as AuditPosition;
}

function parseNumber(value: string | number, subject: string): number {
  return parsePositiveNumber(value, "number", subject);
}

function parsePositiveNumber(
  value: string | number | undefined,
  label: string,
  subject: string,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  throw new Error(
    `Audit ${label} "${
      String(value)
    }" for "${subject}" is invalid; expected a positive safe integer.`,
  );
}

function parseDate(value: Date | string, subject: string): Date {
  const parsed = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  throw new Error(
    `Audit timestamp "${
      String(value)
    }" for "${subject}" is invalid; expected an ISO timestamp.`,
  );
}

function parseObject(value: unknown): Readonly<Record<string, unknown>> {
  const parsed = typeof value === "string"
    ? JSON.parse(value) as unknown
    : value;
  if (isRecord(parsed)) return parsed;
  throw new Error(
    `Audit JSON value "${String(value)}" is invalid; expected an object.`,
  );
}

function parseStringArray(value: unknown): readonly string[] {
  const parsed = typeof value === "string"
    ? JSON.parse(value) as unknown
    : value;
  if (
    !Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")
  ) {
    throw new Error(
      `Audit redaction fields "${
        String(value)
      }" are invalid; expected a string array.`,
    );
  }
  return parsed;
}

function assertReadLimit(limit: number): void {
  if (Number.isSafeInteger(limit) && limit > 0 && limit <= 500) return;
  throw new Error(
    `Audit read limit "${limit}" is invalid; expected a positive value up to 500.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
