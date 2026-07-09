import { BaseVDRProvider } from "../provider.ts";
import { VDRDocument, IntralinksDocumentSchema, SupergoodConfig } from "../types.ts";
import { z } from "npm:zod";

export class IntralinksVDRProvider extends BaseVDRProvider {
  private targetBaseUrl = "https://api.intralinks.com/v2/exchanges";

  constructor(config?: SupergoodConfig) {
    super(config);
  }

  private handleError(operation: string, error: any): never {
    const msg = error.message || "";
    if (msg.includes("HTTP error 401")) {
      throw new Error(`Intralinks API Error: Authentication expired or invalid credentials (401).`);
    }
    if (msg.includes("HTTP error 429")) {
      throw new Error(`Intralinks API Error: Rate limit exceeded (429). Please try again later.`);
    }
    throw new Error(`IntralinksVDRProvider ${operation} failed: ${msg}`);
  }
  async listDocuments(folderId?: string): Promise<VDRDocument[]> {
    // Intralinks usually maps root folder as exchangeId. Let's assume folderId = "exchangeId/folderId" or just "folderId".
    // For simplicity, let's assume we list documents under a specific workspace or exchange.
    const exchangeId = "default-exchange"; // Or could be passed in config/constructor
    const url = folderId 
      ? `${this.targetBaseUrl}/${exchangeId}/folders/${folderId}/documents`
      : `${this.targetBaseUrl}/${exchangeId}/documents`;
    
    try {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      const data = await response.json();
      const intralinksDocs = z.array(IntralinksDocumentSchema).parse(data.documents || data);

      return intralinksDocs.map(doc => ({
        id: doc.id.toString(),
        name: doc.name,
        size: doc.size,
        mimeType: doc.mimeType,
        folderId: doc.parentId?.toString(),
        createdAt: doc.createdOn,
        updatedAt: doc.modifiedOn,
      }));
    } catch (error: any) {
      this.handleError("listDocuments", error);
    }
  }

  async downloadDocument(documentId: string): Promise<Uint8Array> {
    const exchangeId = "default-exchange";
    const url = `${this.targetBaseUrl}/${exchangeId}/documents/${documentId}/download`;
    try {
      const response = await this.fetchThroughProxy(url, {
        method: "GET"
      });
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error: any) {
      this.handleError("downloadDocument", error);
    }
  }

  async getDocumentMetadata(documentId: string): Promise<VDRDocument> {
    const exchangeId = "default-exchange";
    const url = `${this.targetBaseUrl}/${exchangeId}/documents/${documentId}`;
    try {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();
      const doc = IntralinksDocumentSchema.parse(data);
      return {
        id: doc.id.toString(),
        name: doc.name,
        size: doc.size,
        mimeType: doc.mimeType,
        folderId: doc.parentId?.toString(),
        createdAt: doc.createdOn,
        updatedAt: doc.modifiedOn,
      };
    } catch (error: any) {
      this.handleError("getDocumentMetadata", error);
    }
  }

  async uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument> {
    const exchangeId = "default-exchange";
    const url = `${this.targetBaseUrl}/${exchangeId}/documents`;
    try {
      const formData = new FormData();
      formData.append("file", new Blob([content as any]), name);
      if (folderId) {
        formData.append("parentId", folderId);
      }

      const response = await this.fetchThroughProxy(url, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();
      const doc = IntralinksDocumentSchema.parse(data);
      return {
        id: doc.id.toString(),
        name: doc.name,
        size: doc.size,
        mimeType: doc.mimeType,
        folderId: doc.parentId?.toString(),
        createdAt: doc.createdOn,
        updatedAt: doc.modifiedOn,
      };
    } catch (error: any) {
      this.handleError("uploadDocument", error);
    }
  }
}
