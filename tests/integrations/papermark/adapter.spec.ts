import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  PapermarkAdapter,
  type PapermarkAdapterDependencies,
  PapermarkIntegrationAdapter,
} from "../../../src/integrations/papermark/adapter.ts";
import {
  type PapermarkAdapterConfig,
  parsePapermarkAdapterConfig,
} from "../../../src/integrations/papermark/config.ts";
import {
  parseProviderConfiguration,
  parseSecretReference,
} from "../../../src/integrations/configuration.ts";
import {
  parseIntegrationScope,
  type RuntimeSecret,
} from "../../../src/integrations/contracts.ts";
import {
  createSyntheticPapermarkCallAuthorizationForTests,
  markPapermarkSyntheticFakeForTests,
} from "../../../src/integrations/papermark/authorization.ts";
import { PapermarkTransport } from "../../../src/integrations/papermark/transport.ts";

const scope = parseIntegrationScope({
  tenantId: "tenant_acme",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
});
const secret = "synthetic-secret-never-return-this" as RuntimeSecret;

class SecretResolverFake {
  calls = 0;

  resolve(): Promise<RuntimeSecret> {
    this.calls += 1;
    return Promise.resolve(secret);
  }
}

class FetchFake {
  readonly calls: { url: string; init: RequestInit }[] = [];
  response = new Response(
    JSON.stringify({
      data: [documentPayload()],
      next_cursor: "cursor_next",
    }),
    { headers: { "content-type": "application/json" } },
  );

  fetch = (url: string, init: RequestInit): Promise<Response> => {
    this.calls.push({ url, init });
    return Promise.resolve(this.response.clone());
  };
}

function documentPayload(): Record<string, unknown> {
  return {
    id: "provider_doc_1",
    name: "Contract.pdf",
    content_type: "application/pdf",
    folder_id: "folder_horizon",
    created: "2026-08-08T11:00:00.000Z",
    updated_at: "2026-08-08T11:30:00.000Z",
  };
}

function config(folderId = "folder_horizon") {
  return parsePapermarkAdapterConfig({
    configuration: parseProviderConfiguration({
      provider: "papermark",
      lifecycle: "enabled",
      environment: "local-development",
      endpoint: "http://localhost:3000/api",
      secretRef: parseSecretReference({
        manager: "environment",
        name: "PAPERMARK_BEARER_TOKEN",
      }),
      activation: activation(),
    }),
    scope,
    connectorAccount: {
      id: "connector_papermark",
      provider: "papermark",
      tenantId: scope.tenantId,
    },
    providerWorkspaceId: "papermark_workspace_horizon",
    folderId,
    pageSize: 50,
    timeoutMs: 1_000,
    retry: { maxAttempts: 1, maxDelayMs: 250 },
  });
}

function dependencies(
  fake: FetchFake,
  adapterConfig = config(),
): PapermarkAdapterDependencies {
  const secretResolver = markPapermarkSyntheticFakeForTests(
    new SecretResolverFake(),
    "secret-resolver",
    "SecretResolverFake",
  );
  const fetch = markPapermarkSyntheticFakeForTests(
    fake.fetch,
    "fetch",
    "FetchFake",
  );
  return {
    secretResolver,
    fetch,
    sleep: () => Promise.resolve(),
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    authorization: createSyntheticPapermarkCallAuthorizationForTests(
      adapterConfig,
      { secretResolver, fetch },
    ),
  };
}

Deno.test("Papermark adapter maps the official page into both public seams", async () => {
  const fake = new FetchFake();
  const neutral = new PapermarkIntegrationAdapter(config(), dependencies(fake));
  const provider = new PapermarkAdapter(config(), dependencies(fake));

  const neutralPage = await neutral.documents.listDocuments({
    scope,
    providerWorkspaceId: "papermark_workspace_horizon",
  });
  assertEquals(neutralPage.ok, true);
  if (neutralPage.ok) {
    assertEquals(neutralPage.value.documents[0], {
      providerDocumentId: "provider_doc_1",
      name: "Contract.pdf",
      mimeType: "application/pdf",
      providerFolderId: "folder_horizon",
    });
    assertEquals(neutralPage.value.nextCursor, "cursor_next");
  }

  const sourcePage = await provider.listDocuments({
    providerWorkspaceId: "papermark_workspace_horizon",
  });
  assertEquals(sourcePage.documents[0].providerDocumentId, "provider_doc_1");
  assertEquals(sourcePage.documents[0].mimeType, "application/pdf");
  assertEquals(sourcePage.nextCursor, "cursor_next");
  assertEquals(fake.calls.length, 2);
});

