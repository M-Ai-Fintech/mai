import {
  createProviderCapabilities,
  createProviderMarker,
  type NormalizedProviderError,
  normalizedProviderError,
  type ProviderCapabilities,
  type ProviderMarker,
} from "./source.ts";
import type { ByteSource } from "./checksum.ts";

export interface SourceDocument {
  readonly providerDocumentId?: string;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
  readonly providerFolderId?: string;
  readonly providerVersion?: string;
  readonly checksum?: { readonly algorithm: "sha256"; readonly value: string };
}

export interface SourceDocumentPage {
  readonly documents: readonly SourceDocument[];
  readonly nextCursor?: string;
  readonly providerVersion?: string;
}

export interface ListSourceDocumentsRequest {
  readonly providerWorkspaceId: string;
  readonly cursor?: string;
}

export interface DownloadSourceDocumentRequest {
  readonly providerWorkspaceId: string;
  readonly providerDocumentId: string;
}

export interface DocumentSourceProvider {
  readonly provider: ProviderMarker;
  discoverCapabilities(): Promise<ProviderCapabilities>;
  listDocuments(
    request: ListSourceDocumentsRequest,
  ): Promise<SourceDocumentPage>;
  downloadDocument(request: DownloadSourceDocumentRequest): Promise<ByteSource>;
}

export class DocumentProviderFailure extends Error {
  readonly failure: Pick<
    NormalizedProviderError,
    "code" | "message" | "retryable"
  >;

  constructor(
    failure: Pick<NormalizedProviderError, "code" | "message" | "retryable">,
  ) {
    super(failure.message);
    this.name = "DocumentProviderFailure";
    this.failure = failure;
  }
}

export class FakeDocumentSourceProvider implements DocumentSourceProvider {
  readonly provider: ProviderMarker;
  private readonly capabilitySet: ProviderCapabilities;
  private readonly pages: readonly SourceDocumentPage[];
  private readonly contents: Readonly<Record<string, Uint8Array>>;

  constructor(input: {
    readonly provider: ProviderMarker;
    readonly capabilities: ProviderCapabilities;
    readonly pages: readonly SourceDocumentPage[];
    readonly contents?: Readonly<Record<string, Uint8Array>>;
  }) {
    this.provider = input.provider;
    this.capabilitySet = createProviderCapabilities(input.capabilities);
    this.pages = input.pages;
    this.contents = input.contents ?? {};
  }

  discoverCapabilities(): Promise<ProviderCapabilities> {
    return Promise.resolve(this.capabilitySet);
  }

  listDocuments(
    request: ListSourceDocumentsRequest,
  ): Promise<SourceDocumentPage> {
    if (request.cursor === undefined) {
      return Promise.resolve(this.pages[0] ?? { documents: [] });
    }
    const index = Number(request.cursor.replace("page-", ""));
    return Promise.resolve(this.pages[index] ?? { documents: [] });
  }

  downloadDocument(
    request: DownloadSourceDocumentRequest,
  ): Promise<ByteSource> {
    const content = this.contents[request.providerDocumentId];
    if (content !== undefined) return Promise.resolve(Uint8Array.from(content));
    return Promise.reject(
      new DocumentProviderFailure({
        code: "NOT_FOUND",
        message:
          `Provider document "${request.providerDocumentId}" was not found.`,
        retryable: false,
      }),
    );
  }
}

export function normalizeProviderError(
  provider: ProviderMarker,
  operation: string,
  error: unknown,
): NormalizedProviderError {
  if (error instanceof DocumentProviderFailure) {
    return normalizedProviderError({
      code: error.failure.code,
      provider,
      operation,
      message: error.failure.message,
      retryable: error.failure.retryable,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return normalizedProviderError({
    code: providerErrorCode(message),
    provider,
    operation,
    message: "The document source provider operation failed.",
    retryable: providerErrorCode(message) === "UNAVAILABLE",
  });
}

function providerErrorCode(message: string): NormalizedProviderError["code"] {
  if (message.includes("401")) return "AUTHENTICATION_FAILED";
  if (message.includes("429")) return "RATE_LIMITED";
  if (message.includes("404")) return "NOT_FOUND";
  if (message.includes("400")) return "INVALID_REQUEST";
  if (/timeout|unavailable|network/i.test(message)) return "UNAVAILABLE";
  return "UNKNOWN";
}

export function sourceProviderMarker(value: string): ProviderMarker {
  return createProviderMarker(value);
}
