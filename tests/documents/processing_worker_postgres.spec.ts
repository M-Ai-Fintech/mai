import { assertEquals } from "@std/assert";
import {
  type ByteSource,
  checksumBytes,
} from "../../src/documents/checksum.ts";
import {
  parseConnectorAccountId,
  parseDerivedArtifactId,
  parseDocumentId,
  parseDocumentSourceId,
  parseDocumentVersionId,
  parseObjectReferenceId,
} from "../../src/documents/ids.ts";
import {
  FakeObjectStore,
  type ObjectStore,
} from "../../src/documents/object_store.ts";
import {
  type DerivedArtifactSink,
  type DocumentArtifactDraft,
  DocumentProcessingWorker,
  type DocumentProcessor,
  type ExactDocumentVersionReader,
} from "../../src/documents/processing_worker.ts";
import {
  DocumentJobFailurePolicy,
  ExponentialDocumentRetryPolicy,
} from "../../src/documents/retry.ts";
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
  createDocumentVersion,
  type DocumentVersion,
} from "../../src/documents/version.ts";
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
import {
  type JobAuditAppendPort,
  JobRepository,
} from "../../src/platform/jobs/v1.ts";
import {
  platformMigrations,
  PostgresMigrationRunner,
  PostgresTransactionRunner,
} from "../../src/platform/persistence/v1.ts";
import {
  createPostgresIntegrationTestPool,
  postgresIntegrationTestDatabaseUrl,
  PostgresTestTransactionPool,
} from "../platform/support/postgres.ts";

const databaseUrl = postgresIntegrationTestDatabaseUrl();

Deno.test({
  name: "document processing worker filters a mixed durable job queue",
  ignore: databaseUrl === undefined,
  async fn() {
    const pool = createPostgresIntegrationTestPool(databaseUrl!);
    await new PostgresMigrationRunner(pool).apply(platformMigrations);
    await pool.query(
      "TRUNCATE platform.job_attempts, platform.jobs RESTART IDENTITY CASCADE",
    );
    const transactions = new PostgresTransactionRunner(
      new PostgresTestTransactionPool(pool),
    );
    const repository = new JobRepository();
    const scope = fixtureScope();
    const version = fixtureVersion(scope);
    const objectStore = new FakeObjectStore();
    await storeObject(objectStore, version.objectReference);
    const jobs = [
      fixtureJob("process", "documents.process", scope, version),
      fixtureJob("notification", "notifications.send", scope),
      fixtureJob("reconcile", "deals.reconcile", scope),
      fixtureJob("sync", "documents.sync", scope),
    ];
    await transactions.run(async (transaction) => {
      for (const job of jobs) await repository.enqueue(transaction, job);
    });
    const artifacts = new RecordingArtifactSink();
    const processor = new RecordingProcessor(version.objectReference);
    const worker = new DocumentProcessingWorker({
      transactions,
      store: repository,
      versions: new FixtureVersionReader(version),
      objectStore,
      processor,
      artifacts,
      clock: new FixedClock(),
      failurePolicy: new DocumentJobFailurePolicy(
        new ExponentialDocumentRetryPolicy(3, 1_000),
      ),
      audit: new RecordingAudit(),
    });

    assertEquals(await worker.executeOne("worker_documents", 60_000), {
      status: "succeeded",
      jobId: jobs[0].jobId,
    });
    assertEquals(processor.calls, 1);
    assertEquals(artifacts.values.length, 1);

    const states = await pool.query<{
      job_id: string;
      job_type: string;
      state: string;
      attempt_count: number;
    }>(
      "SELECT job_id, job_type, state, attempt_count FROM platform.jobs",
    );
    const byType = new Map(states.rows.map((row) => [row.job_type, row]));
    assertEquals(byType.get("documents.process")?.state, "succeeded");
    assertEquals(byType.get("documents.process")?.attempt_count, 1);
    assertEquals(byType.get("notifications.send")?.state, "queued");
    assertEquals(byType.get("deals.reconcile")?.state, "queued");
    assertEquals(byType.get("documents.sync")?.state, "queued");

    const attempts = await pool.query<{ job_id: string; record_kind: string }>(
      "SELECT job_id, record_kind FROM platform.job_attempts ORDER BY attempt_record_id",
    );
    assertEquals(attempts.rows, [
      { job_id: jobs[0].jobId, record_kind: "started" },
      { job_id: jobs[0].jobId, record_kind: "completed" },
    ]);
    await pool.end();
  },
});

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

