import { assert, assertEquals } from "@std/assert";
import {
  type CapabilitySnapshot,
  createCapabilitySnapshot,
  createHealthSnapshot,
  type HealthSnapshot,
  type IntegrationAdapter,
  type IntegrationByteSource,
  type IntegrationResult,
  type IntegrationScope,
  parseIntegrationScope,
  type ProviderDocumentPage,
  type ScopedDocumentPort,
} from "../../src/integrations/contracts.ts";
import { createNormalizedIntegrationFailure } from "../../src/integrations/failures.ts";
import {
  type FixtureConformancePlan,
  invokeCapability,
  runFixtureConformance,
} from "../../src/integrations/fixture_conformance.ts";

Deno.test("fixture conformance proves deterministic pagination and downloads", async () => {
  const adapter = new DeterministicFixtureAdapter();
  const evidence = await runFixtureConformance(adapter, conformancePlan());

  assertEquals(evidence.passed, true);
  assertEquals(evidence.provider, "fixture");
  assertEquals(evidence.environment, "fixture");
  assertEquals(evidence.source, "fixture");
  assertEquals(evidence.synthetic, true);
  assertEquals(evidence.readiness, "fixture-only");
  assertEquals(
    evidence.checks.every(({ status }) => status === "passed"),
    true,
  );
  assertEquals(adapter.documents.listCalls, [undefined, "cursor-1"]);
  assertEquals(adapter.documents.downloadCalls, ["doc-1", "missing-doc"]);
});

Deno.test("denied and unavailable capabilities never invoke provider operations", async () => {
  const adapter = new DeterministicFixtureAdapter();
  const snapshot = await adapter.discoverCapabilities();
  let deniedCalls = 0;
  let unavailableCalls = 0;

  const denied = await invokeCapability(
    snapshot,
    "permissions",
    () => {
      deniedCalls += 1;
      return Promise.resolve({ ok: true, value: true });
    },
  );
  const unavailable = await invokeCapability(
    snapshot,
    "create_folder",
    () => {
      unavailableCalls += 1;
      return Promise.resolve({ ok: true, value: true });
    },
  );

  assertEquals(denied.ok, false);
  assert(denied.ok === false);
  assertEquals(denied.failure.code, "AUTHORIZATION_DENIED");
  assertEquals(unavailable.ok, false);
  assert(unavailable.ok === false);
  assertEquals(unavailable.failure.code, "UNAVAILABLE");
  assertEquals(deniedCalls, 0);
  assertEquals(unavailableCalls, 0);
});

Deno.test("fixture conformance refuses a provider adapter and makes no document calls", async () => {
  const adapter = new NonFixtureAdapter();
  const evidence = await runFixtureConformance(adapter, conformancePlan());

  assertEquals(evidence.passed, false);
  assertEquals(evidence.checks[0].name, "fixture-identity");
  assertEquals(adapter.documents.listCalls, []);
  assertEquals(adapter.documents.downloadCalls, []);
});

Deno.test("fixture conformance records safe normalized missing-document failure", async () => {
  const adapter = new DeterministicFixtureAdapter();
  const evidence = await runFixtureConformance(adapter, {
    ...conformancePlan(),
    expectedMissingFailure: "NOT_FOUND",
  });
  const failure = adapter.documents.lastFailure;

  assertEquals(evidence.passed, true);
  assertEquals(failure?.code, "NOT_FOUND");
  assertEquals(failure?.message.includes("raw-secret"), false);
  assertEquals(JSON.stringify(evidence).includes("raw-secret"), false);
});

function conformancePlan(): FixtureConformancePlan {
  return {
    scope: integrationScope(),
    providerWorkspaceId: "room_fixture",
    pages: [
      {
        cursor: undefined,
        documentIds: ["doc-1"],
        nextCursor: "cursor-1",
      },
      { cursor: "cursor-1", documentIds: ["doc-2"] },
    ],
    downloadDocumentId: "doc-1",
    expectedContent: new TextEncoder().encode("fixture-content"),
    missingDocumentId: "missing-doc",
    deniedCapability: "permissions",
    unavailableCapability: "create_folder",
  };
}

