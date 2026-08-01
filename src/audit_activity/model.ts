import type { AggregateVersion } from "../shared/contracts/aggregate_version.ts";
import type {
  ActorId,
  CorrelationId,
  DealId,
  TenantId,
  WorkspaceId,
} from "../shared/contracts/identifiers.ts";
import type { RequestOrigin } from "../shared/contracts/request_context.ts";

declare const auditEventIdBrand: unique symbol;
declare const auditOverlayIdBrand: unique symbol;
declare const auditPositionBrand: unique symbol;

export type AuditEventId = string & {
  readonly [auditEventIdBrand]: "AuditEventId";
};
export type AuditOverlayId = string & {
  readonly [auditOverlayIdBrand]: "AuditOverlayId";
};
export type AuditPosition = number & {
  readonly [auditPositionBrand]: "AuditPosition";
};

export type AuditActorKind = "human" | "agent" | "system";
export type AuditFieldClassification = "public" | "internal" | "restricted";
export type AuditRedactionReason =
  | "legal_requirement"
  | "privacy_request"
  | "security_control"
  | "owner_instruction";

export interface AuditScope {
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly dealId?: DealId;
}

export interface AuthoritySnapshot {
  readonly snapshotId: string;
  readonly actorId: ActorId;
  readonly actorKind: AuditActorKind;
  readonly policyVersion: string;
  readonly scope: AuditScope;
  readonly capturedAt: Date;
}

export interface EvidenceReference {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly checksum?: string;
}

export interface EvidenceSnapshot {
  readonly capturedAt: Date;
  readonly references: readonly EvidenceReference[];
}

export interface AuditProvenance {
  readonly actorId: ActorId;
  readonly actorKind: AuditActorKind;
  readonly origin: RequestOrigin;
  readonly operationReference?: string;
  readonly toolReference?: string;
  readonly modelReference?: string;
  readonly promptDigest?: string;
}

export interface AuditEventDraft {
  readonly eventId: AuditEventId;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly dealId?: DealId;
  readonly actorId: ActorId;
  readonly actorKind: AuditActorKind;
  readonly origin: RequestOrigin;
  readonly correlationId: CorrelationId;
  readonly causationId?: AuditEventId;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: AggregateVersion;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly authoritySnapshot: AuthoritySnapshot;
  readonly evidenceSnapshot: EvidenceSnapshot;
  readonly provenance: AuditProvenance;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly classifications: Readonly<
    Record<string, AuditFieldClassification>
  >;
  readonly contentDigest: string;
  readonly occurredAt: Date;
}

export interface StoredAuditEvent extends AuditEventDraft {
  readonly position: AuditPosition;
}

export interface RedactionOverlayDraft {
  readonly overlayId: AuditOverlayId;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly dealId?: DealId;
  readonly targetEventId: AuditEventId;
  readonly actorId: ActorId;
  readonly authoritySnapshot: AuthoritySnapshot;
  readonly reason: AuditRedactionReason;
  readonly fields: readonly string[];
  readonly appliedAt: Date;
}

export interface StoredRedactionOverlay extends RedactionOverlayDraft {
  readonly position: AuditPosition;
}

export interface AuditReadQuery extends AuditScope {
  readonly afterPosition?: AuditPosition;
  readonly limit?: number;
}

export interface ProjectionWatermark {
  readonly eventPosition: AuditPosition | 0;
  readonly overlayPosition: AuditPosition | 0;
}

export function assertAuditEvent(event: AuditEventDraft): void {
  assertText(event.eventId, "audit event ID", 128);
  assertText(event.aggregateType, "aggregate type", 128);
  assertText(event.aggregateId, "aggregate ID", 128);
  assertText(event.eventType, "event type", 128);
  assertPositiveInteger(event.schemaVersion, "schema version", event.eventId);
  assertPositiveInteger(
    event.aggregateVersion,
    "aggregate version",
    event.eventId,
  );
  assertScope(event, `Audit event "${event.eventId}"`);
  assertActorLink(event, `Audit event "${event.eventId}"`);
  assertSnapshot(event.authoritySnapshot, event.eventId);
  assertEvidenceSnapshot(event.evidenceSnapshot, event.eventId);
  assertProvenance(event.provenance, event.eventId);
  assertClassifications(event.payload, event.classifications, event.eventId);
  assertDigest(event.contentDigest, event.eventId);
  assertDate(event.occurredAt, "occurred at", event.eventId);
}

