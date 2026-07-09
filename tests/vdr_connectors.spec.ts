import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { IDealsVDRProvider } from "../src/core/vdr/providers/ideals.ts";
import { IntralinksVDRProvider } from "../src/core/vdr/providers/intralinks.ts";

const mockSupergoodConfig = {
  apiKey: "test-api-key",
  proxyUrl: "https://proxy.supergood.ai"
};

const idealsFixture = JSON.parse(Deno.readTextFileSync("./tests/fixtures/ideals.json"));
const intralinksFixture = JSON.parse(Deno.readTextFileSync("./tests/fixtures/intralinks.json"));

Deno.test("IDealsVDRProvider - listDocuments successful mapping", async () => {
  const provider = new IDealsVDRProvider(mockSupergoodConfig);
  
  // Mock fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    return new Response(JSON.stringify(idealsFixture), { status: 200 });
  };

  try {
    const docs = await provider.listDocuments();
    assertEquals(docs.length, 2);
    assertEquals(docs[0].id, "101");
    assertEquals(docs[0].name, "financial_report.pdf");
    assertEquals(docs[0].folderId, "10");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("IDealsVDRProvider - error handling 401", async () => {
  const provider = new IDealsVDRProvider(mockSupergoodConfig);
  
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });

  try {
    await assertRejects(
      () => provider.listDocuments(),
      Error,
      "iDeals API Error: Authentication expired or invalid credentials (401)."
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("IntralinksVDRProvider - listDocuments successful mapping", async () => {
  const provider = new IntralinksVDRProvider(mockSupergoodConfig);
  
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(intralinksFixture), { status: 200 });

  try {
    const docs = await provider.listDocuments();
    assertEquals(docs.length, 2);
    assertEquals(docs[0].id, "201");
    assertEquals(docs[0].name, "Q3_earnings.pdf");
    assertEquals(docs[0].folderId, "20");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("IntralinksVDRProvider - error handling 429", async () => {
  const provider = new IntralinksVDRProvider(mockSupergoodConfig);
  
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("Too Many Requests", { status: 429 });

  try {
    await assertRejects(
      () => provider.listDocuments(),
      Error,
      "Intralinks API Error: Rate limit exceeded (429). Please try again later."
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
