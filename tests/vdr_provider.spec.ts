import { assertEquals, assertRejects } from "@std/assert";
import { MockVDRProvider } from "../src/core/vdr/mock.ts";
import { BaseVDRProvider } from "../src/core/vdr/provider.ts";
import type { VDRDocument } from "../src/core/vdr/types.ts";

class TestVDRProvider extends BaseVDRProvider {
  protected readonly providerName = "Test VDR";

  testFetchThroughProxy(
    targetUrl: string,
    init?: RequestInit,
  ): Promise<Response> {
    return this.fetchThroughProxy(targetUrl, init);
  }

  listDocuments(_folderId?: string): Promise<VDRDocument[]> {
    return Promise.resolve([]);
  }

  downloadDocument(_documentId: string): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array());
  }

  getDocumentMetadata(_documentId: string): Promise<VDRDocument> {
    return Promise.reject(new Error("Method not implemented."));
  }

  uploadDocument(
    _name: string,
    _content: Uint8Array,
    _folderId?: string,
  ): Promise<VDRDocument> {
    return Promise.reject(new Error("Method not implemented."));
  }
}

class RecordingFetch {
  interceptedUrl = "";
  interceptedHeaders = new Headers();

  fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    this.interceptedUrl = input.toString();
    this.interceptedHeaders = new Headers(init?.headers);
    return Promise.resolve(new Response("ok", { status: 200 }));
  };
}

async function withFetch(
  replacement: typeof globalThis.fetch,
  test: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = replacement;
  try {
    await test();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function assertProxyHeaders(recordingFetch: RecordingFetch): void {
  assertEquals(recordingFetch.interceptedUrl, "https://proxy.supergood.local");
  assertEquals(
    recordingFetch.interceptedHeaders.get("x-supergood-target-url"),
    "https://target-vdr.com/api/docs",
  );
  assertEquals(
    recordingFetch.interceptedHeaders.get("x-supergood-api-key"),
    "test-api-key",
  );
  assertEquals(
    recordingFetch.interceptedHeaders.get("x-supergood-client-id"),
    "test-client-id",
  );
}

Deno.test("BaseVDRProvider injects Supergood proxy headers", async () => {
  const fakeFetch = new RecordingFetch();
  const provider = new TestVDRProvider({
    apiKey: "test-api-key",
    clientId: "test-client-id",
    proxyUrl: "https://proxy.supergood.local",
  });

  await withFetch(fakeFetch.fetch, async () => {
    await provider.testFetchThroughProxy("https://target-vdr.com/api/docs");
  });

  assertProxyHeaders(fakeFetch);
});

Deno.test("BaseVDRProvider calls target directly without config", async () => {
  const fakeFetch = new RecordingFetch();
  const provider = new TestVDRProvider();

  await withFetch(fakeFetch.fetch, async () => {
    await provider.testFetchThroughProxy("https://target-vdr.com/api/docs");
  });

  assertEquals(fakeFetch.interceptedUrl, "https://target-vdr.com/api/docs");
  assertEquals(fakeFetch.interceptedHeaders.has("x-supergood-api-key"), false);
  assertEquals(
    fakeFetch.interceptedHeaders.has("x-supergood-target-url"),
    false,
  );
});

Deno.test("BaseVDRProvider reports a failed HTTP response", async () => {
  const failedFetch = () =>
    Promise.resolve(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );

  await withFetch(failedFetch, async () => {
    const provider = new TestVDRProvider();
    await assertRejects(
      () => provider.testFetchThroughProxy("https://target-vdr.com/api/docs"),
      Error,
      "HTTP error 404 from VDR proxy/provider: Not Found",
    );
  });
});

Deno.test("MockVDRProvider stores and retrieves a document", async () => {
  const provider = new MockVDRProvider();
  const content = new TextEncoder().encode("Hello World");
  const document = await provider.uploadDocument(
    "test.txt",
    content,
    "folder-1",
  );

  assertEquals(document.name, "test.txt");
  assertEquals(document.folderId, "folder-1");
  const documents = await provider.listDocuments("folder-1");
  assertEquals(documents.map(({ id }) => id), [document.id]);
  const downloaded = await provider.downloadDocument(document.id);
  assertEquals(new TextDecoder().decode(downloaded), "Hello World");
  const metadata = await provider.getDocumentMetadata(document.id);
  assertEquals(metadata.name, "test.txt");
});
