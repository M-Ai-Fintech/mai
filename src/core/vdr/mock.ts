import { BaseVDRProvider } from "./provider.ts";
import { VDRDocument } from "./types.ts";

export class MockVDRProvider extends BaseVDRProvider {
  private documents: Map<string, VDRDocument> = new Map();
  private contents: Map<string, Uint8Array> = new Map();

  listDocuments(folderId?: string): Promise<VDRDocument[]> {
    return Promise.resolve(
      Array.from(this.documents.values()).filter((doc) =>
        folderId ? doc.folderId === folderId : !doc.folderId
      ),
    );
  }

  downloadDocument(documentId: string): Promise<Uint8Array> {
    const content = this.contents.get(documentId);
    if (!content) {
      return Promise.reject(
        new Error(`Document ${documentId} content not found`),
      );
    }
    return Promise.resolve(content);
  }

  getDocumentMetadata(documentId: string): Promise<VDRDocument> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      return Promise.reject(new Error(`Document ${documentId} not found`));
    }
    return Promise.resolve(doc);
  }

  uploadDocument(
    name: string,
    content: Uint8Array,
    folderId?: string,
  ): Promise<VDRDocument> {
    const id = `mock-doc-${Date.now()}-${
      Math.random().toString(36).substring(7)
    }`;
    const doc = mockDocument(id, name, content.byteLength, folderId);
    this.documents.set(id, doc);
    this.contents.set(id, content);
    return Promise.resolve(doc);
  }
}

function mockDocument(
  id: string,
  name: string,
  size: number,
  folderId?: string,
): VDRDocument {
  const timestamp = new Date().toISOString();
  return {
    id,
    name,
    size,
    folderId,
    createdAt: timestamp,
    updatedAt: timestamp,
    mimeType: "application/octet-stream",
  };
}
