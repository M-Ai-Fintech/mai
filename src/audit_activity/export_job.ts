import type { JobRepository } from "../platform/jobs/repository.ts";
import type { DurableJob } from "../platform/jobs/model.ts";
import {
  type AggregateVersion,
  parseAggregateVersion,
} from "../shared/contracts/aggregate_version.ts";
import type {
  IdempotencyKey,
  JobId,
  OperationId,
} from "../shared/contracts/identifiers.ts";
import type { RequestContext } from "../shared/contracts/request_context.ts";
import type { TransactionHandle } from "../platform/persistence/transaction.ts";
import type {
  AuditEventDraft,
  AuditEventId,
  AuditScope,
  ProjectionWatermark,
} from "./model.ts";
import { auditEventDigest } from "./model.ts";
import type { AuditAccessService } from "./access.ts";
import type { AuditOutboxAppender } from "./transaction.ts";
import type { OutboxEvent } from "../platform/events/v1.ts";

export interface AuditExportFilters {
  readonly eventTypes?: readonly string[];
  readonly aggregateTypes?: readonly string[];
  readonly occurredAfter?: Date;
  readonly occurredBefore?: Date;
}

export interface AuditExportJobRequest {
  readonly jobId: JobId;
  readonly operationId: OperationId;
  readonly auditEventId: AuditEventId;
  readonly outboxEventId: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly context: RequestContext;
  readonly scope: AuditScope;
  readonly requestedAt: Date;
  readonly timeoutAt: Date;
  readonly filters: AuditExportFilters;
  readonly projectionWatermark?: ProjectionWatermark;
}

export interface AuditExportAccepted {
  readonly jobId: JobId;
  readonly auditEventId: AuditEventId;
  readonly status: "queued";
}

export class AuditExportJobBoundary {
  constructor(
    private readonly access: Pick<AuditAccessService, "authorizeExport">,
    private readonly jobs: Pick<JobRepository, "enqueue">,
    private readonly auditOutbox: AuditOutboxAppender,
  ) {}

  async request(
    transaction: TransactionHandle,
    request: AuditExportJobRequest,
  ): Promise<AuditExportAccepted> {
    assertExportRequest(request);
    const decision = await this.access.authorizeExport(
      request.context,
      request.scope,
    );
    if (!decision.allowed || decision.authoritySnapshot === undefined) {
      throw new Error(
        `Audit export operation "${request.operationId}" was denied; expected an authority snapshot for an authorized export.`,
      );
    }
    assertAuthority(request, decision.authoritySnapshot);
    const job = exportJob(request, decision.authoritySnapshot);
    const auditEvent = await exportAuditEvent(
      request,
      decision.authoritySnapshot,
      job,
    );
    const outboxEvent = exportOutboxEvent(request, job, auditEvent);
    await this.auditOutbox.append(transaction, auditEvent, outboxEvent);
    await this.jobs.enqueue(transaction, job);
    return {
      jobId: request.jobId,
      auditEventId: request.auditEventId,
      status: "queued",
    };
  }
}

function assertExportRequest(request: AuditExportJobRequest): void {
  if (request.context.tenantId !== request.scope.tenantId) {
    throw new Error(
      `Audit export context tenant "${request.context.tenantId}" does not match requested tenant "${request.scope.tenantId}"; expected tenant isolation.`,
    );
  }
  if (request.timeoutAt <= request.requestedAt) {
    throw new Error(
      `Audit export timeout "${request.timeoutAt.toISOString()}" is invalid; expected after request time "${request.requestedAt.toISOString()}".`,
    );
  }
  for (const value of request.filters.eventTypes ?? []) {
    assertFilter(value, "event type");
  }
  for (const value of request.filters.aggregateTypes ?? []) {
    assertFilter(value, "aggregate type");
  }
}

function assertFilter(value: string, label: string): void {
  if (value.trim() && value.length <= 128) return;
  throw new Error(
    `Audit export ${label} filter "${value}" is invalid; expected 1-128 characters.`,
  );
}

function assertAuthority(
  request: AuditExportJobRequest,
  authority: NonNullable<
    Awaited<
      ReturnType<AuditAccessService["authorizeExport"]>
    >["authoritySnapshot"]
  >,
): void {
  if (authority.actorId !== request.context.actorId) {
    throw new Error(
      `Audit export authority actor "${authority.actorId}" does not match context actor "${request.context.actorId}"; expected the initiating actor to be captured.`,
    );
  }
  if (authority.scope.tenantId !== request.scope.tenantId) {
    throw new Error(
      `Audit export authority tenant "${authority.scope.tenantId}" does not match requested tenant "${request.scope.tenantId}"; expected tenant-bound authority.`,
    );
  }
}

