import type {
  AuditEventId,
  AuditFieldClassification,
  AuditPayload,
  AuditPosition,
  AuditScope,
  ProjectionWatermark,
  StoredAuditEvent,
  StoredRedactionOverlay,
} from "./model.ts";
import { normalizeAuditPayload } from "./model.ts";

export interface ActivityProjectionEntry {
  readonly position: AuditPosition;
  readonly eventId: AuditEventId;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly actorId: string;
  readonly actorKind: StoredAuditEvent["actorKind"];
  readonly origin: StoredAuditEvent["origin"];
  readonly correlationId: string;
  readonly occurredAt: Date;
  readonly authoritySnapshotId: string;
  readonly evidenceReferences: readonly string[];
  readonly redactedFields: readonly string[];
  readonly payload: AuditPayload;
}

export interface ActivityProjection {
  readonly scope: AuditScope;
  readonly entries: readonly ActivityProjectionEntry[];
  readonly watermark: ProjectionWatermark;
  readonly projectionAsOf: Date;
}

export interface ActivityProjectionInput {
  readonly scope: AuditScope;
  readonly events: readonly StoredAuditEvent[];
  readonly overlays: readonly StoredRedactionOverlay[];
  readonly allowedClassifications: readonly AuditFieldClassification[];
}

export class ActivityProjectionBuilder {
  /**
   * Rebuilds a permission-filtered activity view from immutable inputs.
   *
   * @example builder.rebuild({ scope, events, overlays, allowedClassifications: ["public"] })
   */
  rebuild(input: ActivityProjectionInput): ActivityProjection {
    const events = sortEvents(input.events);
    const overlays = sortOverlays(input.overlays);
    const overlayFields = overlayFieldsByEvent(overlays, input.scope);
    const entries = events.map((event) =>
      projectEvent(event, overlayFields.get(event.eventId) ?? new Set(), input)
    );
    return freezeProjection({
      scope: { ...input.scope },
      entries,
      watermark: projectionWatermark(events, overlays),
      projectionAsOf: projectionAsOf(events),
    });
  }
}

function sortEvents(events: readonly StoredAuditEvent[]): StoredAuditEvent[] {
  const sorted = [...events].sort((left, right) =>
    left.position - right.position
  );
  assertUniquePositions(sorted, "audit event");
  return sorted;
}

function sortOverlays(
  overlays: readonly StoredRedactionOverlay[],
): StoredRedactionOverlay[] {
  const sorted = [...overlays].sort((left, right) =>
    left.position - right.position
  );
  assertUniquePositions(sorted, "redaction overlay");
  return sorted;
}

function assertUniquePositions(
  records: readonly { readonly position: AuditPosition }[],
  label: string,
): void {
  for (let index = 1; index < records.length; index++) {
    if (records[index - 1].position !== records[index].position) continue;
    throw new Error(
      `Audit ${label} position "${
        records[index].position
      }" is duplicated; expected one deterministic record per position.`,
    );
  }
}

function overlayFieldsByEvent(
  overlays: readonly StoredRedactionOverlay[],
  scope: AuditScope,
): Map<string, Set<string>> {
  const fields = new Map<string, Set<string>>();
  for (const overlay of overlays) {
    assertScopeMatch(overlay, scope);
    const targetFields = fields.get(overlay.targetEventId) ?? new Set<string>();
    for (const field of overlay.fields) targetFields.add(field);
    fields.set(overlay.targetEventId, targetFields);
  }
  return fields;
}

function assertScopeMatch(
  record: Pick<
    StoredRedactionOverlay,
    "tenantId" | "workspaceId" | "dealId" | "authoritySnapshot"
  >,
  scope: AuditScope,
): void {
  if (record.tenantId !== scope.tenantId) {
    throw new Error(
      `Audit overlay tenant "${record.tenantId}" does not match projection tenant "${scope.tenantId}"; expected tenant isolation.`,
    );
  }
  assertContainedScope(record, scope, "overlay");
  const snapshotScope = record.authoritySnapshot.scope;
  if (snapshotScope.tenantId !== scope.tenantId) {
    throw new Error(
      `Audit overlay authority scope for "${record.authoritySnapshot.snapshotId}" does not match tenant "${scope.tenantId}"; expected tenant-bound authority.`,
    );
  }
}

function projectEvent(
  event: StoredAuditEvent,
  redactedFields: ReadonlySet<string>,
  input: ActivityProjectionInput,
): ActivityProjectionEntry {
  assertEventScope(event, input.scope);
  const allowed = new Set(input.allowedClassifications);
  const payload = Object.fromEntries(
    Object.entries(event.payload).filter(([field]) =>
      !redactedFields.has(field) && allowed.has(event.classifications[field])
    ),
  );
  return Object.freeze({
    position: event.position,
    eventId: event.eventId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    actorId: event.actorId,
    actorKind: event.actorKind,
    origin: event.origin,
    correlationId: event.correlationId,
    occurredAt: new Date(event.occurredAt.getTime()),
    authoritySnapshotId: event.authoritySnapshot.snapshotId,
    evidenceReferences: Object.freeze(evidenceReferences(event)),
    redactedFields: Object.freeze([...redactedFields].sort()),
    payload: normalizeAuditPayload(payload, event.eventId),
  });
}

function assertEventScope(event: StoredAuditEvent, scope: AuditScope): void {
  if (event.tenantId !== scope.tenantId) {
    throw new Error(
      `Audit event "${event.eventId}" does not match the requested tenant; expected tenant isolation.`,
    );
  }
  assertContainedScope(event, scope, "event");
  if (event.authoritySnapshot.scope.tenantId !== scope.tenantId) {
    throw new Error(
      `Audit event "${event.eventId}" authority scope does not match tenant "${scope.tenantId}"; expected tenant isolation.`,
    );
  }
}

function assertContainedScope(
  record: Pick<AuditScope, "workspaceId" | "dealId">,
  scope: AuditScope,
  label: string,
): void {
  if (
    scope.workspaceId !== undefined &&
    record.workspaceId !== scope.workspaceId
  ) {
    throw new Error(
      `Audit ${label} workspace "${record.workspaceId}" does not match requested workspace "${scope.workspaceId}"; expected scope containment.`,
    );
  }
  if (scope.dealId !== undefined && record.dealId !== scope.dealId) {
    throw new Error(
      `Audit ${label} deal "${record.dealId}" does not match requested deal "${scope.dealId}"; expected scope containment.`,
    );
  }
}

function evidenceReferences(event: StoredAuditEvent): string[] {
  return event.evidenceSnapshot.references.map((reference) =>
    `${reference.sourceType}:${reference.sourceId}@${reference.sourceVersion}`
  ).sort();
}

function projectionWatermark(
  events: readonly StoredAuditEvent[],
  overlays: readonly StoredRedactionOverlay[],
): ProjectionWatermark {
  return {
    eventPosition: events.at(-1)?.position ?? 0,
    overlayPosition: overlays.at(-1)?.position ?? 0,
  };
}

function projectionAsOf(events: readonly StoredAuditEvent[]): Date {
  const latest = events.reduce(
    (current, event) => Math.max(current, event.occurredAt.getTime()),
    0,
  );
  return new Date(latest);
}

function freezeProjection(projection: ActivityProjection): ActivityProjection {
  return Object.freeze({
    ...projection,
    scope: Object.freeze({ ...projection.scope }),
    entries: Object.freeze([...projection.entries]),
    watermark: Object.freeze({ ...projection.watermark }),
  });
}
