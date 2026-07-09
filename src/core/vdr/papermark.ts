import { BaseVDRProvider } from "./provider.ts";
import { VDRDocument, SupergoodConfig } from "./types.ts";

export interface PapermarkConfig extends SupergoodConfig {
  apiUrl?: string;
}

export class PapermarkAdapter extends BaseVDRProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor(config?: PapermarkConfig) {
    super(config);
    this.apiKey = Deno.env.get("PAPERMARK_API_KEY") || config?.apiKey || "";
    this.apiUrl = config?.apiUrl || Deno.env.get("PAPERMARK_API_URL") || "https://api.papermark.io";
    
    if (!this.apiKey && Deno.env.get("DENO_ENV") !== "test") {
      console.warn("PAPERMARK_API_KEY is not set.");
    }
  }

  private fetchPapermark(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.apiUrl}${path}`;
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    return this.fetchThroughProxy(url, { ...init, headers });
  }

  async listDocuments(folderId?: string): Promise<VDRDocument[]> {
    const path = folderId ? `/v1/rooms/${folderId}/documents` : `/v1/documents`;
    const response = await this.fetchPapermark(path);
    const data = await response.json();
    
    const docs = Array.isArray(data.documents) ? data.documents : Array.isArray(data) ? data : [];
    
    return docs.map((doc: Record<string, unknown>) => ({
      id: String(doc.id),
      name: String(doc.name || doc.title || "document"),
      size: Number(doc.size || 0),
      mimeType: String(doc.mimeType || "application/pdf"),
      folderId: doc.folderId ? String(doc.folderId) : folderId,
      createdAt: String(doc.createdAt || new Date().toISOString()),
      updatedAt: String(doc.updatedAt || new Date().toISOString()),
    }));
  }

  async downloadDocument(documentId: string): Promise<Uint8Array> {
    const response = await this.fetchPapermark(`/v1/documents/${documentId}/download`);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async getDocumentMetadata(documentId: string): Promise<VDRDocument> {
    const response = await this.fetchPapermark(`/v1/documents/${documentId}`);
    const data = await response.json();
    return {
      id: data.id,
      name: data.name || data.title || "document",
      size: data.size || 0,
      mimeType: data.mimeType || "application/pdf",
      folderId: data.folderId,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  async uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument> {
    const formData = new FormData();
    formData.append("file", new Blob([content as unknown as BlobPart]), name);
    if (folderId) {
      formData.append("folderId", folderId);
    }

    const response = await this.fetchPapermark(`/v1/documents`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    return {
      id: data.id,
      name: data.name || name,
      size: data.size || content.length,
      mimeType: data.mimeType || "application/octet-stream",
      folderId: data.folderId,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  async downloadBatch(dealId: string, dataRoomId: string): Promise<void> {
    const documents = await this.listDocuments(dataRoomId);
    
    const outputDir = `./vdr_rooms/${dealId}`;
    await Deno.mkdir(outputDir, { recursive: true });

    for (const doc of documents) {
      const content = await this.downloadDocument(doc.id);
      // Clean up the name to avoid issues, fallback if none
      const cleanName = doc.name.replace(/[^a-zA-Z0-9.\-_]/g, "_") || "doc.pdf";
      const filePath = `${outputDir}/${cleanName}`;
      await Deno.writeFile(filePath, content);
    }
  }
}
