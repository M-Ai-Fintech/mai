import { assertEquals, assertThrows } from "@std/assert";
import { decodePapermarkPage } from "../../../src/integrations/papermark/codec.ts";

const dataRoomId = "dataroom_horizon";
const folderId = "folder_horizon";

Deno.test("Papermark codec retains data-room membership and document identities", () => {
  const page = decodePapermarkPage(
    {
      data: [document("membership_1", "document_1")],
      next_cursor: "cursor_2",
    },
    dataRoomId,
    folderId,
  );

  assertEquals(page.nextCursor, "cursor_2");
  assertEquals(page.documents[0].providerDataRoomDocumentId, "membership_1");
  assertEquals(page.documents[0].providerDocumentId, "document_1");
});

Deno.test("Papermark codec rejects cross-room membership records", () => {
  assertThrows(
    () =>
      decodePapermarkPage(
        {
          data: [{
            ...document("membership_1", "document_1"),
            dataroom_id: "dataroom_other",
          }],
          next_cursor: null,
        },
        dataRoomId,
        folderId,
      ),
    Error,
    "different data room",
  );
});

Deno.test("Papermark codec rejects team-library document payloads", () => {
  assertThrows(
    () =>
      decodePapermarkPage(
        {
          data: [{
            id: "document_1",
            name: "Contract.pdf",
            content_type: "application/pdf",
            folder_id: folderId,
            created: "2026-08-09T12:00:00.000Z",
          }],
          next_cursor: null,
        },
        dataRoomId,
        folderId,
      ),
    Error,
    "dataroom_document",
  );
});

Deno.test("Papermark codec rejects records outside the bound folder", () => {
  assertThrows(
    () =>
      decodePapermarkPage(
        {
          data: [document("membership_1", "document_1", "folder_other")],
          next_cursor: null,
        },
        dataRoomId,
        folderId,
      ),
    Error,
    "bound folder",
  );
});

function document(
  membershipId: string,
  documentId: string,
  documentFolderId = folderId,
): Record<string, string> {
  return {
    id: membershipId,
    object: "dataroom_document",
    document_id: documentId,
    document_name: "Contract.pdf",
    content_type: "application/pdf",
    folder_id: documentFolderId,
    created: "2026-08-09T12:00:00.000Z",
  };
}
