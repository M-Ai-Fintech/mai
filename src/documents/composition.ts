import pg from "pg";
import {
  type Clock,
  IdempotencyRepository,
  PostgresTransactionRunner,
  type TransactionHandle,
} from "../platform/persistence/v1.ts";
import { type JobId, parseJobId } from "../platform/api/v1.ts";
import { type DurableJob, JobRepository } from "../platform/jobs/v1.ts";
import { type OutboxEvent, OutboxRepository } from "../platform/events/v1.ts";
import { documentsMigrations } from "./migrations/index.ts";
import { platformMigrations } from "../platform/persistence/v1.ts";
import { type DocumentListOptions, DocumentsRepository } from "./repository.ts";
import { FakeObjectStore, type ObjectStore } from "./object_store.ts";
import {
  type DocumentSourceProvider,
  FakeDocumentSourceProvider,
  sourceProviderMarker,
} from "./source_provider.ts";
import { createProviderCapabilities } from "./source.ts";
import {
  createDocumentJob,
  deriveDocumentDurableIdentifiers,
  enqueueDocumentJob,
} from "./jobs.ts";
import type {
  AcceptedDocumentJob,
  DocumentCommandScheduler,
  DocumentsAuthorizationPort,
  DocumentScheduleInput,
  DocumentScheduleResult,
  DocumentsReadPort,
} from "../api/v1/documents.ts";
import { DocumentsV1Application } from "../api/v1/documents.ts";
import type { Document, DocumentScope } from "./model.ts";
import type { DocumentId } from "./ids.ts";

export type DocumentsPoolOwnership = "owned" | "borrowed";

export interface DocumentsCompositionConfig {
  readonly pool: pg.Pool;
  readonly authorization: DocumentsAuthorizationPort;
  readonly clock?: Clock;
  readonly objectStore?: ObjectStore;
  readonly sourceProvider?: DocumentSourceProvider;
  readonly adaptersEnabled?: boolean;
  readonly poolOwnership?: DocumentsPoolOwnership;
}

export class DocumentsComposition {
  readonly transactions: PostgresTransactionRunner;
  readonly repository: DocumentsRepository;
  readonly reads: DocumentsReadPort;
  readonly scheduler: DocumentCommandScheduler;
  readonly objectStore: ObjectStore;
  readonly sourceProvider: DocumentSourceProvider;
  readonly adaptersEnabled: boolean;
  readonly migrations = Object.freeze([
    ...platformMigrations,
    ...documentsMigrations,
  ]);
  readonly application: DocumentsV1Application;
  private closed = false;

  constructor(
    readonly pool: pg.Pool,
    config: DocumentsCompositionConfig,
  ) {
    this.transactions = new PostgresTransactionRunner(pool);
    this.repository = new DocumentsRepository();
    this.reads = new PostgresDocumentsReadPort(
      this.repository,
      this.transactions,
    );
    this.scheduler = new PostgresDocumentCommandScheduler(
      this.transactions,
      config.clock,
    );
    if (config.adaptersEnabled === true && config.objectStore === undefined) {
      throw new Error(
        "Documents object storage is configured as real; expected an explicit ObjectStore adapter and refusing fixture fallback.",
      );
    }
    this.objectStore = config.objectStore ?? new FakeObjectStore();
    this.sourceProvider = config.sourceProvider ?? defaultSourceProvider();
    this.adaptersEnabled = config.adaptersEnabled ?? false;
    this.application = new DocumentsV1Application(
      config.authorization,
      this.reads,
      this.scheduler,
    );
    this.poolOwnership = config.poolOwnership ?? "borrowed";
  }

  private readonly poolOwnership: DocumentsPoolOwnership;

  close(): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    return this.poolOwnership === "owned" ? this.pool.end() : Promise.resolve();
  }
}

export function createDocumentsComposition(
  config: DocumentsCompositionConfig,
): DocumentsComposition {
  return new DocumentsComposition(config.pool, config);
}

class PostgresDocumentsReadPort implements DocumentsReadPort {
  constructor(
    private readonly repository: DocumentsRepository,
    private readonly transactions: PostgresTransactionRunner,
  ) {}

  findDocument(
    scope: DocumentScope,
    documentId: DocumentId,
  ): Promise<Document | undefined> {
    return this.transactions.run((transaction) =>
      this.repository.findDocument(transaction, scope, documentId)
    );
  }

  listDocuments(
    scope: DocumentScope,
    options: DocumentListOptions,
  ): Promise<readonly Document[]> {
    return this.transactions.run((transaction) =>
      this.repository.listDocuments(transaction, scope, options)
    );
  }
}

class PostgresDocumentCommandScheduler implements DocumentCommandScheduler {
  private readonly jobs = new JobRepository();
  private readonly outbox = new OutboxRepository();
  private readonly idempotency: IdempotencyRepository;
  private readonly clock: Clock;

