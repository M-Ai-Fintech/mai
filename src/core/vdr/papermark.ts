import { BaseVDRProvider } from "./provider.ts";
import { SupergoodConfig, VDRDocument } from "./types.ts";
import { z } from "zod";

export interface PapermarkConfig extends SupergoodConfig {
  apiUrl?: string;
}

export class PapermarkAdapter extends BaseVDRProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor(config?: PapermarkConfig) {
    super(config);
    this.apiKey = config?.apiKey || Deno.env.get("PAPERMARK_API_KEY") || "";
    this.apiUrl = config?.apiUrl || Deno.env.get("PAPERMARK_API_URL") ||
      "https://api.papermark.io";

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
    const payload: unknown = await response.json();
    return papermarkDocuments(payload).map((document) =>
      toPapermarkDocument(document, { folderId })
    );
  }

  async downloadDocument(documentId: string): Promise<Uint8Array> {
    const response = await this.fetchPapermark(
      `/v1/documents/${documentId}/download`,
    );
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async getDocumentMetadata(documentId: string): Promise<VDRDocument> {
    const response = await this.fetchPapermark(`/v1/documents/${documentId}`);
    return toPapermarkDocument(await response.json());
  }

  async uploadDocument(
    name: string,
    content: Uint8Array,
    folderId?: string,
  ): Promise<VDRDocument> {
    const formData = this.uploadForm(name, content, "folderId", folderId);
    const response = await this.fetchPapermark(`/v1/documents`, {
      method: "POST",
      body: formData,
    });
    return toPapermarkDocument(await response.json(), {
      name,
      size: content.length,
      mimeType: "application/octet-stream",
      folderId,
    });
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

interface PapermarkFallback {
  name?: string;
  size?: number;
  mimeType?: string;
  folderId?: string;
}

function papermarkDocuments(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const parsed = z.record(z.string(), z.unknown()).safeParse(payload);
  return parsed.success && Array.isArray(parsed.data.documents)
    ? parsed.data.documents
    : [];
}

function toPapermarkDocument(
  value: unknown,
  fallback: PapermarkFallback = {},
): VDRDocument {
  const document = z.record(z.string(), z.unknown()).parse(value);
  const timestamp = new Date().toISOString();
  return {
    id: String(document.id),
    name: String(
      document.name || document.title || fallback.name || "document",
    ),
    size: Number(document.size || fallback.size || 0),
    mimeType: String(
      document.mimeType || fallback.mimeType || "application/pdf",
    ),
    folderId: optionalString(document.folderId) ?? fallback.folderId,
    createdAt: String(document.createdAt || timestamp),
    updatedAt: String(document.updatedAt || timestamp),
  };
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}
