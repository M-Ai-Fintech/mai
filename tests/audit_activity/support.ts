import type { DurableJob } from "../../src/platform/jobs/model.ts";
import type { JobRepository } from "../../src/platform/jobs/repository.ts";
import type { TransactionHandle } from "../../src/platform/persistence/transaction.ts";
import {
  type AuditAuthorizationDecision,
  type AuditAuthorizationPort,
  auditEventDigest,
  type AuditEventDraft,
  type AuditEventId,
  type AuditPosition,
  type AuditReadQuery,
  type AuditScope,
  type AuthoritySnapshot,
  freezeAuditEvent,
  freezeRedactionOverlay,
  type RedactionOverlayDraft,
  type StoredAuditEvent,
  type StoredRedactionOverlay,
} from "../../src/audit_activity/v1.ts";
import type { AuditEventRepository } from "../../src/audit_activity/repository.ts";
import type { AuditOutboxAppender } from "../../src/audit_activity/transaction.ts";
import type { OutboxEvent } from "../../src/platform/events/v1.ts";
import {
  type AggregateVersion,
  parseAggregateVersion,
} from "../../src/shared/contracts/aggregate_version.ts";
import {
  parseRequestContext,
  type RequestContext,
} from "../../src/shared/contracts/request_context.ts";

export const FIXTURE_NOW = new Date("2026-08-01T12:00:00.000Z");

export function fixtureScope(overrides: Partial<AuditScope> = {}): AuditScope {
  return {
    tenantId: "tenant_audit" as AuditScope["tenantId"],
    workspaceId: "workspace_audit" as AuditScope["workspaceId"],
    dealId: "deal_audit" as AuditScope["dealId"],
    ...overrides,
  };
}

export function fixtureContext(scope = fixtureScope()): RequestContext {
  const parsed = parseRequestContext({
    actorId: "actor_audit",
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_audit",
    origin: "http",
  });
  if (parsed.ok) return parsed.value;
  throw new Error(`Fixture context is invalid: ${parsed.issue.code}`);
}

export function fixtureAuthority(
  scope = fixtureScope(),
  actorId = fixtureContext(scope).actorId,
): AuthoritySnapshot {
  return {
    snapshotId: "authority_audit",
    actorId,
    actorKind: "human",
    policyVersion: "policy-audit-v1",
    scope,
    capturedAt: FIXTURE_NOW,
  };
}

export function fixtureEvent(
  position: number,
  overrides: Partial<
    Pick<
      AuditEventDraft,
      "eventType" | "occurredAt" | "payload" | "classifications"
    >
  > = {},
  scope = fixtureScope(),
): StoredAuditEvent {
  const version = aggregateVersion();
  const context = fixtureContext(scope);
  const draft: AuditEventDraft = {
    eventId: `audit-event-${position}` as AuditEventId,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    actorId: context.actorId,
    actorKind: "human",
    origin: context.origin,
    correlationId: context.correlationId,
    aggregateType: "fixture",
    aggregateId: "aggregate-audit",
    aggregateVersion: version,
    eventType: "fixture.changed",
    schemaVersion: 1,
    authoritySnapshot: fixtureAuthority(scope, context.actorId),
    evidenceSnapshot: {
      capturedAt: FIXTURE_NOW,
      references: [{
        sourceType: "fixture",
        sourceId: "source-audit",
        sourceVersion: "v1",
      }],
    },
    provenance: {
      actorId: context.actorId,
      actorKind: "human",
      origin: context.origin,
      operationReference: "operation-audit",
    },
    payload: {
      visible: `visible-${position}`,
      restricted: `restricted-${position}`,
    },
    classifications: { visible: "public", restricted: "restricted" },
    contentDigest: "a".repeat(64),
    occurredAt: new Date(FIXTURE_NOW.getTime() + position * 1_000),
    ...overrides,
  };
  return freezeAuditEvent({
    ...draft,
    position: position as AuditPosition,
  });
}

export function fixtureOverlay(
  position: number,
  targetEventId: AuditEventId,
  fields: readonly string[],
  scope = fixtureScope(),
): StoredRedactionOverlay {
  const context = fixtureContext(scope);
  const overlay: RedactionOverlayDraft = {
    overlayId: `overlay-${position}` as RedactionOverlayDraft["overlayId"],
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    targetEventId,
    actorId: context.actorId,
    authoritySnapshot: fixtureAuthority(scope, context.actorId),
    reason: "privacy_request",
    fields,
    appliedAt: new Date(FIXTURE_NOW.getTime() + position * 1_000),
  };
  return freezeRedactionOverlay({
    ...overlay,
    position: position as AuditPosition,
  });
}

export class RecordingAuditRepository implements AuditEventRepository {
  readonly events: StoredAuditEvent[] = [];
  readonly overlays: StoredRedactionOverlay[] = [];
  listCalls = 0;

