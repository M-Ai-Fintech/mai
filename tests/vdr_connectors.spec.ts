import { assertEquals, assertRejects } from "@std/assert";
import { IDealsVDRProvider } from "../src/core/vdr/providers/ideals.ts";
import { IntralinksVDRProvider } from "../src/core/vdr/providers/intralinks.ts";

const mockSupergoodConfig = {
  apiKey: "test-api-key",
  proxyUrl: "https://proxy.supergood.ai",
};

const idealsFixture = JSON.parse(
  Deno.readTextFileSync("./tests/fixtures/ideals.json"),
);
const intralinksFixture = JSON.parse(
  Deno.readTextFileSync("./tests/fixtures/intralinks.json"),
);

class StaticFetch {
  constructor(private readonly response: Response) {}

  fetch(): Promise<Response> {
    return Promise.resolve(this.response.clone());
  }
}

async function withFakeFetch(
  fakeFetch: StaticFetch,
  test: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => fakeFetch.fetch();
  try {
    await test();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

Deno.test("IDealsVDRProvider maps document fixtures", async () => {
  const provider = new IDealsVDRProvider(mockSupergoodConfig);
  const fakeFetch = new StaticFetch(
    Response.json(idealsFixture, { status: 200 }),
  );

  await withFakeFetch(fakeFetch, async () => {
    const documents = await provider.listDocuments();
    assertEquals(documents.length, 2);
    assertEquals(documents[0].id, "101");
    assertEquals(documents[0].name, "financial_report.pdf");
    assertEquals(documents[0].folderId, "10");
  });
});

Deno.test("IDealsVDRProvider explains rejected credentials", async () => {
  const provider = new IDealsVDRProvider(mockSupergoodConfig);
  const fakeFetch = new StaticFetch(
    new Response("Unauthorized", { status: 401 }),
  );

  await withFakeFetch(fakeFetch, async () => {
    await assertRejects(
      () => provider.listDocuments(),
      Error,
      "iDeals listDocuments rejected credentials; expected a valid, unexpired API credential (HTTP 401).",
    );
  });
});

Deno.test("IntralinksVDRProvider maps document fixtures", async () => {
  const provider = new IntralinksVDRProvider(mockSupergoodConfig);
  const fakeFetch = new StaticFetch(
    Response.json(intralinksFixture, { status: 200 }),
  );

  await withFakeFetch(fakeFetch, async () => {
    const documents = await provider.listDocuments();
    assertEquals(documents.length, 2);
    assertEquals(documents[0].id, "201");
    assertEquals(documents[0].name, "Q3_earnings.pdf");
    assertEquals(documents[0].folderId, "20");
  });
});

Deno.test("IntralinksVDRProvider explains rate limiting", async () => {
  const provider = new IntralinksVDRProvider(mockSupergoodConfig);
  const fakeFetch = new StaticFetch(
    new Response("Too Many Requests", { status: 429 }),
  );

  await withFakeFetch(fakeFetch, async () => {
    await assertRejects(
      () => provider.listDocuments(),
      Error,
      "Intralinks listDocuments exceeded its request quota; expected a request below the provider rate limit (HTTP 429).",
    );
  });
});
