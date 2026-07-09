import { assertEquals } from "@std/assert";
import { PapermarkAdapter } from "../../src/core/vdr/papermark.ts";

Deno.test("PapermarkAdapter", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalMkdir = Deno.mkdir;
  const originalWriteFile = Deno.writeFile;

  let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  let fileWrites: Record<string, Uint8Array> = {};
  let dirsCreated: string[] = [];

  globalThis.fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = input.toString();
    fetchCalls.push({ url, init });

    if (url.includes("/v1/rooms/room1/documents")) {
      return Promise.resolve(new Response(JSON.stringify({
        documents: [
          { id: "doc1", name: "contract.pdf", size: 1024, mimeType: "application/pdf" },
          { id: "doc2", name: "financials.xlsx", size: 2048, mimeType: "application/vnd.ms-excel" }
        ]
      })));
    }

    if (url.includes("/v1/documents/doc1/download") || url.includes("/v1/documents/doc2/download")) {
      return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
    }

    if (url.includes("/v1/documents/doc1")) {
      return Promise.resolve(new Response(JSON.stringify({
        id: "doc1", name: "contract.pdf", size: 1024, mimeType: "application/pdf"
      })));
    }

    if (url.includes("/v1/documents") && init?.method === "POST") {
      return Promise.resolve(new Response(JSON.stringify({
        id: "newDoc", name: "upload.pdf", size: 500, mimeType: "application/pdf"
      })));
    }

    return Promise.resolve(new Response("Not Found", { status: 404 }));
  };

  Deno.mkdir = (path: string | URL, _options?: Deno.MkdirOptions): Promise<void> => {
    dirsCreated.push(path.toString());
    return Promise.resolve();
  };

  Deno.writeFile = (path: string | URL, data: Uint8Array | ReadableStream<Uint8Array>, _options?: Deno.WriteFileOptions): Promise<void> => {
    if (data instanceof Uint8Array) {
      fileWrites[path.toString()] = data;
    }
    return Promise.resolve();
  };

  const adapter = new PapermarkAdapter({
    apiKey: "test-key",
    apiUrl: "https://test.papermark.io"
  });

  await t.step("listDocuments", async () => {
    fetchCalls = [];
    const docs = await adapter.listDocuments("room1");
    assertEquals(docs.length, 2);
    assertEquals(docs[0].id, "doc1");
    assertEquals(fetchCalls[0].url, "https://test.papermark.io/v1/rooms/room1/documents");
    
    // Check headers
    const headers = new Headers(fetchCalls[0].init?.headers);
    assertEquals(headers.get("Authorization"), "Bearer test-key");
  });

  await t.step("downloadDocument", async () => {
    fetchCalls = [];
    const data = await adapter.downloadDocument("doc1");
    assertEquals(data.length, 3);
    assertEquals(fetchCalls[0].url, "https://test.papermark.io/v1/documents/doc1/download");
  });

  await t.step("getDocumentMetadata", async () => {
    fetchCalls = [];
    const doc = await adapter.getDocumentMetadata("doc1");
    assertEquals(doc.id, "doc1");
    assertEquals(doc.name, "contract.pdf");
    assertEquals(fetchCalls[0].url, "https://test.papermark.io/v1/documents/doc1");
  });

  await t.step("uploadDocument", async () => {
    fetchCalls = [];
    const doc = await adapter.uploadDocument("upload.pdf", new Uint8Array([1, 2, 3]));
    assertEquals(doc.id, "newDoc");
    assertEquals(fetchCalls[0].url, "https://test.papermark.io/v1/documents");
    assertEquals(fetchCalls[0].init?.method, "POST");
  });

  await t.step("downloadBatch", async () => {
    fetchCalls = [];
    fileWrites = {};
    dirsCreated = [];

    await adapter.downloadBatch("deal123", "room1");
    
    assertEquals(fetchCalls.length, 3);
    assertEquals(dirsCreated.includes("./vdr_rooms/deal123"), true);
    assertEquals(Object.keys(fileWrites).length, 2);
    assertEquals(!!fileWrites["./vdr_rooms/deal123/contract.pdf"], true);
    assertEquals(!!fileWrites["./vdr_rooms/deal123/financials.xlsx"], true);
  });

  // Cleanup
  globalThis.fetch = originalFetch;
  Deno.mkdir = originalMkdir;
  Deno.writeFile = originalWriteFile;
});
