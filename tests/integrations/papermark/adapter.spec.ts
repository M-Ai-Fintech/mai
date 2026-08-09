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
  createPapermarkSyntheticTestBundle,
} from "./support/synthetic_test_bundle.ts";
import { PapermarkTransport } from "../../../src/integrations/papermark/transport.ts";

const scope = parseIntegrationScope({
  tenantId: "tenant_acme",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
});
const secret = "synthetic-secret-never-return-this" as RuntimeSecret;

class FetchFake {
  readonly calls: { url: string; init: RequestInit }[] = [];
  response = new Response(
    JSON.stringify({
      data: [documentPayload()],
      next_cursor: "cursor_next",
    }),
    { headers: { "content-type": "application/json" } },
  );
}

function documentPayload(): Record<string, unknown> {
  return {
    id: "dataroom_membership_1",
    object: "dataroom_document",
    document_id: "provider_doc_1",
    document_name: "Contract.pdf",
    content_type: "application/pdf",
    folder_id: "folder_horizon",
    created: "2026-08-08T11:00:00.000Z",
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
    providerAccount: {
      accountId: "account_papermark",
      teamId: "team_papermark",
    },
    dataRoomId: "dataroom_horizon",
    dataRoomFolderId: folderId,
    pageSize: 50,
    timeoutMs: 1_000,
    retry: { maxAttempts: 1, maxDelayMs: 250 },
  });
}

function dependencies(
  fake: FetchFake,
  adapterConfig = config(),
): PapermarkAdapterDependencies {
  const bundle = createPapermarkSyntheticTestBundle(adapterConfig, {
    secret,
    responses: [fake.response, fake.response.clone()],
  });
  Object.defineProperty(fake, "calls", {
    configurable: true,
    get: () => bundle.controls.fetch.calls,
  });
  return bundle.dependencies;
}

Deno.test("Papermark adapter maps the official page into both public seams", async () => {
  const fake = new FetchFake();
  const sharedDependencies = dependencies(fake);
  const neutral = new PapermarkIntegrationAdapter(config(), sharedDependencies);
  const provider = new PapermarkAdapter(config(), sharedDependencies);

  const neutralPage = await neutral.documents.listDocuments({
    scope,
    providerResourceId: "dataroom_horizon",
  });
  assertEquals(neutralPage.ok, true);
  if (neutralPage.ok) {
    assertEquals(neutralPage.value.documents[0], {
      providerDocumentId: "provider_doc_1",
      providerDataRoomDocumentId: "dataroom_membership_1",
      name: "Contract.pdf",
      mimeType: "application/pdf",
      providerFolderId: "folder_horizon",
    });
    assertEquals(neutralPage.value.nextCursor, "cursor_next");
  }

  const sourcePage = await provider.listDocuments({
    providerWorkspaceId: "dataroom_horizon",
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
    providerResourceId: "dataroom_horizon",
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
    providerResourceId: "dataroom_horizon",
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.failure.code, "INVALID_REQUEST");
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark adapter rejects missing authorization before resolver or fetch", () => {
  const fake = new FetchFake();
  const validDependencies = dependencies(fake);
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(config(), {
        ...validDependencies,
        authorization: undefined as never,
      }),
    Error,
    "authorization",
  );
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark adapter rejects mismatched or forged authorization before resolver or fetch", () => {
  const fake = new FetchFake();
  const otherConfig = config("folder_other");
  const other = createPapermarkSyntheticTestBundle(otherConfig, {
    secret,
    responses: [fake.response],
  });
  const valid = dependencies(fake);
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(config(), {
        ...valid,
        authorization: other.dependencies.authorization,
      }),
    Error,
    "authorization",
  );
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(config(), {
        ...valid,
        authorization: {} as never,
      }),
    Error,
    "authorization",
  );
  assertEquals(fake.calls.length, 0);
});

Deno.test("Papermark transport rejects mismatched authorization before resolver or fetch", () => {
  const fake = new FetchFake();
  const otherConfig = config("folder_other");
  const other = createPapermarkSyntheticTestBundle(otherConfig, {
    secret,
    responses: [fake.response],
  });
  assertThrows(
    () => new PapermarkTransport(config(), other.dependencies),
    Error,
    "authorization",
  );
  assertThrows(
    () =>
      new PapermarkTransport(config(), {
        ...other.dependencies,
        authorization: {} as never,
      }),
    Error,
    "authorization",
  );
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
  const first = createPapermarkSyntheticTestBundle(adapterConfig, {
    secret,
    responses: [firstFetch.response],
  });
  const second = createPapermarkSyntheticTestBundle(adapterConfig, {
    secret,
    responses: [secondFetch.response],
  });
  assertThrows(
    () =>
      new PapermarkIntegrationAdapter(adapterConfig, {
        ...second.dependencies,
        authorization: first.dependencies.authorization,
      }),
    Error,
    "authorization",
  );
  assertEquals(firstFetch.calls.length, 0);
  assertEquals(secondFetch.calls.length, 0);
  assertEquals(first.controls.secret.calls.length, 0);
  assertEquals(second.controls.secret.calls.length, 0);
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
    providerResourceId: "dataroom_horizon",
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
      providerWorkspaceId: "dataroom_horizon",
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
    providerVersion: "papermark-v1.0.0",
    apiScopes: ["datarooms.read"],
    license: "AGPLv3",
    deploymentModel: "self-hosted",
    region: "local",
    storageTopology: "postgres-object-store",
    rollbackOperator: "platform-on-call",
  } as const;
}
