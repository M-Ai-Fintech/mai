import { BaseVDRProvider } from "../provider.ts";
import {
  IDealsDocumentSchema,
  SupergoodConfig,
  VDRDocument,
} from "../types.ts";
import { z } from "zod";
import { providerCollection, toIDealsDocument } from "../provider_documents.ts";

export class IDealsVDRProvider extends BaseVDRProvider {
  private targetBaseUrl = "https://api.idealsvdr.com/v1";

  constructor(config?: SupergoodConfig) {
    super(config, "iDeals");
  }

  async listDocuments(folderId?: string): Promise<VDRDocument[]> {
    const url = folderId
      ? `${this.targetBaseUrl}/folders/${folderId}/files`
      : `${this.targetBaseUrl}/files`;

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
    // iDeals may wrap the document array in a "files" property.
    const documents = z.array(IDealsDocumentSchema).parse(
      providerCollection(payload, "files"),
    );
    return documents.map(toIDealsDocument);
  }

  async downloadDocument(documentId: string): Promise<Uint8Array> {
    const url = `${this.targetBaseUrl}/files/${documentId}/download`;
    return await this.runProviderOperation("downloadDocument", async () => {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
      });
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    });
  }

  async getDocumentMetadata(documentId: string): Promise<VDRDocument> {
    const url = `${this.targetBaseUrl}/files/${documentId}`;
    return await this.runProviderOperation("getDocumentMetadata", async () => {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      const document = IDealsDocumentSchema.parse(await response.json());
      return toIDealsDocument(document);
    });
  }

  async uploadDocument(
    name: string,
    content: Uint8Array,
    folderId?: string,
  ): Promise<VDRDocument> {
    const url = `${this.targetBaseUrl}/files`;
    return await this.runProviderOperation("uploadDocument", async () => {
      const formData = this.uploadForm(name, content, "folderId", folderId);
      const response = await this.fetchThroughProxy(url, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" },
      });
      const document = IDealsDocumentSchema.parse(await response.json());
      return toIDealsDocument(document);
    });
  }
}