function integrationScope(): IntegrationScope {
  return parseIntegrationScope({
    tenantId: "tenant_northstar",
    workspaceId: "workspace_primary",
    dealId: "deal_solar-2026",
  });
}

class DeterministicFixtureAdapter implements IntegrationAdapter {
  readonly provider = "fixture" as const;
  readonly environment = "fixture" as const;
  readonly lifecycle = "enabled" as const;
  readonly scope = integrationScope();
  readonly documents = new FixtureDocumentPort();

  discoverCapabilities(): Promise<CapabilitySnapshot> {
    return Promise.resolve(createCapabilitySnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      source: "fixture",
      scope: this.scope,
      requested: [
        "list_documents",
        "download_document",
        "pagination",
        "permissions",
        "create_folder",
      ],
      observations: [
        { capability: "list_documents", status: "supported" },
        { capability: "download_document", status: "supported" },
        { capability: "pagination", status: "supported" },
        {
          capability: "permissions",
          status: "denied",
          reasonCode: "AUTHORIZATION_DENIED",
        },
        {
          capability: "create_folder",
          status: "unavailable",
          reasonCode: "UNAVAILABLE",
        },
      ],
      observedAt: timestamp(),
    }));
  }

  checkHealth(): Promise<HealthSnapshot> {
    return Promise.resolve(createHealthSnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      scope: this.scope,
      checks: [{ name: "fixture-store", state: "passed" }],
      observedAt: timestamp(),
    }));
  }
}

class NonFixtureAdapter implements IntegrationAdapter {
  readonly provider = "papermark" as const;
  readonly environment = "local-development" as const;
  readonly lifecycle = "enabled" as const;
  readonly scope = integrationScope();
  readonly documents = new FixtureDocumentPort();

  discoverCapabilities(): Promise<CapabilitySnapshot> {
    return Promise.resolve(createCapabilitySnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      source: "provider",
      scope: this.scope,
      requested: ["list_documents"],
      observations: [{ capability: "list_documents", status: "supported" }],
      observedAt: timestamp(),
    }));
  }

  checkHealth(): Promise<HealthSnapshot> {
    return Promise.resolve(createHealthSnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      scope: this.scope,
      checks: [{ name: "provider", state: "passed" }],
      observedAt: timestamp(),
    }));
  }
}

class FixtureDocumentPort implements ScopedDocumentPort {
  readonly listCalls: Array<string | undefined> = [];
  readonly downloadCalls: string[] = [];
  lastFailure:
    | ReturnType<typeof createNormalizedIntegrationFailure>
    | undefined;

  listDocuments(request: {
    readonly scope: IntegrationScope;
    readonly providerWorkspaceId: string;
    readonly cursor?: string;
  }): Promise<IntegrationResult<ProviderDocumentPage>> {
    this.listCalls.push(request.cursor);
    const page = request.cursor === undefined
      ? {
        documents: [{
          providerDocumentId: "doc-1",
          name: "one.txt",
          mimeType: "text/plain",
        }],
        nextCursor: "cursor-1",
      }
      : {
        documents: [{
          providerDocumentId: "doc-2",
          name: "two.txt",
          mimeType: "text/plain",
        }],
      };
    return Promise.resolve({ ok: true, value: page });
  }

  downloadDocument(request: {
    readonly scope: IntegrationScope;
    readonly providerWorkspaceId: string;
    readonly providerDocumentId: string;
  }): Promise<IntegrationResult<IntegrationByteSource>> {
    this.downloadCalls.push(request.providerDocumentId);
    if (request.providerDocumentId === "doc-1") {
      return Promise.resolve({
        ok: true,
        value: new TextEncoder().encode("fixture-content"),
      });
    }
    const failure = createNormalizedIntegrationFailure({
      provider: "fixture",
      operation: "download_document",
      code: "NOT_FOUND",
    });
    this.lastFailure = failure;
    return Promise.resolve({ ok: false, failure });
  }
}

function timestamp(): Date {
  return new Date("2026-08-08T12:00:00.000Z");
}
