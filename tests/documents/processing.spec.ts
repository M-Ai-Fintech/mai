import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  createObjectReference,
  type DocumentScope,
  type ObjectReference,
} from "../../src/documents/model.ts";
import {
  createDocumentSource,
  createProviderMarker,
} from "../../src/documents/source.ts";
import { createDocumentVersion } from "../../src/documents/version.ts";
import {
  parseConnectorAccountId,
  parseDerivedArtifactId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
} from "../../src/documents/ids.ts";
import type { DocumentVersionId } from "../../src/documents/ids.ts";
import {
  type DerivedArtifactSink,
  type DocumentArtifactDraft,
  DocumentProcessingExecutor,
  ExactDocumentVersionChecker,
  type ExactDocumentVersionReader,
} from "../../src/documents/processing_worker.ts";
import type { DerivedArtifact } from "../../src/documents/processing.ts";
import { checksumBytes } from "../../src/documents/checksum.ts";
import type { DocumentVersion } from "../../src/documents/version.ts";
import {
  DocumentJobFailurePolicy,
  ExponentialDocumentRetryPolicy,
} from "../../src/documents/retry.ts";
import {
  createDocumentJob,
  deriveDocumentIdempotencyKey,
} from "../../src/documents/jobs.ts";
import {
  DocumentEventConsumer,
  type DocumentProviderEvent,
} from "../../src/documents/events.ts";
import { FakeObjectStore } from "../../src/documents/object_store.ts";
import type {
  ClaimedJob,
  JobExecutionContext,
} from "../../src/platform/jobs/v1.ts";
import { JobRepository } from "../../src/platform/jobs/v1.ts";
import {
  InboxRepository,
  OutboxRepository,
} from "../../src/platform/events/v1.ts";
import type {
  TransactionHandle,
  TransactionQueryResult,
} from "../../src/platform/persistence/v1.ts";
import {
  parseActorId,
  parseAggregateVersion,
  parseCorrelationId,
  parseDealId,
  parseIdempotencyKey,
  parseJobId,
  parseOperationId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";

Deno.test("document command keys are deterministic and actor-command-target scoped", async () => {
  const actorId = requiredId("actor_reviewer", parseActorId);
  const first = await deriveDocumentIdempotencyKey({
    actorId,
    commandType: "documents.process",
    targetType: "document",
    targetId: "doc_contract",
  });
  const replay = await deriveDocumentIdempotencyKey({
    actorId,
    commandType: "documents.process",
    targetType: "document",
    targetId: "doc_contract",
  });
  const otherTarget = await deriveDocumentIdempotencyKey({
    actorId,
    commandType: "documents.process",
    targetType: "document",
    targetId: "doc_other",
  });
  assertEquals(first, replay);
  assert(first !== otherTarget);
});

Deno.test("processing rechecks the exact immutable version before reading or producing an artifact", async () => {
  const version = fixtureVersion();
  const reader = new FixtureVersionReader(version);
  const checker = new ExactDocumentVersionChecker(reader);
  const job = fixtureClaimedJob(version.documentVersionId, 1);
  assertEquals(await checker.recheck(job), true);

  const artifacts = new RecordingArtifactSink();
  const objectStore = new FakeObjectStore();
  const reference = await storeInput(objectStore, version.objectReference);
  const draft: DocumentArtifactDraft = {
    derivedArtifactId: requiredId("artifact_text-v1", parseDerivedArtifactId),
    artifactVersion: 1,
    artifactType: "text",
    objectReference: reference,
    processor: "fixture-extractor",
    processorVersion: "v1",
    createdAt: timestamp("2026-08-03T12:01:00.000Z"),
  };
  const executor = new DocumentProcessingExecutor(
    reader,
    objectStore,
    new FixtureProcessor(draft),
    artifacts,
  );
  let beforeEffectCalls = 0;
  const result = await executor.execute(job, {
    deadline: timestamp("2026-08-03T12:30:00.000Z"),
    currentLeaseExpiry: () => timestamp("2026-08-03T12:10:00.000Z"),
    cancellationRequested: () => Promise.resolve(false),
    heartbeat: () => Promise.resolve(timestamp("2026-08-03T12:10:00.000Z")),
    beforeExternalEffect: () => {
      beforeEffectCalls += 1;
      return Promise.resolve();
    },
  });
  assertEquals(result.resultReference, "artifact_text-v1");
  assertEquals(artifacts.values.length, 1);
  assertEquals(beforeEffectCalls, 1);

  const stale = fixtureClaimedJob(version.documentVersionId, 2);
  await assertRejects(
    () => executor.execute(stale, fixtureContext()),
    Error,
    "STALE_DOCUMENT_VERSION",
  );
});

Deno.test("document retries schedule bounded attempts and dead-letter exhausted failures", () => {
  const policy = new ExponentialDocumentRetryPolicy(2, 1_000);
  const now = timestamp("2026-08-03T12:00:00.000Z");
  assertEquals(
    policy.nextAttempt(1, now)?.toISOString(),
    "2026-08-03T12:00:01.000Z",
  );
  assertEquals(policy.nextAttempt(2, now), undefined);
  const failurePolicy = new DocumentJobFailurePolicy(policy);
  const failure = failurePolicy.failure(
    fixtureClaimedJob("docver_contract-v1", 1),
    new Error("private provider detail"),
    now,
  );
  assertEquals(failure.outcome, "retry_scheduled");
  assertEquals(failure.failure, "DOCUMENT_PROCESSING_FAILED");
  const exhausted = failurePolicy.failure(
    fixtureClaimedJob("docver_contract-v1", 1, 2),
    new Error("private provider detail"),
    now,
  );
  assertEquals(exhausted.outcome, "dead_lettered");
});

Deno.test("provider events deduplicate, retain failure evidence, and reschedule", async () => {
  const transaction = new EventTransaction();
  const consumer = new DocumentEventConsumer({
    transactions: {
      run: <T>(callback: (value: TransactionHandle) => Promise<T>) =>
        callback(transaction),
    },
    inbox: new InboxRepository(),
    jobs: new JobRepository(),
    outbox: new OutboxRepository(),
    clock: { now: () => timestamp("2026-08-03T12:02:00.000Z") },
  });
  const event = fixtureProviderEvent();
  transaction.failJobInsert = true;
  assertEquals(await consumer.consume(event), { status: "failed" });
  transaction.failJobInsert = false;
  assertEquals(await consumer.consume(event), { status: "scheduled" });
  assertEquals(await consumer.consume(event), {
    status: "duplicate",
    state: "processed",
  });
  assertEquals(transaction.jobWrites, 1);
  assertEquals(transaction.outboxWrites, 1);
  assertEquals(transaction.failureReference, "DOCUMENT_EVENT_FAILED");
});

class FixtureVersionReader implements ExactDocumentVersionReader {
  constructor(private readonly value: DocumentVersion) {}

  findExact(
    _scope: DocumentScope,
    documentVersionId: DocumentVersionId,
  ): Promise<DocumentVersion | undefined> {
    return Promise.resolve(
      documentVersionId === this.value.documentVersionId
        ? this.value
        : undefined,
    );
  }
}

class RecordingArtifactSink implements DerivedArtifactSink {
  readonly values: DerivedArtifact[] = [];

  append(
    artifact: Parameters<DerivedArtifactSink["append"]>[0],
  ): Promise<void> {
    this.values.push(artifact);
    return Promise.resolve();
  }
}

class FixtureProcessor {
  constructor(private readonly draft: DocumentArtifactDraft) {}

  process(
    _version: DocumentVersion,
    _content: Uint8Array,
  ): Promise<DocumentArtifactDraft> {
    return Promise.resolve(this.draft);
  }
}

class EventTransaction implements TransactionHandle {
  readonly metadata: Readonly<Record<string, string>> = {};
  failureReference: string | undefined;
  failJobInsert = false;
  jobWrites = 0;
  outboxWrites = 0;
  private state: "processing" | "processed" | "failed" | undefined;

  query<TRow = Record<string, unknown>>(
    text: string,
    parameters: readonly unknown[] = [],
  ): Promise<TransactionQueryResult<TRow>> {
    if (text.startsWith("INSERT INTO platform.inbox")) {
      return Promise.resolve(
        this.claim() as unknown as TransactionQueryResult<TRow>,
      );
    }
    if (text.startsWith("SELECT payload_digest")) {
      return Promise.resolve(
        this.lock() as unknown as TransactionQueryResult<TRow>,
      );
    }
    if (text.startsWith("INSERT INTO platform.jobs")) {
      if (this.failJobInsert) {
        return Promise.reject(new Error("fixture job insert failure"));
      }
      this.jobWrites += 1;
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (text.startsWith("INSERT INTO platform.outbox")) {
      this.outboxWrites += 1;
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (text.includes("SET processing_state = 'processed'")) {
      this.state = "processed";
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (text.includes("SET processing_state = 'failed'")) {
      this.state = "failed";
      this.failureReference = String(parameters[4]);
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    this.state = "processing";
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  private claim(): TransactionQueryResult<never> {
    if (this.state !== undefined) return { rows: [], rowCount: 0 };
    this.state = "processing";
    return { rows: [], rowCount: 1 };
  }

  private lock(): TransactionQueryResult<{
    readonly payloadDigest: string;
    readonly processingState: "processing" | "processed" | "failed";
    readonly failureReference: string | null;
  }> {
    if (this.state === undefined) return { rows: [], rowCount: 0 };
    return {
      rows: [{
        payloadDigest: "b".repeat(64),
        processingState: this.state,
        failureReference: this.failureReference ?? null,
      }],
      rowCount: 1,
    };
  }
}

async function storeInput(
  objectStore: FakeObjectStore,
  reference: ObjectReference,
): Promise<ObjectReference> {
  const content = new TextEncoder().encode("input");
  const session = await objectStore.negotiateUpload({
    scope: reference.scope,
    objectReferenceId: reference.objectReferenceId,
    objectKey: reference.objectKey,
    storageVersion: reference.storageVersion,
    mediaType: reference.mediaType,
    requestedAt: reference.createdAt,
  });
  return await objectStore.storeObject({
    session,
    content,
    checksum: await checksumBytes(content),
    createdAt: reference.createdAt,
  });
}

function fixtureContext(): JobExecutionContext {
  return {
    deadline: timestamp("2026-08-03T12:30:00.000Z"),
    currentLeaseExpiry: () => timestamp("2026-08-03T12:10:00.000Z"),
    cancellationRequested: () => Promise.resolve(false),
    heartbeat: () => Promise.resolve(timestamp("2026-08-03T12:10:00.000Z")),
    beforeExternalEffect: () => Promise.resolve(),
  };
}

function fixtureClaimedJob(
  versionId: string,
  version: number,
  attemptNumber = 1,
): ClaimedJob {
  return {
    ...fixtureJob(),
    state: "running",
    attemptNumber,
    workerId: "worker_fixture",
    attemptStartedAt: timestamp("2026-08-03T12:00:00.000Z"),
    leaseExpiresAt: timestamp("2026-08-03T12:10:00.000Z"),
    progress: 0,
    inputVersionReferences: [{
      aggregateType: "DocumentVersion",
      aggregateId: versionId,
      version: requiredId(version, parseAggregateVersion),
    }],
  };
}

function fixtureProviderEvent(): DocumentProviderEvent {
  const job = createDocumentJob(fixtureJob());
  return {
    message: {
      tenantId: job.tenantId,
      sourceIdentity: "provider_fixture",
      messageIdentity: "message_contract-v1",
      payloadDigest: "b".repeat(64),
      receivedAt: timestamp("2026-08-03T12:00:00.000Z"),
    },
    job,
    outboxEvent: {
      eventId: "event_contract-v1",
      tenantId: job.tenantId,
      workspaceId: job.workspaceId,
      dealId: job.dealId,
      aggregateType: "DocumentVersion",
      aggregateId: "docver_contract-v1",
      aggregateVersion: requiredId(1, parseAggregateVersion),
      eventType: "documents.process.requested",
      schemaVersion: 1,
      payload: { jobId: job.jobId },
      correlationId: job.correlationId,
      occurredAt: job.createdAt,
      availableAt: job.createdAt,
    },
  };
}

function fixtureJob() {
  return {
    jobId: requiredId("job_document-process", parseJobId),
    operationId: requiredId("op_document-process", parseOperationId),
    jobType: "documents.process" as const,
    schemaVersion: 1,
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
    initiatingActorId: requiredId("actor_reviewer", parseActorId),
    correlationId: requiredId("cor_document-process", parseCorrelationId),
    idempotencyKey: requiredId("idem_document-process", parseIdempotencyKey),
    inputVersionReferences: [{
      aggregateType: "DocumentVersion",
      aggregateId: "docver_contract-v1",
      version: requiredId(1, parseAggregateVersion),
    }],
    payload: { documentVersionId: "docver_contract-v1" },
    timeoutAt: timestamp("2026-08-03T12:30:00.000Z"),
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  };
}

function fixtureVersion() {
  const scope = fixtureScope();
  const provider = createProviderMarker("fixture");
  const source = createDocumentSource({
    sourceId: requiredId("source_room", parseDocumentSourceId),
    scope,
    connectorAccount: {
      connectorAccountId: requiredId(
        "connector_fixture",
        parseConnectorAccountId,
      ),
      tenantId: scope.tenantId,
      provider,
    },
    provider,
    providerWorkspaceId: "room-1",
    providerDocumentId: "provider-doc-1",
    providerVersion: "v1",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
  const objectReference = createObjectReference({
    objectReferenceId: requiredId("object_contract-v1", parseObjectReferenceId),
    scope,
    objectKey: "documents/doc_contract/docver_contract-v1",
    storageVersion: "storage-v1",
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    byteLength: 5,
    mediaType: "application/pdf",
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
  return createDocumentVersion({
    documentVersionId: requiredId("docver_contract-v1", parseDocumentVersionId),
    documentId: requiredId("doc_contract", parseDocumentId),
    scope,
    versionNumber: 1,
    source,
    provider,
    checksum: objectReference.checksum,
    classification: "legal",
    objectReference,
    createdAt: timestamp("2026-08-03T12:00:00.000Z"),
  });
}

function fixtureScope() {
  return {
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
  };
}

function timestamp(value: string): Date {
  return new Date(value);
}

type FixtureParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false };

function requiredId<T>(
  value: unknown,
  parse: (value: unknown) => FixtureParseResult<T>,
): T {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${String(value)}" is invalid.`);
}
