import { assertEquals } from "@std/assert";
import { PapermarkAdapter } from "../../src/core/vdr/papermark.ts";

interface FetchCall {
  readonly url: string;
  readonly init?: RequestInit;
}

interface DocumentFixture {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly mimeType: string;
}

class PapermarkTestHarness {
  readonly originalFetch = globalThis.fetch;
  readonly originalMkdir = Deno.mkdir;
  readonly originalWriteFile = Deno.writeFile;
  fetchCalls: FetchCall[] = [];
  fileWrites: Record<string, Uint8Array> = {};
  dirsCreated: string[] = [];

  install(): void {
    globalThis.fetch = this.fakeFetch;
    Deno.mkdir = this.fakeMkdir;
    Deno.writeFile = this.fakeWriteFile;
  }

  restore(): void {
    globalThis.fetch = this.originalFetch;
    Deno.mkdir = this.originalMkdir;
    Deno.writeFile = this.originalWriteFile;
  }

  resetFetchCalls(): void {
    this.fetchCalls = [];
  }

  resetBatchRecords(): void {
    this.fetchCalls = [];
    this.fileWrites = {};
    this.dirsCreated = [];
  }

  private fakeFetch = (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = input.toString();
    this.fetchCalls.push({ url, init });
    return Promise.resolve(this.responseFor(url, init));
  };

  private responseFor(url: string, init?: RequestInit): Response {
    if (url.includes("/v1/rooms/room1/documents")) {
      return jsonResponse({ documents: documentFixtures() });
    }
    if (url.includes("/download")) {
      return new Response(new Uint8Array([1, 2, 3]));
    }
    if (url.includes("/v1/documents/doc1")) {
      return jsonResponse(documentFixtures()[0]);
    }
    if (url.includes("/v1/documents") && init?.method === "POST") {
      return jsonResponse(uploadedDocumentFixture());
    }
    return new Response("Not Found", { status: 404 });
  }

  private fakeMkdir = (
    path: string | URL,
    _options?: Deno.MkdirOptions,
  ): Promise<void> => {
    this.dirsCreated.push(path.toString());
    return Promise.resolve();
  };

  private fakeWriteFile = (
    path: string | URL,
    content: Uint8Array | ReadableStream<Uint8Array>,
    _options?: Deno.WriteFileOptions,
  ): Promise<void> => {
    if (content instanceof Uint8Array) {
      this.fileWrites[path.toString()] = content;
    }
    return Promise.resolve();
  };
}

function documentFixtures(): DocumentFixture[] {
  return [
    {
      id: "doc1",
      name: "contract.pdf",
      size: 1024,
      mimeType: "application/pdf",
    },
    {
      id: "doc2",
      name: "financials.xlsx",
      size: 2048,
      mimeType: "application/vnd.ms-excel",
    },
  ];
}

function uploadedDocumentFixture(): DocumentFixture {
  return {
    id: "newDoc",
    name: "upload.pdf",
    size: 500,
    mimeType: "application/pdf",
  };
}

function jsonResponse(value: object): Response {
  return new Response(JSON.stringify(value));
}

function createAdapter(): PapermarkAdapter {
  return new PapermarkAdapter({
    apiKey: "test-key",
    apiUrl: "https://test.papermark.io",
  });
}

async function listDocumentsStep(
  context: Deno.TestContext,
  harness: PapermarkTestHarness,
  adapter: PapermarkAdapter,
): Promise<void> {
  await context.step("listDocuments", async () => {
    harness.resetFetchCalls();
    const docs = await adapter.listDocuments("room1");
    assertEquals(docs.length, 2);
    assertEquals(docs[0].id, "doc1");
    assertEquals(
      harness.fetchCalls[0].url,
      "https://test.papermark.io/v1/rooms/room1/documents",
    );
    // Check headers
    const headers = new Headers(harness.fetchCalls[0].init?.headers);
    assertEquals(headers.get("Authorization"), "Bearer test-key");
  });
}

async function downloadDocumentStep(
  context: Deno.TestContext,
  harness: PapermarkTestHarness,
  adapter: PapermarkAdapter,
): Promise<void> {
  await context.step("downloadDocument", async () => {
    harness.resetFetchCalls();
    const data = await adapter.downloadDocument("doc1");
    assertEquals(data.length, 3);
    assertEquals(
      harness.fetchCalls[0].url,
      "https://test.papermark.io/v1/documents/doc1/download",
    );
  });
}

async function metadataStep(
  context: Deno.TestContext,
  harness: PapermarkTestHarness,
  adapter: PapermarkAdapter,
): Promise<void> {
  await context.step("getDocumentMetadata", async () => {
    harness.resetFetchCalls();
    const doc = await adapter.getDocumentMetadata("doc1");
    assertEquals(doc.id, "doc1");
    assertEquals(doc.name, "contract.pdf");
    assertEquals(
      harness.fetchCalls[0].url,
      "https://test.papermark.io/v1/documents/doc1",
    );
  });
}

async function uploadDocumentStep(
  context: Deno.TestContext,
  harness: PapermarkTestHarness,
  adapter: PapermarkAdapter,
): Promise<void> {
  await context.step("uploadDocument", async () => {
    harness.resetFetchCalls();
    const bytes = new Uint8Array([1, 2, 3]);
    const doc = await adapter.uploadDocument("upload.pdf", bytes);
    assertEquals(doc.id, "newDoc");
    assertEquals(
      harness.fetchCalls[0].url,
      "https://test.papermark.io/v1/documents",
    );
    assertEquals(harness.fetchCalls[0].init?.method, "POST");
  });
}

async function downloadBatchStep(
  context: Deno.TestContext,
  harness: PapermarkTestHarness,
  adapter: PapermarkAdapter,
): Promise<void> {
  await context.step("downloadBatch", async () => {
    harness.resetBatchRecords();
    await adapter.downloadBatch("deal123", "room1");
    assertEquals(harness.fetchCalls.length, 3);
    assertEquals(harness.dirsCreated.includes("./vdr_rooms/deal123"), true);
    assertDownloadedBatchFiles(harness.fileWrites);
  });
}

function assertDownloadedBatchFiles(
  fileWrites: Record<string, Uint8Array>,
): void {
  assertEquals(Object.keys(fileWrites).length, 2);
  assertEquals(!!fileWrites["./vdr_rooms/deal123/contract.pdf"], true);
  assertEquals(!!fileWrites["./vdr_rooms/deal123/financials.xlsx"], true);
}

async function runPapermarkSteps(
  context: Deno.TestContext,
  harness: PapermarkTestHarness,
  adapter: PapermarkAdapter,
): Promise<void> {
  await listDocumentsStep(context, harness, adapter);
  await downloadDocumentStep(context, harness, adapter);
  await metadataStep(context, harness, adapter);
  await uploadDocumentStep(context, harness, adapter);
  await downloadBatchStep(context, harness, adapter);
}

Deno.test("PapermarkAdapter", async (context) => {
  const harness = new PapermarkTestHarness();
  harness.install();
  try {
    await runPapermarkSteps(context, harness, createAdapter());
  } finally {
    // Cleanup
    harness.restore();
  }
});
