import type { DocumentSource } from "./source.ts";
import {
  type DocumentSourceProvider,
  normalizeProviderError,
  type SourceDocument,
} from "./source_provider.ts";
import type { NormalizedProviderError } from "./source.ts";
import type { DocumentUploadService, UploadCommand } from "./upload.ts";

export interface SourceSyncResult {
  readonly created: number;
  readonly duplicates: number;
  readonly skipped: number;
  readonly failures: readonly NormalizedProviderError[];
  readonly cursor?: string;
  readonly providerVersion?: string;
}

export interface SourceSyncDependencies {
  readonly provider: DocumentSourceProvider;
  readonly source: DocumentSource;
  readonly upload?: DocumentUploadService;
  readonly resolveUpload: (
    source: DocumentSource,
    document: SourceDocument,
  ) => Promise<UploadCommand | undefined>;
  readonly updateCursor: (
    cursor: string | undefined,
    providerVersion: string | undefined,
  ) => Promise<DocumentSource>;
}

export class DocumentSourceSyncService {
  constructor(private readonly dependencies: SourceSyncDependencies) {}

  async synchronize(): Promise<SourceSyncResult> {
    const page = await this.listPage();
    const result = await this.ingestPage(page.documents);
    if (page.nextCursor !== undefined) {
      await this.dependencies.updateCursor(
        page.nextCursor,
        page.providerVersion,
      );
    }
    return {
      ...result,
      cursor: page.nextCursor,
      providerVersion: page.providerVersion,
    };
  }

  private async listPage() {
    const providerWorkspaceId = this.dependencies.source.providerWorkspaceId;
    if (providerWorkspaceId === undefined) {
      throw new Error(
        `Document source "${this.dependencies.source.sourceId}" has no provider workspace ID; expected explicit source metadata.`,
      );
    }
    return await this.dependencies.provider.listDocuments({
      providerWorkspaceId,
      cursor: this.dependencies.source.cursor,
    });
  }

  private async ingestPage(documents: readonly SourceDocument[]): Promise<{
    readonly created: number;
    readonly duplicates: number;
    readonly skipped: number;
    readonly failures: readonly NormalizedProviderError[];
  }> {
    let created = 0;
    let duplicates = 0;
    let skipped = 0;
    const failures: NormalizedProviderError[] = [];
    for (const document of documents) {
      const outcome = await this.ingestDocument(document);
      if (outcome === "created") {
        created += 1;
      } else if (outcome === "duplicate") {
        duplicates += 1;
      } else {
        skipped += 1;
        if (typeof outcome !== "string") failures.push(outcome);
      }
    }
    return { created, duplicates, skipped, failures };
  }

  private async ingestDocument(
    document: SourceDocument,
  ): Promise<"created" | "duplicate" | "skipped" | NormalizedProviderError> {
    if (document.providerDocumentId === undefined) {
      return invalidProviderMetadata(this.dependencies.provider.provider);
    }
    if (this.dependencies.upload === undefined) {
      return invalidProviderMetadata(this.dependencies.provider.provider);
    }
    const command = await this.dependencies.resolveUpload(
      this.dependencies.source,
      document,
    );
    if (command === undefined) {
      return invalidProviderMetadata(this.dependencies.provider.provider);
    }
    try {
      const content = await this.dependencies.provider.downloadDocument({
        providerWorkspaceId: this.dependencies.source.providerWorkspaceId!,
        providerDocumentId: document.providerDocumentId,
      });
      return (await this.dependencies.upload.complete(
        await this.dependencies.upload.negotiate(command),
        content,
      )).status;
    } catch (error) {
      return normalizeProviderError(
        this.dependencies.provider.provider,
        "sync_document",
        error,
      );
    }
  }
}

function invalidProviderMetadata(
  provider: DocumentSourceProvider["provider"],
): NormalizedProviderError {
  return {
    code: "INVALID_PROVIDER_METADATA",
    provider,
    operation: "sync_document",
    message: "The provider document omitted required identity metadata.",
    retryable: false,
  };
}
