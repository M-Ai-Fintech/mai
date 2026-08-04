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
import { parseDocumentId, parseDocumentVersionId } from "./ids.ts";
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
    const reference = documentVersionReference(job);
    if (reference === undefined) return false;
    const version = await this.versions.findExact(
      reference.scope,
      reference.documentVersionId,
    );
    return version !== undefined && sameScope(version.scope, reference.scope) &&
      version.documentId === reference.documentId &&
      version.versionNumber === reference.version;
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
    await context.beforeExternalEffect();
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
    const reference = documentVersionReference(job);
    if (reference === undefined) {
      throw new Error(
        `Document job "${job.jobId}" has no exact version scope; expected tenant/workspace/deal input reference.`,
      );
    }
    const version = await this.versions.findExact(
      reference.scope,
      reference.documentVersionId,
    );
    if (
      version !== undefined && sameScope(version.scope, reference.scope) &&
      version.documentId === reference.documentId &&
      version.versionNumber === reference.version
    ) {
      return version;
    }
    throw new Error(
      `STALE_DOCUMENT_VERSION: job "${job.jobId}" referenced "${reference.documentVersionId}" version "${reference.version}" for document "${reference.documentId}"; expected the exact immutable version in the authorized scope.`,
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
      allowedJobTypes: ["documents.process"],
    });
  }

  executeOne(
    workerId: string,
    leaseMilliseconds: number,
  ): Promise<JobWorkerOutcome> {
    return this.worker.executeOne(workerId, leaseMilliseconds);
  }
}

interface DocumentVersionJobReference {
  readonly scope: DocumentScope;
  readonly documentId: DocumentVersion["documentId"];
  readonly documentVersionId: DocumentVersionId;
  readonly version: DocumentVersion["versionNumber"];
}

function documentVersionReference(
  job: ClaimedJob,
): DocumentVersionJobReference | undefined {
  if (job.workspaceId === undefined || job.dealId === undefined) {
    return undefined;
  }
  const reference = job.inputVersionReferences[0];
  if (reference?.aggregateType !== "DocumentVersion") return undefined;
  const documentId = parseDocumentId(reference.documentId);
  const documentVersionId = parseDocumentVersionId(reference.aggregateId);
  if (!documentId.ok || !documentVersionId.ok) return undefined;
  return {
    scope: {
      tenantId: job.tenantId,
      workspaceId: job.workspaceId,
      dealId: job.dealId,
    },
    documentId: documentId.value,
    documentVersionId: documentVersionId.value,
    version: reference.version,
  };
}

function sameScope(left: DocumentScope, right: DocumentScope): boolean {
  return left.tenantId === right.tenantId &&
    left.workspaceId === right.workspaceId && left.dealId === right.dealId;
}
