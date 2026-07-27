import { BaseVDRProvider } from "../provider.ts";
import {
  IntralinksDocumentSchema,
  SupergoodConfig,
  VDRDocument,
} from "../types.ts";
import { z } from "zod";
import {
  providerCollection,
  toIntralinksDocument,
} from "../provider_documents.ts";

export class IntralinksVDRProvider extends BaseVDRProvider {
  private targetBaseUrl = "https://api.intralinks.com/v2/exchanges";
  // Root folders are represented by an exchange in the Intralinks API.
  private readonly exchangeId = "default-exchange";

  constructor(config?: SupergoodConfig) {
    super(config, "Intralinks");
  }

  async listDocuments(folderId?: string): Promise<VDRDocument[]> {
    const url = folderId
      ? `${this.targetBaseUrl}/${this.exchangeId}/folders/${folderId}/documents`
      : `${this.targetBaseUrl}/${this.exchangeId}/documents`;
    return await this.runProviderOperation(
      "listDocuments",
      () => this.fetchDocuments(url),
    );
  }

  private async fetchDocuments(url: string): Promise<VDRDocument[]> {
    const response = await this.fetchThroughProxy(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    const payload: unknown = await response.json();
    const documents = z.array(IntralinksDocumentSchema).parse(
      providerCollection(payload, "documents"),
    );
    return documents.map(toIntralinksDocument);
  }

  async downloadDocument(documentId: string): Promise<Uint8Array> {
    const url =
      `${this.targetBaseUrl}/${this.exchangeId}/documents/${documentId}/download`;
    return await this.runProviderOperation("downloadDocument", async () => {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
      });
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    });
  }

  async getDocumentMetadata(documentId: string): Promise<VDRDocument> {
    const url =
      `${this.targetBaseUrl}/${this.exchangeId}/documents/${documentId}`;
    return await this.runProviderOperation("getDocumentMetadata", async () => {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      const document = IntralinksDocumentSchema.parse(await response.json());
      return toIntralinksDocument(document);
    });
  }

  async uploadDocument(
    name: string,
    content: Uint8Array,
    folderId?: string,
  ): Promise<VDRDocument> {
    const url = `${this.targetBaseUrl}/${this.exchangeId}/documents`;
    return await this.runProviderOperation("uploadDocument", async () => {
      const formData = this.uploadForm(name, content, "parentId", folderId);
      const response = await this.fetchThroughProxy(url, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" },
      });
      const document = IntralinksDocumentSchema.parse(await response.json());
      return toIntralinksDocument(document);
    });
  }
}
