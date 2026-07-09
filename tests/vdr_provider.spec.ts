import { assertEquals, assertRejects } from "jsr:@std/assert";
import { BaseVDRProvider } from "../src/core/vdr/provider.ts";
import { VDRDocument } from "../src/core/vdr/types.ts";
import { MockVDRProvider } from "../src/core/vdr/mock.ts";

class TestVDRProvider extends BaseVDRProvider {
  // Expose fetchThroughProxy for testing
  public testFetchThroughProxy(targetUrl: string, init?: RequestInit): Promise<Response> {
    return this.fetchThroughProxy(targetUrl, init);
  }

  listDocuments(_folderId?: string): Promise<VDRDocument[]> { return Promise.resolve([]); }
  downloadDocument(_documentId: string): Promise<Uint8Array> { return Promise.resolve(new Uint8Array()); }
  getDocumentMetadata(_documentId: string): Promise<VDRDocument> { return Promise.reject(new Error("Method not implemented.")); }
  uploadDocument(_name: string, _content: Uint8Array, _folderId?: string): Promise<VDRDocument> { return Promise.reject(new Error("Method not implemented.")); }
}

// Intercept global fetch for test assertions
const originalFetch = globalThis.fetch;

Deno.test("BaseVDRProvider should inject supergood headers and use proxy url", async () => {
  let interceptedUrl = "";
  let interceptedHeaders: Headers | undefined;

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    interceptedUrl = input.toString();
    interceptedHeaders = new Headers(init?.headers);
    return Promise.resolve(new Response("ok", { status: 200 }));
  };

  try {
    const provider = new TestVDRProvider({
      apiKey: "test-api-key",
      clientId: "test-client-id",
      proxyUrl: "https://proxy.supergood.local"
    });

    await provider.testFetchThroughProxy("https://target-vdr.com/api/docs");

    assertEquals(interceptedUrl, "https://proxy.supergood.local");
    assertEquals(interceptedHeaders?.get("x-supergood-target-url"), "https://target-vdr.com/api/docs");
    assertEquals(interceptedHeaders?.get("x-supergood-api-key"), "test-api-key");
    assertEquals(interceptedHeaders?.get("x-supergood-client-id"), "test-client-id");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("BaseVDRProvider should not inject headers if no config provided", async () => {
  let interceptedUrl = "";
  let interceptedHeaders: Headers | undefined;

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    interceptedUrl = input.toString();
    interceptedHeaders = new Headers(init?.headers);
    return Promise.resolve(new Response("ok", { status: 200 }));
  };

  try {
    const provider = new TestVDRProvider();
    await provider.testFetchThroughProxy("https://target-vdr.com/api/docs");

    assertEquals(interceptedUrl, "https://target-vdr.com/api/docs");
    assertEquals(interceptedHeaders?.has("x-supergood-api-key"), false);
    assertEquals(interceptedHeaders?.has("x-supergood-target-url"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("BaseVDRProvider should throw error on bad HTTP response", async () => {
  globalThis.fetch = () => {
    return Promise.resolve(new Response("Not Found", { status: 404, statusText: "Not Found" }));
  };

  try {
    const provider = new TestVDRProvider();
    await assertRejects(
      () => provider.testFetchThroughProxy("https://target-vdr.com/api/docs"),
      Error,
      "HTTP error 404 from VDR proxy/provider: Not Found"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("MockVDRProvider should simulate basic document ops", async () => {
  const mock = new MockVDRProvider();
  
  const content = new TextEncoder().encode("Hello World");
  const doc = await mock.uploadDocument("test.txt", content, "folder-1");
  
  assertEquals(doc.name, "test.txt");
  assertEquals(doc.folderId, "folder-1");
  
  const fetchedList = await mock.listDocuments("folder-1");
  assertEquals(fetchedList.length, 1);
  assertEquals(fetchedList[0].id, doc.id);
  
  const fetchedContent = await mock.downloadDocument(doc.id);
  assertEquals(new TextDecoder().decode(fetchedContent), "Hello World");
  
  const metadata = await mock.getDocumentMetadata(doc.id);
  assertEquals(metadata.name, "test.txt");
});