  constructor(
    private readonly transactions: PostgresTransactionRunner,
    clock: Clock | undefined,
  ) {
    this.clock = clock ?? { now: () => new Date() };
    this.idempotency = new IdempotencyRepository(this.clock);
  }

  async schedule(
    input: DocumentScheduleInput,
  ): Promise<DocumentScheduleResult> {
    const identifiers = await deriveDocumentDurableIdentifiers({
      tenantId: input.scope.tenantId,
      workspaceId: input.scope.workspaceId,
      dealId: input.scope.dealId,
      actorId: input.context.actorId,
      commandType: input.commandType,
      documentId: input.documentId,
      idempotencyKey: input.idempotencyKey,
      payloadDigest: input.payloadDigest,
    });
    return this.transactions.run((transaction) =>
      this.scheduleInTransaction(transaction, input, identifiers)
    );
  }

  private async scheduleInTransaction(
    transaction: TransactionHandle,
    input: DocumentScheduleInput,
    identifiers: AcceptedDocumentJob,
  ): Promise<DocumentScheduleResult> {
    const claim = await this.idempotency.claim(transaction, {
      tenantId: input.context.tenantId,
      actorId: input.context.actorId,
      commandType: input.commandType,
      targetType: "document",
      targetId: scopedTargetId(input),
      idempotencyKey: input.idempotencyKey,
      payloadDigest: input.payloadDigest,
      expiresAt: this.expiry(),
    });
    if (claim.status === "replay") {
      return {
        status: "replayed",
        job: { ...identifiers, jobId: parseStoredJobId(claim.resultReference) },
      };
    }
    if (claim.status !== "claimed") return { status: "in_progress" };
    const now = this.clock.now();
    const job = createDocumentJob({
      jobId: identifiers.jobId,
      operationId: identifiers.operationId,
      jobType: input.commandType,
      schemaVersion: 1,
      tenantId: input.context.tenantId,
      workspaceId: input.context.workspaceId,
      dealId: input.context.dealId,
      initiatingActorId: input.context.actorId,
      correlationId: input.context.correlationId,
      idempotencyKey: input.idempotencyKey,
      inputVersionReferences: input.inputVersionReferences,
      payload: input.payload,
      timeoutAt: new Date(now.getTime() + 900_000),
      createdAt: now,
    });
    try {
      await enqueueDocumentJob(
        transaction,
        { jobs: this.jobs, outbox: this.outbox },
        job,
        eventFor(input, job, now),
      );
      await this.idempotency.complete(transaction, {
        tenantId: input.context.tenantId,
        actorId: input.context.actorId,
        commandType: input.commandType,
        targetType: "document",
        targetId: scopedTargetId(input),
        idempotencyKey: input.idempotencyKey,
        payloadDigest: input.payloadDigest,
        expiresAt: this.expiry(now),
      }, job.jobId);
      return { status: "accepted", job: identifiers };
    } catch (error) {
      await this.idempotency.fail(transaction, {
        tenantId: input.context.tenantId,
        actorId: input.context.actorId,
        commandType: input.commandType,
        targetType: "document",
        targetId: scopedTargetId(input),
        idempotencyKey: input.idempotencyKey,
        payloadDigest: input.payloadDigest,
        expiresAt: this.expiry(now),
      }, "DOCUMENT_JOB_SCHEDULING_FAILED");
      throw error;
    }
  }

  private expiry(now = this.clock.now()): Date {
    return new Date(now.getTime() + 86_400_000);
  }
}

function eventFor(
  input: DocumentScheduleInput,
  job: DurableJob,
  occurredAt: Date,
): OutboxEvent {
  return {
    eventId: `documents-${job.jobId}`,
    tenantId: input.context.tenantId,
    workspaceId: input.context.workspaceId,
    dealId: input.context.dealId,
    aggregateType: "Document",
    aggregateId: input.documentId,
    aggregateVersion: input.expectedVersion,
    eventType: `${input.commandType}.requested`,
    schemaVersion: 1,
    payload: { jobId: job.jobId, documentId: input.documentId },
    correlationId: input.context.correlationId,
    occurredAt,
    availableAt: occurredAt,
  };
}

function parseStoredJobId(value: string | undefined): JobId {
  const parsed = parseJobId(value);
  if (parsed.ok) return parsed.value;
  throw new Error(
    `Stored document job reference "${value}" is invalid; expected a job_ identifier for idempotent replay.`,
  );
}

function scopedTargetId(input: DocumentScheduleInput): string {
  return `${input.scope.workspaceId}:${input.scope.dealId}:${input.documentId}`;
}

function defaultSourceProvider(): DocumentSourceProvider {
  const provider = sourceProviderMarker("disabled");
  return new FakeDocumentSourceProvider({
    provider,
    capabilities: createProviderCapabilities({
      provider,
      capabilities: ["list_documents"],
    }),
    pages: [],
  });
}