export function assertRedactionOverlay(overlay: RedactionOverlayDraft): void {
  assertText(overlay.overlayId, "redaction overlay ID", 128);
  assertText(overlay.targetEventId, "redaction target event ID", 128);
  assertText(overlay.reason, "redaction reason", 64);
  assertScope(overlay, `Redaction overlay "${overlay.overlayId}"`);
  assertSnapshot(overlay.authoritySnapshot, overlay.overlayId);
  if (overlay.actorId !== overlay.authoritySnapshot.actorId) {
    throw new Error(
      `Redaction overlay "${overlay.overlayId}" actor "${overlay.actorId}" does not match authority actor "${overlay.authoritySnapshot.actorId}"; expected the recorded actor to own the snapshot.`,
    );
  }
  if (overlay.fields.length === 0) {
    throw new Error(
      `Redaction overlay "${overlay.overlayId}" has no fields; expected at least one payload field to overlay.`,
    );
  }
  for (const field of overlay.fields) {
    assertText(field, "redaction field", 128);
  }
  assertDate(overlay.appliedAt, "applied at", overlay.overlayId);
}

export function freezeAuditEvent(event: StoredAuditEvent): StoredAuditEvent {
  assertAuditEvent(event);
  return Object.freeze({
    ...event,
    authoritySnapshot: freezeAuthoritySnapshot(event.authoritySnapshot),
    evidenceSnapshot: freezeEvidenceSnapshot(event.evidenceSnapshot),
    provenance: Object.freeze({ ...event.provenance }),
    payload: freezeRecord(event.payload),
    classifications: Object.freeze({ ...event.classifications }),
  });
}

export function freezeRedactionOverlay(
  overlay: StoredRedactionOverlay,
): StoredRedactionOverlay {
  assertRedactionOverlay(overlay);
  return Object.freeze({
    ...overlay,
    authoritySnapshot: freezeAuthoritySnapshot(overlay.authoritySnapshot),
    fields: Object.freeze([...overlay.fields]),
  });
}