Deno.test("Papermark adapter advertises list-only capability and gates binary download", async () => {
  const fake = new FetchFake();
  const adapter = new PapermarkIntegrationAdapter(config(), dependencies(fake));
  const capabilities = await adapter.discoverCapabilities();
  const list = capabilities.observations.find(({ capability }) =>
    capability === "list_documents"
  );
  const download = capabilities.observations.find(({ capability }) =>
    capability === "download_document"
  );
  const pagination = capabilities.observations.find(({ capability }) =>
    capability === "pagination"
  );
  assertEquals(list?.status, "supported");
  assertEquals(pagination?.status, "supported");
  assertEquals(capabilities.source, "implementation");
  assertEquals(download?.status, "unavailable");

  const result = await adapter.documents.downloadDocument({
    scope,
    providerWorkspaceId: "papermark_workspace_horizon",
    providerDocumentId: "provider_doc_1",
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.failure.code, "UNAVAILABLE");
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark adapter health does not infer identity or scope ownership from a folder list", async () => {
  const fake = new FetchFake();
  const adapter = new PapermarkIntegrationAdapter(config(), dependencies(fake));
  const health = await adapter.checkHealth();
  assertEquals(health.environment, "local-development");
  assertEquals(health.state, "unavailable");
  assertEquals(
    health.checks.find(({ name }) => name === "credentials")?.state,
    "unavailable",
  );
  assertEquals(
    health.checks.find(({ name }) => name === "scope-isolation")?.state,
    "unavailable",
  );
  assertEquals(fake.calls.length, 1);
});

Deno.test("Papermark adapter rejects a scope or workspace mismatch before fetch", async () => {
  const fake = new FetchFake();
  const adapter = new PapermarkIntegrationAdapter(config(), dependencies(fake));
  const result = await adapter.documents.listDocuments({
    scope: parseIntegrationScope({
      tenantId: "tenant_other",
      workspaceId: "workspace_horizon",
      dealId: "deal_horizon",
    }),
    providerWorkspaceId: "papermark_workspace_horizon",
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.failure.code, "INVALID_REQUEST");
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark adapter rejects missing authorization before resolver or fetch", () => {
  const fake = new FetchFake();
  const resolver = new SecretResolverFake();
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(config(), {
        ...dependencies(fake),
        secretResolver: resolver,
        authorization: undefined as never,
      }),
    Error,
    "authorization",
  );
  assertEquals(resolver.calls, 0);
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark adapter rejects mismatched or forged authorization before resolver or fetch", () => {
  const fake = new FetchFake();
  const resolver = new SecretResolverFake();
  const markedResolver = markPapermarkSyntheticFakeForTests(
    resolver,
    "secret-resolver",
    "SecretResolverFake",
  );
  const markedFetch = markPapermarkSyntheticFakeForTests(
    fake.fetch,
    "fetch",
    "FetchFake",
  );
  const otherConfig = config("folder_other");
  const mismatched = createSyntheticPapermarkCallAuthorizationForTests(
    otherConfig,
    { secretResolver: markedResolver, fetch: markedFetch },
  );
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(config(), {
        ...dependencies(fake),
        secretResolver: resolver,
        authorization: mismatched,
      }),
    Error,
    "authorization",
  );
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(config(), {
        ...dependencies(fake),
        secretResolver: resolver,
        authorization: {} as never,
      }),
    Error,
    "authorization",
  );
  assertEquals(resolver.calls, 0);
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark transport rejects mismatched authorization before resolver or fetch", () => {
  const fake = new FetchFake();
  const resolver = new SecretResolverFake();
  const markedResolver = markPapermarkSyntheticFakeForTests(
    resolver,
    "secret-resolver",
    "SecretResolverFake",
  );
  const markedFetch = markPapermarkSyntheticFakeForTests(
    fake.fetch,
    "fetch",
    "FetchFake",
  );
  const otherConfig = config("folder_other");
  const dependencies = {
    fetch: fake.fetch,
    sleep: () => Promise.resolve(),
    now: () => new Date("2026-08-08T12:00:00.000Z"),
    authorization: createSyntheticPapermarkCallAuthorizationForTests(
      otherConfig,
      { secretResolver: markedResolver, fetch: markedFetch },
    ),
  };
  assertThrows(
    () => new PapermarkTransport(config(), resolver, dependencies),
    Error,
    "authorization",
  );
  assertThrows(
    () =>
      new PapermarkTransport(config(), resolver, {
        ...dependencies,
        authorization: {} as never,
      }),
    Error,
    "authorization",
  );
  assertEquals(resolver.calls, 0);
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark authorization binds policy and secret-reference configuration", () => {
  const base = config();
  const fake = new FetchFake();
  const baseDependencies = dependencies(fake, base);
  const policyMismatch = { ...base, pageSize: base.pageSize + 1 };
  assertThrows(
    () => new PapermarkIntegrationAdapter(policyMismatch, baseDependencies),
    Error,
    "authorization",
  );
  const secretMismatch = {
    ...base,
    configuration: {
      ...base.configuration,
      secretRef: {
        ...base.configuration.secretRef!,
        version: "current",
      },
    },
  } as PapermarkAdapterConfig;
  assertThrows(
    () => new PapermarkIntegrationAdapter(secretMismatch, baseDependencies),
    Error,
    "authorization",
  );
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark authorization rejects swapped resolver and fetch before I/O", () => {
  const adapterConfig = config();
  const firstFetch = new FetchFake();
  const secondFetch = new FetchFake();
  const firstResolver = markPapermarkSyntheticFakeForTests(
    new SecretResolverFake(),
    "secret-resolver",
    "SecretResolverFake",
  );
  const secondResolver = markPapermarkSyntheticFakeForTests(
    new SecretResolverFake(),
    "secret-resolver",
    "SecretResolverFake",
  );
  const firstFetchDependency = markPapermarkSyntheticFakeForTests(
    firstFetch.fetch,
    "fetch",
    "FetchFake",
  );
  const secondFetchDependency = markPapermarkSyntheticFakeForTests(
    secondFetch.fetch,
    "fetch",
    "FetchFake",
  );
  const authorization = createSyntheticPapermarkCallAuthorizationForTests(
    adapterConfig,
    { secretResolver: firstResolver, fetch: firstFetchDependency },
  );
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(adapterConfig, {
        ...dependencies(firstFetch, adapterConfig),
        secretResolver: secondResolver,
        fetch: secondFetchDependency,
        authorization,
      }),
    Error,
    "authorization",
  );
  assertEquals(firstFetch.calls.length, 0);
  assertEquals(secondFetch.calls.length, 0);
  assertEquals(firstResolver.calls, 0);
  assertEquals(secondResolver.calls, 0);
});

