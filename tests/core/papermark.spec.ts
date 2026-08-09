import { assertRejects, assertThrows } from "@std/assert";
import { PapermarkAdapter } from "../../src/core/vdr/papermark.ts";

Deno.test("legacy Papermark adapter is a fail-closed retirement shim", async () => {
  const adapter = new PapermarkAdapter();
  await assertRejects(
    () => adapter.listDocuments("room_legacy"),
    Error,
    "retired",
  );
  await assertRejects(
    () => adapter.downloadDocument("document_legacy"),
    Error,
    "retired",
  );
  await assertRejects(
    () => adapter.getDocumentMetadata("document_legacy"),
    Error,
    "retired",
  );
  await assertRejects(
    () => adapter.uploadDocument("document.pdf", new Uint8Array()),
    Error,
    "retired",
  );
  await assertRejects(
    () => adapter.downloadBatch("deal_legacy", "room_legacy"),
    Error,
    "retired",
  );
});

Deno.test("legacy Papermark adapter rejects credential and endpoint options", () => {
  assertThrows(
    () => new PapermarkAdapter({ apiKey: "inline-secret" } as never),
    Error,
    "retired",
  );
});
