import { assertEquals, assertRejects } from "@std/assert";
import type { ByteSource } from "../../src/documents/checksum.ts";
import { checksumBytes } from "../../src/documents/checksum.ts";
import {
  createObjectReference,
  type DocumentScope,
  type ObjectReference,
} from "../../src/documents/model.ts";
import {
  createDocumentSource,
  createProviderMarker,
} from "../../src/documents/source.ts";
import {
  type DerivedArtifactSink,
  type DocumentArtifactDraft,
  DocumentProcessingExecutor,
  type DocumentProcessor,
  type ExactDocumentVersionReader,
} from "../../src/documents/processing_worker.ts";
import type { DerivedArtifact } from "../../src/documents/processing.ts";
import {
  FakeObjectStore,
  type ObjectStore,
} from "../../src/documents/object_store.ts";
import {
  parseConnectorAccountId,
  parseDerivedArtifactId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
} from "../../src/documents/ids.ts";
import { createDocumentJob } from "../../src/documents/jobs.ts";
import {
  createDocumentVersion,
  type DocumentVersion,
} from "../../src/documents/version.ts";
import type {
  ClaimedJob,
  JobExecutionContext,
} from "../../src/platform/jobs/v1.ts";
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

Deno.test("processing fences each external effect before appending once", async () => {
  const version = fixtureVersion();
  const lease = new LeaseController();
  const objectStore = new LeaseObservingObjectStore(lease);
  await storeObject(objectStore, version.objectReference);
  const processor = new LeaseObservingProcessor(lease, version.objectReference);
  const artifacts = new RecordingArtifactSink();
  const executor = new DocumentProcessingExecutor(
    new FixtureVersionReader(version),
    objectStore,
    processor,
    artifacts,
  );

  const result = await executor.execute(fixtureJob(version), lease.context());

  assertEquals(result.resultReference, "artifact_lease-v1");
  assertEquals(lease.assertionCount, 3);
  assertEquals(objectStore.assertionsBeforeRead, [1]);
  assertEquals(processor.assertionsBeforeProcess, [2]);
  assertEquals(artifacts.appendCalls, 1);
  assertEquals(artifacts.values.length, 1);
});

Deno.test("processing rejects lease loss during processing before artifact append", async () => {
  const version = fixtureVersion();
  const lease = new LeaseController();
  const objectStore = new LeaseObservingObjectStore(lease);
  await storeObject(objectStore, version.objectReference);
  const processor = new LeaseObservingProcessor(
    lease,
    version.objectReference,
    true,
  );
  const artifacts = new RecordingArtifactSink();
  const executor = new DocumentProcessingExecutor(
    new FixtureVersionReader(version),
    objectStore,
    processor,
    artifacts,
  );

  await assertRejects(
    () => executor.execute(fixtureJob(version), lease.context()),
    Error,
    "LEASE_LOST",
  );

  assertEquals(lease.assertionCount, 3);
  assertEquals(objectStore.readCalls, 1);
  assertEquals(processor.calls, 1);
  assertEquals(artifacts.appendCalls, 0);
  assertEquals(artifacts.values.length, 0);
});

class LeaseController {
  assertionCount = 0;
  private expired = false;

  expire(): void {
    this.expired = true;
  }

  context(): JobExecutionContext {
    return {
      deadline: timestamp("2026-08-04T12:30:00.000Z"),
      currentLeaseExpiry: () => timestamp("2026-08-04T12:10:00.000Z"),
      cancellationRequested: () => Promise.resolve(false),
      heartbeat: () => Promise.resolve(timestamp("2026-08-04T12:10:00.000Z")),
      beforeExternalEffect: () => {
        this.assertionCount += 1;
        if (this.expired) {
          return Promise.reject(
            new Error("LEASE_LOST: expected an active worker lease."),
          );
        }
        return Promise.resolve();
      },
    };
  }
}

class LeaseObservingObjectStore implements ObjectStore {
  private readonly delegate = new FakeObjectStore();
  readonly assertionsBeforeRead: number[] = [];
  readCalls = 0;

  constructor(private readonly lease: LeaseController) {}

  negotiateUpload(
    ...args: Parameters<ObjectStore["negotiateUpload"]>
  ): ReturnType<ObjectStore["negotiateUpload"]> {
    return this.delegate.negotiateUpload(...args);
  }

  storeObject(
    ...args: Parameters<ObjectStore["storeObject"]>
  ): ReturnType<ObjectStore["storeObject"]> {
    return this.delegate.storeObject(...args);
  }

  retainObject(
    ...args: Parameters<ObjectStore["retainObject"]>
  ): ReturnType<ObjectStore["retainObject"]> {
    return this.delegate.retainObject(...args);
  }

  readObject(reference: ObjectReference): Promise<ByteSource> {
    this.readCalls += 1;
    this.assertionsBeforeRead.push(this.lease.assertionCount);
    return this.delegate.readObject(reference);
  }
}

class LeaseObservingProcessor implements DocumentProcessor {
  readonly assertionsBeforeProcess: number[] = [];
  calls = 0;

