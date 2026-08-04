import type {
  JobAuditAppendPort,
  JobExecutionContext,
  JobFailurePolicy,
  JobInputVersionChecker,
  JobWorkerOutcome,
  JobWorkerStore,
  JobWorkerTransactions,
} from "../platform/jobs/v1.ts";
import {
  type ClaimedJob,
  type JobExecutor,
  JobWorker,
} from "../platform/jobs/v1.ts";
import type { Clock } from "../platform/persistence/v1.ts";
import type { ByteSource } from "./checksum.ts";
import type { DocumentVersion } from "./version.ts";
import { createDerivedArtifact, type DerivedArtifact } from "./processing.ts";
import type { DocumentScope, ObjectReference } from "./model.ts";
import type { DocumentVersionId } from "./ids.ts";
import { parseDocumentVersionId } from "./ids.ts";
import type { ObjectStore } from "./object_store.ts";

export interface ExactDocumentVersionReader {
  findExact(
    scope: DocumentScope,
    documentVersionId: DocumentVersionId,
  ): Promise<DocumentVersion | undefined>;
}

export class ExactDocumentVersionChecker implements JobInputVersionChecker {
  constructor(private readonly versions: ExactDocumentVersionReader) {}

  async recheck(job: ClaimedJob): Promise<boolean> {
    const reference = job.inputVersionReferences[0];
    if (
      reference === undefined ||
      reference.aggregateType !== "DocumentVersion" ||
      job.workspaceId === undefined || job.dealId === undefined
    ) {
      return false;
    }
    const documentVersionId = parseDocumentVersionId(reference.aggregateId);
    if (!documentVersionId.ok) return false;
    const version = await this.versions.findExact(
      {
        tenantId: job.tenantId,
        workspaceId: job.workspaceId,
        dealId: job.dealId,
      },
      documentVersionId.value,
    );
    return version !== undefined && version.versionNumber === reference.version;
  }
}

export interface DocumentArtifactDraft {
  readonly derivedArtifactId: DerivedArtifact["derivedArtifactId"];
  readonly artifactVersion: number;
  readonly artifactType: string;
  readonly objectReference: ObjectReference;
  readonly processor: string;
  readonly processorVersion: string;
  readonly createdAt: Date;
}

export interface DocumentProcessor {
  process(
    version: DocumentVersion,
    content: ByteSource,
  ): Promise<DocumentArtifactDraft>;
}

export interface DerivedArtifactSink {
  append(artifact: DerivedArtifact): Promise<void>;
}

export class DocumentProcessingExecutor implements JobExecutor {
  constructor(
    private readonly versions: ExactDocumentVersionReader,
    private readonly objectStore: ObjectStore,
    private readonly processor: DocumentProcessor,
    private readonly artifacts: DerivedArtifactSink,
  ) {}

  async execute(
    job: ClaimedJob,
    context: JobExecutionContext,
  ): Promise<{ readonly resultReference: string }> {
    const version = await this.loadVersion(job);
    await context.beforeExternalEffect();
    const content = await this.objectStore.readObject(version.objectReference);
    const draft = await this.processor.process(version, content);
    const artifact = createDerivedArtifact({
      derivedArtifactId: draft.derivedArtifactId,
      scope: version.scope,
      documentVersionId: version.documentVersionId,
      artifactVersion: draft.artifactVersion,
      artifactType: draft.artifactType,
      objectReferenceId: draft.objectReference.objectReferenceId,
      checksum: draft.objectReference.checksum,
      processor: draft.processor,
      processorVersion: draft.processorVersion,
      createdAt: draft.createdAt,
    });
    await this.artifacts.append(artifact);
    return { resultReference: artifact.derivedArtifactId };
  }

  private async loadVersion(job: ClaimedJob): Promise<DocumentVersion> {
    const reference = job.inputVersionReferences[0];
    if (
      reference === undefined ||
      reference.aggregateType !== "DocumentVersion" ||
      job.workspaceId === undefined || job.dealId === undefined
    ) {
      throw new Error(
        `Document job "${job.jobId}" has no exact version scope; expected tenant/workspace/deal input reference.`,
      );
    }
    const documentVersionId = parseDocumentVersionId(reference.aggregateId);
    if (!documentVersionId.ok) {
      throw new Error(
        `Document job "${job.jobId}" referenced version "${reference.aggregateId}"; expected a docver_ identifier.`,
      );
    }
    const version = await this.versions.findExact(
      {
        tenantId: job.tenantId,
        workspaceId: job.workspaceId,
        dealId: job.dealId,
      },
      documentVersionId.value,
    );
    if (version !== undefined && version.versionNumber === reference.version) {
      return version;
    }
    throw new Error(
      `STALE_DOCUMENT_VERSION: job "${job.jobId}" referenced "${reference.aggregateId}" version "${reference.version}"; expected the exact immutable version.`,
    );
  }
}

export interface DocumentProcessingWorkerDependencies {
  readonly transactions: JobWorkerTransactions;
  readonly store: JobWorkerStore;
  readonly versions: ExactDocumentVersionReader;
  readonly objectStore: ObjectStore;
  readonly processor: DocumentProcessor;
  readonly artifacts: DerivedArtifactSink;
  readonly clock: Clock;
  readonly failurePolicy: JobFailurePolicy;
  readonly audit: JobAuditAppendPort;
}

export class DocumentProcessingWorker {
  private readonly worker: JobWorker;

  constructor(dependencies: DocumentProcessingWorkerDependencies) {
    const checker: JobInputVersionChecker = new ExactDocumentVersionChecker(
      dependencies.versions,
    );
    const executor: JobExecutor = new DocumentProcessingExecutor(
      dependencies.versions,
      dependencies.objectStore,
      dependencies.processor,
      dependencies.artifacts,
    );
    this.worker = new JobWorker({
      transactions: dependencies.transactions,
      store: dependencies.store,
      executor,
      versions: checker,
      clock: dependencies.clock,
      failurePolicy: dependencies.failurePolicy,
      audit: dependencies.audit,
    });
  }

  executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<JobWorkerOutcome> {
    return this.worker.executeOne(workerId, leaseMilliseconds);
  }
}