  append(
    _transaction: TransactionHandle,
    event: AuditEventDraft,
  ): Promise<StoredAuditEvent> {
    const stored = freezeAuditEvent({
      ...event,
      position: (this.events.length + 1) as AuditPosition,
    });
    this.events.push(stored);
    return Promise.resolve(stored);
  }

  list(
    _transaction: TransactionHandle,
    query: AuditReadQuery,
  ): Promise<StoredAuditEvent[]> {
    this.listCalls++;
    const after = query.afterPosition ?? 0;
    const events = this.events.filter((event) =>
      event.tenantId === query.tenantId &&
      (query.workspaceId === undefined ||
        event.workspaceId === query.workspaceId) &&
      (query.dealId === undefined || event.dealId === query.dealId) &&
      event.position > after
    );
    return Promise.resolve(events.slice(0, query.limit ?? 100));
  }

  appendRedaction(
    _transaction: TransactionHandle,
    overlay: RedactionOverlayDraft,
  ): Promise<StoredRedactionOverlay> {
    const stored = freezeRedactionOverlay({
      ...overlay,
      position: (this.overlays.length + 1) as AuditPosition,
    });
    this.overlays.push(stored);
    return Promise.resolve(stored);
  }

  listRedactions(
    _transaction: TransactionHandle,
    tenantId: AuditScope["tenantId"],
    eventIds: readonly AuditEventId[],
  ): Promise<StoredRedactionOverlay[]> {
    const ids = new Set(eventIds);
    return Promise.resolve(
      this.overlays.filter((overlay) =>
        overlay.tenantId === tenantId && ids.has(overlay.targetEventId)
      ),
    );
  }
}

export class AllowAuditAuthorization implements AuditAuthorizationPort {
  readonly requests: Parameters<AuditAuthorizationPort["authorize"]>[0][] = [];

  constructor(
    private readonly authority: AuthoritySnapshot = fixtureAuthority(),
    private readonly classifications:
      AuditAuthorizationDecision["allowedClassifications"] = [
        "public",
      ],
  ) {}

  authorize(
    request: Parameters<AuditAuthorizationPort["authorize"]>[0],
  ): Promise<AuditAuthorizationDecision> {
    this.requests.push(request);
    return Promise.resolve({
      allowed: true,
      reasonCode: "ALLOWED",
      allowedClassifications: this.classifications,
      authoritySnapshot: this.authority,
    });
  }
}

export class DenyAuditAuthorization implements AuditAuthorizationPort {
  readonly requests: Parameters<AuditAuthorizationPort["authorize"]>[0][] = [];

  authorize(
    request: Parameters<AuditAuthorizationPort["authorize"]>[0],
  ): Promise<AuditAuthorizationDecision> {
    this.requests.push(request);
    return Promise.resolve({
      allowed: false,
      reasonCode: "DENIED",
      allowedClassifications: [],
    });
  }
}

export class RecordingAuditOutboxAppender implements AuditOutboxAppender {
  readonly calls: Array<{ audit: AuditEventDraft; outbox: OutboxEvent }> = [];
  shouldFail = false;

  append(
    _transaction: TransactionHandle,
    auditEvent: AuditEventDraft,
    outboxEvent: OutboxEvent,
  ): Promise<StoredAuditEvent> {
    if (this.shouldFail) {
      return Promise.reject(new Error("named outbox failure"));
    }
    this.calls.push({ audit: auditEvent, outbox: outboxEvent });
    return Promise.resolve(fixtureEvent(1));
  }
}

export class RecordingJobQueue implements Pick<JobRepository, "enqueue"> {
  readonly jobs: DurableJob[] = [];

  enqueue(_transaction: TransactionHandle, job: DurableJob): Promise<void> {
    this.jobs.push(job);
    return Promise.resolve();
  }
}

export class ImmediateTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};

  query<TRow>(): Promise<{ rows: TRow[]; rowCount: number }> {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }
}

export function fixtureExportRequest() {
  return {
    jobId: "job_audit-export" as DurableJob["jobId"],
    operationId: "op_audit-export" as NonNullable<DurableJob["operationId"]>,
    auditEventId: "audit-export-event" as AuditEventId,
    outboxEventId: "outbox-audit-export",
    idempotencyKey: "idem_audit-export" as DurableJob["idempotencyKey"],
    context: fixtureContext(),
    scope: fixtureScope(),
    requestedAt: FIXTURE_NOW,
    timeoutAt: new Date("2026-08-01T13:00:00.000Z"),
    filters: { eventTypes: ["fixture.changed"] },
  };
}

export async function digestForFixture(
  event: AuditEventDraft,
): Promise<string> {
  return await auditEventDigest(event);
}

function aggregateVersion(): AggregateVersion {
  const parsed = parseAggregateVersion(1);
  if (parsed.ok) return parsed.value;
  throw new Error("Fixture aggregate version is invalid; expected version 1.");
}
