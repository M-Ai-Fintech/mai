import type { ProviderDocument, ProviderDocumentPage } from "../contracts.ts";

interface PapermarkDocumentPagePayload {
  readonly data: readonly unknown[];
  readonly next_cursor?: string | null;
}

/**
 * Decodes the documented Papermark dataroom page and enforces both bindings.
 *
 * @example decodePapermarkPage({ data: [document], next_cursor: null }, "dr_horizon", "folder_horizon")
 */
export function decodePapermarkPage(
  payload: unknown,
  expectedDataRoomId: string,
  expectedFolderId: string,
): ProviderDocumentPage {
  const page = parsePagePayload(payload);
  const documents = page.data.map((document) =>
    decodePapermarkDocument(document, expectedDataRoomId, expectedFolderId)
  );
  return Object.freeze({
    documents: Object.freeze(documents),
    ...(page.next_cursor == null ? {} : { nextCursor: page.next_cursor }),
  });
}

function parsePagePayload(value: unknown): PapermarkDocumentPagePayload {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error(
      "Papermark dataroom document response is malformed; expected an object with a data array.",
    );
  }
  if (
    value.next_cursor !== undefined &&
    value.next_cursor !== null &&
    typeof value.next_cursor !== "string"
  ) {
    throw new Error(
      "Papermark dataroom document response is malformed; expected next_cursor to be a string or null.",
    );
  }
  return value as unknown as PapermarkDocumentPagePayload;
}

function decodePapermarkDocument(
  value: unknown,
  expectedDataRoomId: string,
  expectedFolderId: string,
): ProviderDocument {
  if (!isRecord(value)) throw malformedDocument("object");
  assertDataroomMembership(value, expectedDataRoomId);
  const membershipId = requiredString(value.id, "id");
  const documentId = requiredString(value.document_id, "document_id");
  const name = requiredString(value.document_name, "document_name");
  const mimeType = requiredString(value.content_type, "content_type");
  const folderId = requiredString(value.folder_id, "folder_id");
  requiredString(value.created, "created");
  if (folderId !== expectedFolderId) {
    throw new Error(
      "Papermark dataroom document response is malformed; document folder does not match the bound folder; expected exact scope isolation; value=<redacted>.",
    );
  }
  return Object.freeze({
    providerDataRoomDocumentId: membershipId,
    providerDocumentId: documentId,
    name,
    mimeType,
    providerFolderId: folderId,
  });
}

function assertDataroomMembership(
  value: Record<string, unknown>,
  expectedDataRoomId: string,
): void {
  const reportedId = firstOptionalString(value, [
    "dataroom_id",
    "data_room_id",
    "dataroomId",
  ]);
  if (reportedId !== undefined && reportedId !== expectedDataRoomId) {
    throw new Error(
      "Papermark dataroom document response is malformed; document belongs to a different data room; expected exact scope isolation; value=<redacted>.",
    );
  }
  if (value.object !== "dataroom_document") {
    throw malformedDocument("object=dataroom_document");
  }
}

function firstOptionalString(
  value: Record<string, unknown>,
  fields: readonly string[],
): string | undefined {
  for (const field of fields) {
    if (value[field] === undefined || value[field] === null) continue;
    return requiredString(value[field], field);
  }
  return undefined;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim() === value && value) {
    return value;
  }
  throw malformedDocument(field);
}

function malformedDocument(field: string): Error {
  return new Error(
    `Papermark dataroom document response is malformed; expected a non-empty ${field} field.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