  constructor(
    private readonly lease: LeaseController,
    private readonly objectReference: ObjectReference,
    private readonly expireDuringProcess = false,
  ) {}

  process(
    _version: DocumentVersion,
    _content: ByteSource,
  ): Promise<DocumentArtifactDraft> {
    this.calls += 1;
    this.assertionsBeforeProcess.push(this.lease.assertionCount);
    if (this.expireDuringProcess) this.lease.expire();
    return Promise.resolve({
      derivedArtifactId: requiredId(
        "artifact_lease-v1",
        parseDerivedArtifactId,
      ),
      artifactVersion: 1,
      artifactType: "text",
      objectReference: this.objectReference,
      processor: "fixture-processor",
      processorVersion: "v1",
      createdAt: timestamp("2026-08-04T12:01:00.000Z"),
    });
  }
}

class RecordingArtifactSink implements DerivedArtifactSink {
  readonly values: DerivedArtifact[] = [];
  appendCalls = 0;

  append(artifact: DerivedArtifact): Promise<void> {
    this.appendCalls += 1;
    this.values.push(artifact);
    return Promise.resolve();
  }
}

class FixtureVersionReader implements ExactDocumentVersionReader {
  constructor(private readonly value: DocumentVersion) {}

  findExact(
    scope: DocumentScope,
    documentVersionId: DocumentVersion["documentVersionId"],
  ): Promise<DocumentVersion | undefined> {
    return Promise.resolve(
      documentVersionId === this.value.documentVersionId &&
        sameScope(scope, this.value.scope)
        ? this.value
        : undefined,
    );
  }
}

function fixtureJob(version: DocumentVersion): ClaimedJob {
  const job = createDocumentJob({
    jobId: requiredId("job_lease-fence", parseJobId),
    operationId: requiredId("op_lease-fence", parseOperationId),
    jobType: "documents.process",
    schemaVersion: 1,
    tenantId: version.scope.tenantId,
    workspaceId: version.scope.workspaceId,
    dealId: version.scope.dealId,
    initiatingActorId: requiredId("actor_reviewer", parseActorId),
    correlationId: requiredId("cor_lease-fence", parseCorrelationId),
    idempotencyKey: requiredId("idem_lease-fence", parseIdempotencyKey),
    inputVersionReferences: [{
      aggregateType: "DocumentVersion",
      aggregateId: version.documentVersionId,
      version: requiredId(version.versionNumber, parseAggregateVersion),
      documentId: version.documentId,
    }],
    payload: { documentVersionId: version.documentVersionId },
    timeoutAt: timestamp("2026-08-04T12:30:00.000Z"),
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
  return {
    ...job,
    state: "running",
    attemptNumber: 1,
    workerId: "worker_documents",
    attemptStartedAt: job.createdAt,
    leaseExpiresAt: timestamp("2026-08-04T12:10:00.000Z"),
    progress: 0,
  };
}

async function storeObject(
  objectStore: ObjectStore,
  reference: ObjectReference,
): Promise<void> {
  const content = new TextEncoder().encode("input");
  const session = await objectStore.negotiateUpload({
    scope: reference.scope,
    objectReferenceId: reference.objectReferenceId,
    objectKey: reference.objectKey,
    storageVersion: reference.storageVersion,
    mediaType: reference.mediaType,
    requestedAt: reference.createdAt,
  });
  await objectStore.storeObject({
    session,
    content,
    checksum: await checksumBytes(content),
    createdAt: reference.createdAt,
  });
}

function fixtureVersion(): DocumentVersion {
  const scope = fixtureScope();
  const provider = createProviderMarker("fixture");
  const source = createDocumentSource({
    sourceId: requiredId("source_lease", parseDocumentSourceId),
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
    providerDocumentId: "provider-lease",
    providerVersion: "v1",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
  const objectReference = createObjectReference({
    objectReferenceId: requiredId(
      "object_lease-v1",
      parseObjectReferenceId,
    ),
    scope,
    objectKey: "documents/doc_lease/docver_lease-v1",
    storageVersion: "storage-v1",
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    byteLength: 5,
    mediaType: "application/pdf",
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
  return createDocumentVersion({
    documentVersionId: requiredId(
      "docver_lease-v1",
      parseDocumentVersionId,
    ),
    documentId: requiredId("doc_lease", parseDocumentId),
    scope,
    versionNumber: 1,
    source,
    provider,
    checksum: objectReference.checksum,
    classification: "legal",
    objectReference,
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
}

function fixtureScope(): DocumentScope {
  return {
    tenantId: requiredId("tenant_acme", parseTenantId),
    workspaceId: requiredId("workspace_dealroom", parseWorkspaceId),
    dealId: requiredId("deal_horizon", parseDealId),
  };
}

function sameScope(left: DocumentScope, right: DocumentScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}

function timestamp(value: string): Date {
  return new Date(value);
}

function requiredId<TResult>(
  value: string | number,
  parse: (
    value: unknown,
  ) => { readonly ok: true; readonly value: TResult } | { readonly ok: false },
): TResult {
  const result = parse(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${String(value)}" is invalid.`);
}
