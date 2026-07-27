import { SupergoodConfig, VDRDocument } from "./types.ts";
import { describeError } from "../../shared/errors.ts";

/**
 * Generic interface for Virtual Data Room (VDR) providers.
 */
export interface VDRProvider {
  /**
   * Lists documents in a specific folder, or at the root when omitted.
   */
  listDocuments(folderId?: string): Promise<VDRDocument[]>;

  /**
   * Downloads document content as a Uint8Array.
   */
  downloadDocument(documentId: string): Promise<Uint8Array>;

  /**
   * Returns document metadata.
   */
  getDocumentMetadata(documentId: string): Promise<VDRDocument>;

  /**
   * Uploads a new document.
   */
  uploadDocument(
    name: string,
    content: Uint8Array,
    folderId?: string,
  ): Promise<VDRDocument>;
}

/**
 * Base class that injects the Supergood proxy into VDR calls.
 */
export abstract class BaseVDRProvider implements VDRProvider {
  protected supergoodConfig?: SupergoodConfig;
  private readonly operationProviderName: string;

  /**
   * @param config Supergood proxy settings. Calls can be made locally or directly when omitted.
   */
  constructor(config?: SupergoodConfig, providerName?: string) {
    this.supergoodConfig = config;
    this.operationProviderName = providerName ?? this.constructor.name;
  }

  /**
   * Formats the URL and injects Supergood headers into the `fetch` request.
   * Routes through the Supergood proxy when enabled.
   *
   * @param targetUrl Final URL at the target VDR provider.
   * @param init Additional request parameters (method, body, headers).
   */
  protected async fetchThroughProxy(
    targetUrl: string,
    init?: RequestInit,
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    const url = this.proxyRequestUrl(targetUrl, headers);
    const response = await fetch(url, { ...init, headers });
    this.assertSuccessfulResponse(response, targetUrl);
    return response;
  }

  private proxyRequestUrl(targetUrl: string, headers: Headers): string {
    const config = this.supergoodConfig;
    if (!config) return targetUrl;
    if (config.apiKey) headers.set("x-supergood-api-key", config.apiKey);
    if (config.clientId) headers.set("x-supergood-client-id", config.clientId);
    if (!config.proxyUrl) return targetUrl;
    // The proxy receives the real destination through a dedicated header.
    headers.set("x-supergood-target-url", targetUrl);
    return config.proxyUrl;
  }

  private assertSuccessfulResponse(
    response: Response,
    targetUrl: string,
  ): void {
    if (response.ok) return;
    throw new Error(
      `HTTP error ${response.status} from VDR proxy/provider: ${response.statusText}; URL "${targetUrl}" expected a successful response`,
    );
  }

  protected async runProviderOperation<TResult>(
    operation: string,
    request: () => Promise<TResult>,
  ): Promise<TResult> {
    try {
      return await request();
    } catch (error: unknown) {
      throw this.providerError(operation, error);
    }
  }

  protected uploadForm(
    name: string,
    content: Uint8Array,
    folderField: string,
    folderId?: string,
  ): FormData {
    const form = new FormData();
    const bytes = Uint8Array.from(content);
    form.append("file", new Blob([bytes.buffer]), name);
    if (folderId) form.append(folderField, folderId);
    return form;
  }

  private providerError(operation: string, error: unknown): Error {
    const message = describeError(error);
    const providerName = this.providerLabel();
    if (message.includes("HTTP error 401")) {
      return new Error(
        `${providerName} ${operation} rejected credentials; expected a valid, unexpired API credential (HTTP 401).`,
      );
    }
    if (message.includes("HTTP error 429")) {
      return new Error(
        `${providerName} ${operation} exceeded its request quota; expected a request below the provider rate limit (HTTP 429).`,
      );
    }
    return new Error(
      `${providerName} ${operation} failed with "${message}"; expected a successful VDR response.`,
    );
  }

  private providerLabel(): string {
    const customLabel = Reflect.get(this, "providerName");
    return typeof customLabel === "string"
      ? customLabel
      : this.operationProviderName;
  }

  abstract listDocuments(folderId?: string): Promise<VDRDocument[]>;
  abstract downloadDocument(documentId: string): Promise<Uint8Array>;
  abstract getDocumentMetadata(documentId: string): Promise<VDRDocument>;
  abstract uploadDocument(
    name: string,
    content: Uint8Array,
    folderId?: string,
  ): Promise<VDRDocument>;
}
