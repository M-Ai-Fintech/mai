import { IDealsDocument, IntralinksDocument, VDRDocument } from "./types.ts";

export function providerCollection(payload: unknown, key: string): unknown {
  if (payload && typeof payload === "object" && key in payload) {
    return (payload as Record<string, unknown>)[key];
  }
  return payload;
}

export function toIDealsDocument(document: IDealsDocument): VDRDocument {
  return {
    id: document.FileId.toString(),
    name: document.FileName,
    size: document.FileSize,
    mimeType: document.MimeType,
    folderId: document.FolderId?.toString(),
    createdAt: document.CreationDate,
    updatedAt: document.LastModified,
  };
}

export function toIntralinksDocument(
  document: IntralinksDocument,
): VDRDocument {
  return {
    id: document.id.toString(),
    name: document.name,
    size: document.size,
    mimeType: document.mimeType,
    folderId: document.parentId?.toString(),
    createdAt: document.createdOn,
    updatedAt: document.modifiedOn,
  };
}
