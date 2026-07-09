import { BaseVDRProvider } from "../provider.ts";
import { VDRDocument, IDealsDocumentSchema, SupergoodConfig } from "../types.ts";
import { z } from "npm:zod";

export class IDealsVDRProvider extends BaseVDRProvider {
  private targetBaseUrl = "https://api.idealsvdr.com/v1";

  constructor(config?: SupergoodConfig) {
    super(config);
  }

  private handleError(operation: string, error: any): never {
    const msg = error.message || "";
    if (msg.includes("HTTP error 401")) {
      throw new Error(`iDeals API Error: Authentication expired or invalid credentials (401).`);
    }
    if (msg.includes("HTTP error 429")) {
      throw new Error(`iDeals API Error: Rate limit exceeded (429). Please try again later.`);
    }
    throw new Error(`IDealsVDRProvider ${operation} failed: ${msg}`);
  }
  async listDocuments(folderId?: string): Promise<VDRDocument[]> {
    const url = folderId 
      ? `${this.targetBaseUrl}/folders/${folderId}/files`
      : `${this.targetBaseUrl}/files`;
    
    try {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      const data = await response.json();
      
      // Assume array of ideals documents
      const idealsDocs = z.array(IDealsDocumentSchema).parse(data.files || data);

      return idealsDocs.map(doc => ({
        id: doc.FileId.toString(),
        name: doc.FileName,
        size: doc.FileSize,
        mimeType: doc.MimeType,
        folderId: doc.FolderId?.toString(),
        createdAt: doc.CreationDate,
        updatedAt: doc.LastModified,
      }));
    } catch (error: any) {
      this.handleError("listDocuments", error);
    }
  }

  async downloadDocument(documentId: string): Promise<Uint8Array> {
    const url = `${this.targetBaseUrl}/files/${documentId}/download`;
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
    const url = `${this.targetBaseUrl}/files/${documentId}`;
    try {
      const response = await this.fetchThroughProxy(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();
      const doc = IDealsDocumentSchema.parse(data);
      return {
        id: doc.FileId.toString(),
        name: doc.FileName,
        size: doc.FileSize,
        mimeType: doc.MimeType,
        folderId: doc.FolderId?.toString(),
        createdAt: doc.CreationDate,
        updatedAt: doc.LastModified,
      };
    } catch (error: any) {
      this.handleError("getDocumentMetadata", error);
    }
  }

  async uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument> {
    const url = `${this.targetBaseUrl}/files`;
    try {
      const formData = new FormData();
      formData.append("file", new Blob([content as any]), name);
      if (folderId) {
        formData.append("folderId", folderId);
      }

      const response = await this.fetchThroughProxy(url, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();
      const doc = IDealsDocumentSchema.parse(data);
      return {
        id: doc.FileId.toString(),
        name: doc.FileName,
        size: doc.FileSize,
        mimeType: doc.MimeType,
        folderId: doc.FolderId?.toString(),
        createdAt: doc.CreationDate,
        updatedAt: doc.LastModified,
      };
    } catch (error: any) {
      this.handleError("uploadDocument", error);
    }
  }
}
