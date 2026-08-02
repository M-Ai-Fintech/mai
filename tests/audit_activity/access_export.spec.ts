import { assertEquals, assertRejects } from "@std/assert";
import {
  AuditAccessDeniedError,
  AuditAccessService,
  AuditExportJobBoundary,
} from "../../src/audit_activity/v1.ts";
import {
  AllowAuditAuthorization,
  DenyAuditAuthorization,
  fixtureContext,
  fixtureEvent,
  fixtureExportRequest,
  fixtureScope,
  ImmediateTransaction,
  RecordingAuditOutboxAppender,
  RecordingAuditRepository,
  RecordingJobQueue,
} from "./support.ts";

Deno.test("audit read authorization filters payload classifications before projection", async () => {
  const repository = new RecordingAuditRepository();
  repository.events.push(fixtureEvent(1));
  const authorization = new AllowAuditAuthorization();
  const service = new AuditAccessService(repository, authorization);

  const projection = await service.readActivity(
    new ImmediateTransaction(),
    fixtureContext(),
    fixtureScope(),
  );

  assertEquals(projection.entries[0].payload, { visible: "visible-1" });
  assertEquals(authorization.requests[0].action, "audit.read");
});

Deno.test("denied audit reads do not load audit records", async () => {
  const repository = new RecordingAuditRepository();
  const authorization = new DenyAuditAuthorization();
  const service = new AuditAccessService(repository, authorization);

  await assertRejects(
    () =>
      service.readActivity(
        new ImmediateTransaction(),
        fixtureContext(),
        fixtureScope(),
      ),
    AuditAccessDeniedError,
    "audit.read",
  );
  assertEquals(repository.listCalls, 0);
});

Deno.test("redaction appends an overlay without changing the event record", async () => {
  const repository = new RecordingAuditRepository();
  const event = fixtureEvent(1);
  repository.events.push(event);
  const service = new AuditAccessService(
    repository,
    new AllowAuditAuthorization(fixtureEvent(1).authoritySnapshot, ["public"]),
  );

  const overlay = await service.appendRedaction(
    new ImmediateTransaction(),
    fixtureContext(),
    {
      overlayId: "overlay-access" as Parameters<
        AuditAccessService["appendRedaction"]
      >[2]["overlayId"],
      tenantId: event.tenantId,
      workspaceId: event.workspaceId,
      dealId: event.dealId,
      targetEventId: event.eventId,
      actorId: event.actorId,
      authoritySnapshot: event.authoritySnapshot,
      reason: "privacy_request",
      fields: ["visible"],
      appliedAt: new Date("2026-08-01T12:03:00.000Z"),
    },
  );

  assertEquals(overlay.targetEventId, event.eventId);
  assertEquals(repository.events, [event]);
  assertEquals(repository.overlays.length, 1);
});

Deno.test("authorized export enqueues opaque scoped inputs and audits access", async () => {
  const access = new AuditAccessService(
    new RecordingAuditRepository(),
    new AllowAuditAuthorization(),
  );
  const jobs = new RecordingJobQueue();
  const auditOutbox = new RecordingAuditOutboxAppender();
  const boundary = new AuditExportJobBoundary(access, jobs, auditOutbox);
  const request = fixtureExportRequest();

  const accepted = await boundary.request(new ImmediateTransaction(), request);

  assertEquals(accepted, {
    jobId: request.jobId,
    auditEventId: request.auditEventId,
    status: "queued",
  });
  assertEquals(jobs.jobs.length, 1);
  assertEquals(jobs.jobs[0].jobType, "audit.export");
  assertEquals(jobs.jobs[0].payload, {
    scope: {
      tenantId: request.scope.tenantId,
      workspaceId: request.scope.workspaceId,
      dealId: request.scope.dealId,
    },
    filters: { eventTypes: ["fixture.changed"] },
    projectionWatermark: null,
  });
  assertEquals(auditOutbox.calls[0].audit.eventType, "audit.export.requested");
  assertEquals(auditOutbox.calls[0].outbox.payload, {
    auditEventId: request.auditEventId,
    jobId: request.jobId,
    operationId: request.operationId,
  });
  assertEquals(
    auditOutbox.calls[0].audit.payload,
    {
      auditEventId: request.auditEventId,
      jobId: request.jobId,
      operationId: request.operationId,
      scope: {
        tenantId: request.scope.tenantId,
        workspaceId: request.scope.workspaceId!,
        dealId: request.scope.dealId!,
      },
      projectionWatermark: null,
    },
  );
});

Deno.test("denied export does not enqueue a job or append an audit event", async () => {
  const access = new AuditAccessService(
    new RecordingAuditRepository(),
    new DenyAuditAuthorization(),
  );
  const jobs = new RecordingJobQueue();
  const auditOutbox = new RecordingAuditOutboxAppender();
  const boundary = new AuditExportJobBoundary(access, jobs, auditOutbox);

  await assertRejects(
    () => boundary.request(new ImmediateTransaction(), fixtureExportRequest()),
    AuditAccessDeniedError,
    "audit.export",
  );
  assertEquals(jobs.jobs, []);
  assertEquals(auditOutbox.calls, []);
});
