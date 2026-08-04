import {
  assertDocumentScope,
  type Document,
  type DocumentScope,
} from "./model.ts";
import type { DocumentSource } from "./source.ts";
import { createDocumentVersion, type DocumentVersion } from "./version.ts";
import type { DocumentVersionId, ObjectReferenceId } from "./ids.ts";
import { type ObjectStore, type UploadSession } from "./object_store.ts";
import {
  type ByteSource,
  checksumsEqual,
  collectAndChecksum,
} from "./checksum.ts";

export interface UploadCommand {
  readonly document: Document;
  readonly documentVersionId: DocumentVersionId;
  readonly versionNumber: number;
  readonly source: DocumentSource;
  readonly objectReferenceId: ObjectReferenceId;
  readonly objectKey: string;
  readonly storageVersion: string;
  readonly requestedAt: Date;
}

export interface ExistingVersionLookup {
  findExisting(input: {
    readonly source: DocumentSource;
    readonly checksum: { readonly algorithm: "sha256"; readonly value: string };
  }): Promise<DocumentVersion | undefined>;
  append(version: DocumentVersion): Promise<void>;
}

export interface DocumentUploadDependencies {
  readonly objectStore: ObjectStore;
  readonly versions: ExistingVersionLookup;
}

export interface DocumentUploadNegotiation {
  readonly command: UploadCommand;
  readonly session: UploadSession;
}

export type DocumentUploadResult =
  | {
    readonly status: "created";
    readonly version: DocumentVersion;
  }
  | {
    readonly status: "duplicate";
    readonly version: DocumentVersion;
  };

export class DocumentUploadService {
  constructor(private readonly dependencies: DocumentUploadDependencies) {}

  async negotiate(command: UploadCommand): Promise<DocumentUploadNegotiation> {
    assertDocumentScope(command.document.scope, command.source.scope);
    const session = await this.dependencies.objectStore.negotiateUpload({
      scope: command.document.scope,
      objectReferenceId: command.objectReferenceId,
      objectKey: command.objectKey,
      storageVersion: command.storageVersion,
      mediaType: command.document.mimeType,
      requestedAt: command.requestedAt,
    });
    return { command, session };
  }

  async complete(
    negotiation: DocumentUploadNegotiation,
    content: ByteSource,
  ): Promise<DocumentUploadResult> {
    const collected = await collectAndChecksum(content);
    const reference = await this.dependencies.objectStore.storeObject({
      session: negotiation.session,
      content: collected.bytes,
      checksum: collected.checksum,
      createdAt: negotiation.command.requestedAt,
    });
    const existing = await this.dependencies.versions.findExisting({
      source: negotiation.command.source,
      checksum: collected.checksum,
    });
    if (existing !== undefined) {
      await this.dependencies.objectStore.retainObject(reference);
      return { status: "duplicate", version: existing };
    }
    const version = createDocumentVersion({
      documentVersionId: negotiation.command.documentVersionId,
      documentId: negotiation.command.document.documentId,
      scope: negotiation.command.document.scope,
      versionNumber: negotiation.command.versionNumber,
      source: negotiation.command.source,
      provider: negotiation.command.source.provider,
      checksum: collected.checksum,
      classification: negotiation.command.document.classification,
      objectReference: reference,
      createdAt: negotiation.command.requestedAt,
    });
    await this.dependencies.versions.append(version);
    return { status: "created", version };
  }
}

export function assertUploadChecksum(
  expected: { readonly algorithm: "sha256"; readonly value: string },
  actual: { readonly algorithm: "sha256"; readonly value: string },
): void {
  if (checksumsEqual(expected, actual)) return;
  throw new Error(
    `Upload checksum "${actual.value}" did not match expected "${expected.value}".`,
  );
}

export type UploadScope = DocumentScope;
