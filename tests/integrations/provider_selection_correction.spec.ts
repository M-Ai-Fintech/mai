import { assert, assertEquals } from "@std/assert";
import {
  createCapabilitySnapshot,
  createHealthSnapshot,
  type IntegrationAdapter,
  type IntegrationResult,
  type IntegrationScope,
  parseIntegrationScope,
  type ProviderDocumentPage,
  type ScopedDocumentPort,
} from "../../src/integrations/contracts.ts";
import {
  type ProviderSelectionFactoryContext,
  selectProvider,
} from "../../src/integrations/provider_selection.ts";

Deno.test("provider selection snapshots scope, bindings, and factory before awaiting", async () => {
  const mutableScope = {
    ...parseIntegrationScope({
      tenantId: "tenant_original",
      workspaceId: "workspace_original",
      dealId: "deal_original",
    }),
  } as {
    tenantId: IntegrationScope["tenantId"];
    workspaceId: IntegrationScope["workspaceId"];
    dealId: IntegrationScope["dealId"];
  };
  const factories = {
    fixture: undefined as
      | ((
        context: ProviderSelectionFactoryContext,
      ) => Promise<IntegrationAdapter>)
      | undefined,
  };
  let release: (() => void) | undefined;
  let context: ProviderSelectionFactoryContext | undefined;
  const adapterPromise = new Promise<IntegrationAdapter>((resolve) => {
    release = () => resolve(new CanonicalFixtureAdapter(context!));
  });
  factories.fixture = async (received) => {
    context = received;
    await adapterPromise;
    return new CanonicalFixtureAdapter(received);
  };
  const request = {
    mode: "fixture" as const,
    provider: "fixture" as const,
    scope: mutableScope,
    connectorAccountId: "connector_original",
    providerWorkspaceId: "workspace-provider-original",
    factories,
  };
  const pending = selectProvider(request);
  mutableScope.tenantId = "tenant_mutated" as typeof mutableScope.tenantId;
  mutableScope.workspaceId =
    "workspace_mutated" as typeof mutableScope.workspaceId;
  mutableScope.dealId = "deal_mutated" as typeof mutableScope.dealId;
  request.connectorAccountId = "connector_mutated";
  request.providerWorkspaceId = "workspace-provider-mutated";
  factories.fixture = () => Promise.reject(new Error("replacement factory"));
  release?.();

  const result = await pending;
  assertEquals(result.kind, "fixture");
  assert(result.kind === "fixture");
  assertEquals(result.scope.tenantId, "tenant_original");
  assertEquals(result.connectorAccountId, "connector_original");
  assertEquals(result.providerWorkspaceId, "workspace-provider-original");
  assertEquals(Object.isFrozen(result.scope), true);
  assertEquals(Object.isFrozen(context), true);
});

Deno.test("fixture selection owns a frozen adapter facade after original mutation", async () => {
  let original: CanonicalFixtureAdapter | undefined;
  const result = await selectProvider({
    mode: "fixture",
    provider: "fixture",
    scope: parseIntegrationScope({
      tenantId: "tenant_original",
      workspaceId: "workspace_original",
      dealId: "deal_original",
    }),
    connectorAccountId: "connector_original",
    providerWorkspaceId: "workspace-provider-original",
    factories: {
      fixture: (context) => {
        const adapter = new CanonicalFixtureAdapter(context);
        original = adapter;
        return adapter;
      },
    },
  });
  assertEquals(result.kind, "fixture");
  assert(original !== undefined);
  if (result.kind !== "fixture" || original === undefined) return;

  const mutable = original as unknown as Record<string, unknown>;
  mutable.provider = "papermark";
  mutable.environment = "local-development";
  mutable.lifecycle = "disabled";
  mutable.scope = parseIntegrationScope({
    tenantId: "tenant_mutated",
    workspaceId: "workspace_mutated",
    dealId: "deal_mutated",
  });
  mutable.connectorAccountId = "connector_mutated";
  mutable.providerWorkspaceId = "workspace-provider-mutated";
  mutable.documents = new ThrowingDocumentPort();
  mutable.discoverCapabilities = () => Promise.reject(new Error("replaced"));
  mutable.checkHealth = () => Promise.reject(new Error("replaced"));

  assertEquals(result.adapter.provider, "fixture");
  assertEquals(result.adapter.environment, "fixture");
  assertEquals(result.adapter.lifecycle, "enabled");
  assertEquals(result.adapter.scope.tenantId, "tenant_original");
  assertEquals(result.adapter.connectorAccountId, "connector_original");
  assertEquals(
    result.adapter.providerWorkspaceId,
    "workspace-provider-original",
  );
  const capabilities = await result.adapter.discoverCapabilities();
  assertEquals(capabilities.provider, "fixture");
  const health = await result.adapter.checkHealth();
  assertEquals(health.provider, "fixture");
  const documents = await result.adapter.documents.listDocuments({
    scope: result.adapter.scope,
    providerWorkspaceId: "workspace-provider-original",
  });
  assertEquals(documents.ok, true);
});

class CanonicalFixtureAdapter implements IntegrationAdapter {
  readonly provider = "fixture" as const;
  readonly environment = "fixture" as const;
  readonly lifecycle = "enabled" as const;
  readonly scope: IntegrationScope;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly documents: ScopedDocumentPort = new EmptyDocumentPort();

  constructor(context: ProviderSelectionFactoryContext) {
    this.scope = context.scope;
    this.connectorAccountId = context.connectorAccountId;
    this.providerWorkspaceId = context.providerWorkspaceId;
  }

  discoverCapabilities() {
    return Promise.resolve(createCapabilitySnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      source: "fixture",
      scope: this.scope,
      requested: ["list_documents"],
      observations: [{ capability: "list_documents", status: "supported" }],
      observedAt: new Date("2026-08-08T12:00:00.000Z"),
    }));
  }

  checkHealth() {
    return Promise.resolve(createHealthSnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      scope: this.scope,
      checks: [{ name: "fixture", state: "passed" }],
      observedAt: new Date("2026-08-08T12:00:00.000Z"),
    }));
  }
}

class EmptyDocumentPort implements ScopedDocumentPort {
  listDocuments(
    _request: never,
  ): Promise<{ ok: true; value: ProviderDocumentPage }> {
    return Promise.resolve({ ok: true, value: { documents: [] } });
  }

  downloadDocument(
    _request: never,
  ): Promise<{ ok: true; value: Uint8Array }> {
    return Promise.resolve({ ok: true, value: new Uint8Array() });
  }
}

class ThrowingDocumentPort implements ScopedDocumentPort {
  listDocuments(): Promise<IntegrationResult<ProviderDocumentPage>> {
    return Promise.reject(new Error("replaced"));
  }

  downloadDocument(): Promise<IntegrationResult<Uint8Array>> {
    return Promise.reject(new Error("replaced"));
  }
}
