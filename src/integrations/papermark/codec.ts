import type { ProviderDocument, ProviderDocumentPage } from "../contracts.ts";

interface PapermarkDocumentPagePayload {
  readonly data: readonly unknown[];
  readonly next_cursor?: string | null;
}

/**
 * Decodes the documented Papermark v1 page and enforces folder isolation.
 *
 * @example decodePapermarkPage({ data: [document], next_cursor: null }, "folder_horizon")
 */
export function decodePapermarkPage(
  payload: unknown,
  expectedFolderId: string,
): ProviderDocumentPage {
  const page = parsePagePayload(payload);
  const documents = page.data.map((document) =>
    decodePapermarkDocument(document, expectedFolderId)
  );
  return Object.freeze({
    documents: Object.freeze(documents),
    ...(page.next_cursor == null ? {} : { nextCursor: page.next_cursor }),
  });
}

function parsePagePayload(value: unknown): PapermarkDocumentPagePayload {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error(
      "Papermark document response is malformed; expected an object with a data array.",
    );
  }
  if (
    value.next_cursor !== undefined &&
    value.next_cursor !== null &&
    typeof value.next_cursor !== "string"
  ) {
    throw new Error(
      "Papermark document response is malformed; expected next_cursor to be a string or null.",
    );
  }
  return value as unknown as PapermarkDocumentPagePayload;
}

function decodePapermarkDocument(
  value: unknown,
  expectedFolderId: string,
): ProviderDocument {
  if (!isRecord(value)) throw malformedDocument("object");
  const id = requiredString(value.id, "id");
  const name = requiredString(value.name, "name");
  const mimeType = requiredString(value.content_type, "content_type");
  const folderId = requiredString(value.folder_id, "folder_id");
  requiredString(value.created, "created");
  requiredString(value.updated_at, "updated_at");
  if (folderId !== expectedFolderId) {
    throw new Error(
      "Papermark document response is malformed; document folder does not match the bound folder; expected exact scope isolation; value=<redacted>.",
    );
  }
  return Object.freeze({
    providerDocumentId: id,
    name,
    mimeType,
    providerFolderId: folderId,
  });
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim() === value && value) {
    return value;
  }
  throw malformedDocument(field);
}

function malformedDocument(field: string): Error {
  return new Error(
    `Papermark document response is malformed; expected a non-empty ${field} field.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