Deno.test("Papermark adapter rejects provider documents from another folder", async () => {
  const fake = new FetchFake();
  fake.response = new Response(
    JSON.stringify({
      data: [{ ...documentPayload(), folder_id: "folder_other" }],
      next_cursor: null,
    }),
    { headers: { "content-type": "application/json" } },
  );
  const adapter = new PapermarkIntegrationAdapter(config(), dependencies(fake));
  const result = await adapter.documents.listDocuments({
    scope,
    providerWorkspaceId: "papermark_workspace_horizon",
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.failure.code, "MALFORMED_RESPONSE");
});

Deno.test("Papermark Documents port never reflects the bearer secret in failures", async () => {
  const fake = new FetchFake();
  fake.response = new Response("not-json", { status: 200 });
  const provider = new PapermarkAdapter(config(), dependencies(fake));
  const error = await captureError(() =>
    provider.listDocuments({
      providerWorkspaceId: "papermark_workspace_horizon",
    })
  );
  assert(!error.message.includes(String(secret)));
  assert(!error.message.includes("not-json"));
});

async function captureError(operation: () => Promise<unknown>): Promise<Error> {
  try {
    await operation();
  } catch (error) {
    return error as Error;
  }
  throw new Error("Expected the operation to fail.");
}

function activation() {
  return {
    approvalReference: "approval_papermark_local",
    providerVersion: "papermark-1.0.0",
    license: "AGPLv3",
    deploymentModel: "self-hosted",
    region: "local",
    storageTopology: "postgres-object-store",
    rollbackOperator: "platform-on-call",
  } as const;
}