export async function auditEventDigest(
  event: AuditEventDraft,
): Promise<string> {
  assertAuditEventExceptDigest(event);
  const canonical = stableSerialize({ ...event, contentDigest: undefined });
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

function assertAuditEventExceptDigest(event: AuditEventDraft): void {
  assertText(event.eventId, "audit event ID", 128);
  assertScope(event, `Audit event "${event.eventId}"`);
  assertActorLink(event, `Audit event "${event.eventId}"`);
  assertSnapshot(event.authoritySnapshot, event.eventId);
  assertEvidenceSnapshot(event.evidenceSnapshot, event.eventId);
  assertProvenance(event.provenance, event.eventId);
  assertClassifications(event.payload, event.classifications, event.eventId);
}

function assertActorLink(
  event: Pick<AuditEventDraft, "actorId" | "authoritySnapshot" | "provenance">,
  subject: string,
): void {
  if (event.actorId !== event.authoritySnapshot.actorId) {
    throw new Error(
      `${subject} actor "${event.actorId}" does not match authority actor "${event.authoritySnapshot.actorId}"; expected one immutable actor link.`,
    );
  }
  if (event.actorId !== event.provenance.actorId) {
    throw new Error(
      `${subject} actor "${event.actorId}" does not match provenance actor "${event.provenance.actorId}"; expected one immutable actor link.`,
    );
  }
}

function assertSnapshot(snapshot: AuthoritySnapshot, subject: string): void {
  assertText(snapshot.snapshotId, "authority snapshot ID", 128);
  assertText(snapshot.policyVersion, "authority policy version", 128);
  assertScope(snapshot.scope, `Authority snapshot "${snapshot.snapshotId}"`);
  assertDate(snapshot.capturedAt, "captured at", subject);
}

function assertEvidenceSnapshot(
  snapshot: EvidenceSnapshot,
  subject: string,
): void {
  assertDate(snapshot.capturedAt, "evidence captured at", subject);
  for (const reference of snapshot.references) {
    assertText(reference.sourceType, "evidence source type", 128);
    assertText(reference.sourceId, "evidence source ID", 128);
    assertText(reference.sourceVersion, "evidence source version", 128);
    if (reference.checksum !== undefined) {
      assertHexDigest(reference.checksum, "evidence checksum", subject);
    }
  }
}

function assertProvenance(provenance: AuditProvenance, subject: string): void {
  assertOptionalText(provenance.operationReference, "operation reference", 128);
  assertOptionalText(provenance.toolReference, "tool reference", 128);
  assertOptionalText(provenance.modelReference, "model reference", 128);
  if (provenance.promptDigest !== undefined) {
    assertHexDigest(provenance.promptDigest, "prompt digest", subject);
  }
}

function assertClassifications(
  payload: Readonly<Record<string, unknown>>,
  classifications: Readonly<Record<string, AuditFieldClassification>>,
  eventId: string,
): void {
  for (const field of Object.keys(payload)) {
    const classification = classifications[field];
    if (
      classification === "public" || classification === "internal" ||
      classification === "restricted"
    ) continue;
    throw new Error(
      `Audit event "${eventId}" payload field "${field}" has no classification; expected every field to be access-filterable.`,
    );
  }
  for (const field of Object.keys(classifications)) {
    if (Object.hasOwn(payload, field)) continue;
    throw new Error(
      `Audit event "${eventId}" classification field "${field}" has no payload value; expected classifications to describe payload fields only.`,
    );
  }
}

function assertScope(
  value: Pick<AuditScope, "tenantId" | "workspaceId" | "dealId">,
  subject: string,
): void {
  assertText(value.tenantId, "tenant ID", 64);
  if (value.dealId !== undefined && value.workspaceId === undefined) {
    throw new Error(
      `${subject} deal "${value.dealId}" has no workspace; expected deal scope to include workspace scope.`,
    );
  }
}

function assertDigest(value: string, eventId: string): void {
  assertHexDigest(value, "audit content digest", eventId);
}

function assertHexDigest(value: string, label: string, subject: string): void {
  if (/^[0-9a-f]{64}$/.test(value)) return;
  throw new Error(
    `${label} "${value}" for "${subject}" is invalid; expected a lowercase SHA-256 hex digest.`,
  );
}

function assertPositiveInteger(
  value: number,
  label: string,
  subject: string,
): void {
  if (Number.isSafeInteger(value) && value > 0) return;
  throw new Error(
    `${label} "${value}" for "${subject}" is invalid; expected a positive safe integer.`,
  );
}

function assertDate(value: Date, label: string, subject: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${
      String(value)
    }" for "${subject}" is invalid; expected a valid Date.`,
  );
}

function assertText(
  value: string,
  label: string,
  maximum: number,
): void {
  if (value.trim() && value.length <= maximum) return;
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} non-whitespace characters.`,
  );
}

function assertOptionalText(
  value: string | undefined,
  label: string,
  maximum: number,
): void {
  if (value === undefined) return;
  assertText(value, label, maximum);
}

function freezeAuthoritySnapshot(
  snapshot: AuthoritySnapshot,
): AuthoritySnapshot {
  return Object.freeze({
    ...snapshot,
    scope: Object.freeze({ ...snapshot.scope }),
  });
}

function freezeEvidenceSnapshot(snapshot: EvidenceSnapshot): EvidenceSnapshot {
  return Object.freeze({
    ...snapshot,
    references: Object.freeze(
      snapshot.references.map((reference) => Object.freeze({ ...reference })),
    ),
  });
}

function freezeRecord(
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, freezeValue(item)]),
    ),
  );
}

function freezeValue(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeValue));
  if (isRecord(value)) return freezeRecord(value);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableSerialize(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (isRecord(value)) {
    const entries = Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableSerialize(value[key])}`
    );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
