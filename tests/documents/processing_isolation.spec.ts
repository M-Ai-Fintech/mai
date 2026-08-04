import { assertEquals, assertRejects } from "@std/assert";
import {
  type ByteSource,
  checksumBytes,
} from "../../src/documents/checksum.ts";
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
  ExactDocumentVersionChecker,
  type ExactDocumentVersionReader,
} from "../../src/documents/processing_worker.ts";
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
import type { DerivedArtifact } from "../../src/documents/processing.ts";
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

Deno.test("processing binds the authorized document to the exact version scope", async () => {
  const authorizedScope = fixtureScope(
    "tenant_acme",
    "workspace_dealroom",
    "deal_horizon",
  );
  const authorized = fixtureVersion(
    "contract",
    "doc_contract",
    authorizedScope,
  );
  const otherDocument = fixtureVersion("other", "doc_other", authorizedScope);
  const otherTenant = fixtureVersion(
    "tenant",
    "doc_contract",
    fixtureScope("tenant_other", "workspace_dealroom", "deal_horizon"),
  );
  const otherWorkspace = fixtureVersion(
    "workspace",
    "doc_contract",
    fixtureScope("tenant_acme", "workspace_other", "deal_horizon"),
  );
  const otherDeal = fixtureVersion(
    "deal",
    "doc_contract",
    fixtureScope("tenant_acme", "workspace_dealroom", "deal_other"),
  );
  const versions = new FixtureVersionReader([
    authorized,
    otherDocument,
    otherTenant,
    otherWorkspace,
    otherDeal,
  ]);
  const objectStore = new CountingObjectStore();
  await storeObject(objectStore, authorized.objectReference);
  await storeObject(objectStore, otherDocument.objectReference);
  const processor = new RecordingProcessor(authorized.objectReference);
  const artifacts = new RecordingArtifactSink();
  const executor = new DocumentProcessingExecutor(
    versions,
    objectStore,
    processor,
    artifacts,
  );

  const valid = fixtureClaimedJob(
    "valid",
    authorizedScope,
    authorized.documentId,
    authorized,
  );
  const checker = new ExactDocumentVersionChecker(versions);
  assertEquals(await checker.recheck(valid), true);
  await executor.execute(valid, fixtureContext());
  assertEquals(objectStore.readCount, 1);
  assertEquals(processor.calls, 1);
  assertEquals(artifacts.values.length, 1);

  const rejected = [
    fixtureClaimedJob(
      "other-document",
      authorizedScope,
      authorized.documentId,
      otherDocument,
    ),
    fixtureClaimedJob(
      "other-tenant",
      authorizedScope,
      authorized.documentId,
      otherTenant,
    ),
    fixtureClaimedJob(
      "other-workspace",
      authorizedScope,
      authorized.documentId,
      otherWorkspace,
    ),
    fixtureClaimedJob(
      "other-deal",
      authorizedScope,
      authorized.documentId,
      otherDeal,
    ),
  ];
  for (const job of rejected) {
    const readsBefore = objectStore.readCount;
    const callsBefore = processor.calls;
    await assertRejects(
      () => executor.execute(job, fixtureContext()),
      Error,
      "STALE_DOCUMENT_VERSION",
    );
    assertEquals(await checker.recheck(job), false);
    assertEquals(objectStore.readCount, readsBefore);
    assertEquals(processor.calls, callsBefore);
    assertEquals(artifacts.values.length, 1);
  }
});

class FixtureVersionReader implements ExactDocumentVersionReader {
  constructor(private readonly values: readonly DocumentVersion[]) {}

  findExact(
    scope: DocumentScope,
    documentVersionId: DocumentVersion["documentVersionId"],
  ): Promise<DocumentVersion | undefined> {
    return Promise.resolve(
      this.values.find((version) =>
        version.documentVersionId === documentVersionId &&
        sameScope(version.scope, scope)
      ),
    );
  }
}

class CountingObjectStore implements ObjectStore {
  readonly delegate = new FakeObjectStore();
  readCount = 0;

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
    this.readCount += 1;
    return this.delegate.readObject(reference);
  }
}

class RecordingProcessor {
  calls = 0;

  constructor(private readonly objectReference: ObjectReference) {}

  process(
    _version: DocumentVersion,
    _content: ByteSource,
  ): Promise<DocumentArtifactDraft> {
    this.calls += 1;
    return Promise.resolve({
      derivedArtifactId: requiredId(
        "artifact_contract-v1",
        parseDerivedArtifactId,
      ),
      artifactVersion: 1,
      artifactType: "text",
      objectReference: this.objectReference,
      processor: "fixture-processor",
      processorVersion: "v1",
      createdAt: timestamp("2026-08-04T12:00:00.000Z"),
    });
  }
}

class RecordingArtifactSink implements DerivedArtifactSink {
  readonly values: DerivedArtifact[] = [];

  append(artifact: DerivedArtifact): Promise<void> {
    this.values.push(artifact);
    return Promise.resolve();
  }
}

function fixtureClaimedJob(
  suffix: string,
  scope: DocumentScope,
  authorizedDocumentId: DocumentVersion["documentId"],
  version: DocumentVersion,
): ClaimedJob {
  const job = createDocumentJob({
    jobId: requiredId(`job_isolation-${suffix}`, parseJobId),
    operationId: requiredId(`op_isolation-${suffix}`, parseOperationId),
    jobType: "documents.process",
    schemaVersion: 1,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    initiatingActorId: requiredId("actor_reviewer", parseActorId),
    correlationId: requiredId(`cor_isolation-${suffix}`, parseCorrelationId),
    idempotencyKey: requiredId(`idem_isolation-${suffix}`, parseIdempotencyKey),
    inputVersionReferences: [{
      aggregateType: "DocumentVersion",
      aggregateId: version.documentVersionId,
      version: requiredId(version.versionNumber, parseAggregateVersion),
      documentId: authorizedDocumentId,
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

function fixtureVersion(
  suffix: string,
  documentId: string,
  scope: DocumentScope,
): DocumentVersion {
  const provider = createProviderMarker("fixture");
  const source = createDocumentSource({
    sourceId: requiredId(`source_${suffix}`, parseDocumentSourceId),
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
    providerDocumentId: `provider-${suffix}`,
    providerVersion: "v1",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
  const objectReference = createObjectReference({
    objectReferenceId: requiredId(
      `object_${suffix}-v1`,
      parseObjectReferenceId,
    ),
    scope,
    objectKey: `documents/${documentId}/docver_${suffix}-v1`,
    storageVersion: "storage-v1",
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    byteLength: 5,
    mediaType: "application/pdf",
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
  return createDocumentVersion({
    documentVersionId: requiredId(
      `docver_${suffix}-v1`,
      parseDocumentVersionId,
    ),
    documentId: requiredId(documentId, parseDocumentId),
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

function fixtureScope(
  tenant: string,
  workspace: string,
  deal: string,
): DocumentScope {
  return {
    tenantId: requiredId(tenant, parseTenantId),
    workspaceId: requiredId(workspace, parseWorkspaceId),
    dealId: requiredId(deal, parseDealId),
  };
}

function fixtureContext(): JobExecutionContext {
  return {
    deadline: timestamp("2026-08-04T12:30:00.000Z"),
    currentLeaseExpiry: () => timestamp("2026-08-04T12:10:00.000Z"),
    cancellationRequested: () => Promise.resolve(false),
    heartbeat: () => Promise.resolve(timestamp("2026-08-04T12:10:00.000Z")),
    beforeExternalEffect: () => Promise.resolve(),
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