class RecordingProcessor implements DocumentProcessor {
  calls = 0;

  constructor(private readonly objectReference: ObjectReference) {}

  process(
    _version: DocumentVersion,
    _content: ByteSource,
  ): Promise<DocumentArtifactDraft> {
    this.calls += 1;
    return Promise.resolve({
      derivedArtifactId: requiredId(
        "artifact_worker-v1",
        parseDerivedArtifactId,
      ),
      artifactVersion: 1,
      artifactType: "text",
      objectReference: this.objectReference,
      processor: "fixture-processor",
      processorVersion: "v1",
      createdAt: timestamp("2026-08-04T12:00:10.000Z"),
    });
  }
}

class RecordingArtifactSink implements DerivedArtifactSink {
  readonly values: string[] = [];

  append(
    artifact: Parameters<DerivedArtifactSink["append"]>[0],
  ): Promise<void> {
    this.values.push(artifact.derivedArtifactId);
    return Promise.resolve();
  }
}

class RecordingAudit implements JobAuditAppendPort {
  append(): Promise<void> {
    return Promise.resolve();
  }
}

class FixedClock {
  now(): Date {
    return timestamp("2026-08-04T12:00:00.000Z");
  }
}

function fixtureJob(
  suffix: string,
  jobType: string,
  scope: DocumentScope,
  version?: DocumentVersion,
) {
  return {
    jobId: requiredId(`job_worker-${suffix}`, parseJobId),
    operationId: requiredId(`op_worker-${suffix}`, parseOperationId),
    jobType,
    schemaVersion: 1,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    initiatingActorId: requiredId("actor_reviewer", parseActorId),
    correlationId: requiredId(`cor_worker-${suffix}`, parseCorrelationId),
    idempotencyKey: requiredId(`idem_worker-${suffix}`, parseIdempotencyKey),
    inputVersionReferences: version === undefined ? [] : [{
      aggregateType: "DocumentVersion",
      aggregateId: version.documentVersionId,
      version: requiredId(version.versionNumber, parseAggregateVersion),
      documentId: version.documentId,
    }],
    payload: version === undefined
      ? {}
      : { documentVersionId: version.documentVersionId },
    timeoutAt: timestamp("2026-08-04T12:30:00.000Z"),
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
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

function fixtureVersion(scope: DocumentScope): DocumentVersion {
  const provider = createProviderMarker("fixture");
  const source = createDocumentSource({
    sourceId: requiredId("source_worker", parseDocumentSourceId),
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
    providerDocumentId: "provider-worker",
    providerVersion: "v1",
    aggregateVersion: 1,
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
    updatedAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
  const objectReference = createObjectReference({
    objectReferenceId: requiredId("object_worker-v1", parseObjectReferenceId),
    scope,
    objectKey: "documents/doc_contract/docver_worker-v1",
    storageVersion: "storage-v1",
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    byteLength: 5,
    mediaType: "application/pdf",
    createdAt: timestamp("2026-08-04T12:00:00.000Z"),
  });
  return createDocumentVersion({
    documentVersionId: requiredId("docver_worker-v1", parseDocumentVersionId),
    documentId: requiredId("doc_contract", parseDocumentId),
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
    tenantId: requiredId("tenant_postgresintegration", parseTenantId),
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
