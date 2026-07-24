import { VDRDocument, SupergoodConfig } from "./types.ts";

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
  uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument>;
}

/**
 * Base class that injects the Supergood proxy into VDR calls.
 */
export abstract class BaseVDRProvider implements VDRProvider {
  protected supergoodConfig?: SupergoodConfig;

  /**
   * @param config Supergood proxy settings. Calls can be made locally or directly when omitted.
   */
  constructor(config?: SupergoodConfig) {
    this.supergoodConfig = config;
  }

  /**
   * Formats the URL and injects Supergood headers into the `fetch` request.
   * Routes through the Supergood proxy when enabled.
   * 
   * @param targetUrl Final URL at the target VDR provider.
   * @param init Additional request parameters (method, body, headers).
   */
  protected async fetchThroughProxy(targetUrl: string, init?: RequestInit): Promise<Response> {
    let url = targetUrl;
    const headers = new Headers(init?.headers);

    if (this.supergoodConfig) {
      if (this.supergoodConfig.proxyUrl) {
        // Send to Supergood instead of the target URL and pass the destination in a custom header.
        url = this.supergoodConfig.proxyUrl;
        headers.set("x-supergood-target-url", targetUrl);
      }

      if (this.supergoodConfig.apiKey) {
        headers.set("x-supergood-api-key", this.supergoodConfig.apiKey);
      }

      if (this.supergoodConfig.clientId) {
        headers.set("x-supergood-client-id", this.supergoodConfig.clientId);
      }
    }

    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} from VDR proxy/provider: ${response.statusText}`);
    }

    return response;
  }

  abstract listDocuments(folderId?: string): Promise<VDRDocument[]>;
  abstract downloadDocument(documentId: string): Promise<Uint8Array>;
  abstract getDocumentMetadata(documentId: string): Promise<VDRDocument>;
  abstract uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument>;
}