function exportJob(
  request: AuditExportJobRequest,
  authority: NonNullable<
    Awaited<
      ReturnType<AuditAccessService["authorizeExport"]>
    >["authoritySnapshot"]
  >,
): DurableJob {
  return {
    jobId: request.jobId,
    operationId: request.operationId,
    jobType: "audit.export",
    schemaVersion: 1,
    tenantId: request.scope.tenantId,
    workspaceId: request.scope.workspaceId,
    dealId: request.scope.dealId,
    initiatingActorId: request.context.actorId,
    authoritySnapshotReference: authority.snapshotId,
    correlationId: request.context.correlationId,
    idempotencyKey: request.idempotencyKey,
    inputVersionReferences: [],
    payload: exportQueryPayload(request),
    timeoutAt: request.timeoutAt,
    createdAt: request.requestedAt,
  };
}

function exportQueryPayload(
  request: AuditExportJobRequest,
): Readonly<Record<string, unknown>> {
  return {
    scope: scopePayload(request.scope),
    filters: filterPayload(request.filters),
    projectionWatermark: request.projectionWatermark ?? null,
  };
}

function scopePayload(scope: AuditScope): Readonly<Record<string, unknown>> {
  return {
    tenantId: scope.tenantId,
    ...(scope.workspaceId === undefined
      ? {}
      : { workspaceId: scope.workspaceId }),
    ...(scope.dealId === undefined ? {} : { dealId: scope.dealId }),
  };
}

function filterPayload(
  filters: AuditExportFilters,
): Readonly<Record<string, unknown>> {
  return {
    ...(filters.eventTypes === undefined
      ? {}
      : { eventTypes: [...filters.eventTypes] }),
    ...(filters.aggregateTypes === undefined
      ? {}
      : { aggregateTypes: [...filters.aggregateTypes] }),
    ...(filters.occurredAfter === undefined
      ? {}
      : { occurredAfter: filters.occurredAfter.toISOString() }),
    ...(filters.occurredBefore === undefined
      ? {}
      : { occurredBefore: filters.occurredBefore.toISOString() }),
  };
}

async function exportAuditEvent(
  request: AuditExportJobRequest,
  authority: NonNullable<
    Awaited<
      ReturnType<AuditAccessService["authorizeExport"]>
    >["authoritySnapshot"]
  >,
  job: DurableJob,
): Promise<AuditEventDraft> {
  const version = aggregateVersion();
  const draft: AuditEventDraft = {
    eventId: request.auditEventId,
    tenantId: request.scope.tenantId,
    workspaceId: request.scope.workspaceId,
    dealId: request.scope.dealId,
    actorId: request.context.actorId,
    actorKind: authority.actorKind,
    origin: request.context.origin,
    correlationId: request.context.correlationId,
    aggregateType: "audit_export",
    aggregateId: request.operationId,
    aggregateVersion: version,
    eventType: "audit.export.requested",
    schemaVersion: 1,
    authoritySnapshot: authority,
    evidenceSnapshot: { capturedAt: request.requestedAt, references: [] },
    provenance: {
      actorId: request.context.actorId,
      actorKind: authority.actorKind,
      origin: request.context.origin,
      operationReference: request.operationId,
    },
    payload: {
      auditEventId: request.auditEventId,
      jobId: job.jobId,
      operationId: request.operationId,
      scope: scopePayload(request.scope),
      projectionWatermark: request.projectionWatermark ?? null,
    },
    classifications: {
      auditEventId: "internal",
      jobId: "internal",
      operationId: "internal",
      scope: "internal",
      projectionWatermark: "internal",
    },
    contentDigest: "0".repeat(64),
    occurredAt: request.requestedAt,
  };
  return { ...draft, contentDigest: await auditEventDigest(draft) };
}

function exportOutboxEvent(
  request: AuditExportJobRequest,
  job: DurableJob,
  auditEvent: AuditEventDraft,
): OutboxEvent {
  return {
    eventId: request.outboxEventId,
    tenantId: request.scope.tenantId,
    workspaceId: request.scope.workspaceId,
    dealId: request.scope.dealId,
    aggregateType: "audit_export",
    aggregateId: request.operationId,
    aggregateVersion: auditEvent.aggregateVersion,
    eventType: "audit.export.requested",
    schemaVersion: 1,
    payload: {
      auditEventId: auditEvent.eventId,
      jobId: job.jobId,
      operationId: request.operationId,
    },
    correlationId: request.context.correlationId,
    occurredAt: request.requestedAt,
    availableAt: request.requestedAt,
  };
}

function aggregateVersion(): AggregateVersion {
  const parsed = parseAggregateVersion(1);
  if (parsed.ok) return parsed.value;
  throw new Error(
    "Audit export aggregate version is invalid; expected version 1.",
  );
}
