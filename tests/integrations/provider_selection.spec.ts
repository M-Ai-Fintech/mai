import { assert, assertEquals } from "@std/assert";
import {
  type CapabilitySnapshot,
  createCapabilitySnapshot,
  createHealthSnapshot,
  type HealthSnapshot,
  type IntegrationAdapter,
  type IntegrationResult,
  type IntegrationScope,
  parseIntegrationScope,
  type ProviderDocumentPage,
  type ScopedDocumentPort,
} from "../../src/integrations/contracts.ts";
import { parseProviderConfiguration } from "../../src/integrations/configuration.ts";
import {
  executeSelectedOperation,
  type ProviderSelectionResult,
  selectProvider,
} from "../../src/integrations/provider_selection.ts";

Deno.test("configured Papermark selection fails closed before factory authority exists", async () => {
  let factoryCalls = 0;
  const result = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: "connector_papermark",
    providerWorkspaceId: "room_local",
    configuration: papermarkConfiguration(),
    factories: {
      papermark: () => {
        factoryCalls += 1;
        return new RecordingAdapter("papermark", "local-development");
      },
    },
  });

  assertBlocked(result, "unauthorized", "AUTHORIZATION_DENIED");
  assertEquals(factoryCalls, 0);
});

Deno.test("fixture selection is explicit and is labeled synthetic", async () => {
  let fixtureCalls = 0;
  const result = await selectProvider({
    mode: "fixture",
    provider: "fixture",
    scope: integrationScope(),
    connectorAccountId: "connector_fixture",
    providerWorkspaceId: "room_fixture",
    factories: {
      fixture: () => {
        fixtureCalls += 1;
        return new RecordingAdapter("fixture", "fixture");
      },
    },
  });

  assertEquals(result.kind, "fixture");
  assert(result.kind === "fixture");
  assertEquals(result.source, "fixture");
  assertEquals(result.synthetic, true);
  assertEquals(result.readiness, "fixture-only");
  assertEquals(fixtureCalls, 1);
});

Deno.test("an unconfigured real provider never invokes the fixture factory", async () => {
  let fixtureCalls = 0;
  const result = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: "connector_papermark",
    providerWorkspaceId: "room_local",
    factories: {
      papermark: () => new RecordingAdapter("papermark", "local-development"),
      fixture: () => {
        fixtureCalls += 1;
        return new RecordingAdapter("fixture", "fixture");
      },
    },
  });

  assertBlocked(result, "unconfigured", "NOT_CONFIGURED");
  assertEquals(fixtureCalls, 0);
});

Deno.test("iDeals and Intralinks remain deferred without factory or network calls", async () => {
  let factoryCalls = 0;
  for (const provider of ["ideals", "intralinks"] as const) {
    const result = await selectProvider({
      mode: "configured",
      provider,
      scope: integrationScope(),
      connectorAccountId: `connector_${provider}`,
      providerWorkspaceId: "room_deferred",
      configuration: parseProviderConfiguration({
        provider,
        lifecycle: "deferred",
        environment: "interface-only",
      }),
      factories: {
        ideals: () => {
          factoryCalls += 1;
          return new RecordingAdapter("ideals", "interface-only");
        },
        intralinks: () => {
          factoryCalls += 1;
          return new RecordingAdapter("intralinks", "interface-only");
        },
      },
    });

    assertBlocked(result, "deferred", "DEFERRED");
  }
  assertEquals(factoryCalls, 0);
});

Deno.test("disabled Papermark is blocked without constructing an adapter", async () => {
  let factoryCalls = 0;
  const result = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: "connector_papermark",
    providerWorkspaceId: "room_disabled",
    configuration: parseProviderConfiguration({
      provider: "papermark",
      lifecycle: "disabled",
      environment: "interface-only",
    }),
    factories: {
      papermark: () => {
        factoryCalls += 1;
        return new RecordingAdapter("papermark", "interface-only");
      },
    },
  });

  assertBlocked(result, "disabled", "DISABLED");
  assertEquals(factoryCalls, 0);
});

Deno.test("configured Papermark never invokes real or fixture factories without authority", async () => {
  let papermarkCalls = 0;
  let fixtureCalls = 0;
  const result = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: "connector_papermark",
    providerWorkspaceId: "room_local",
    configuration: papermarkConfiguration(),
    factories: {
      papermark: () => {
        papermarkCalls += 1;
        throw new Error("provider token=raw-secret unavailable");
      },
      fixture: () => {
        fixtureCalls += 1;
        return new RecordingAdapter("fixture", "fixture");
      },
    },
  });

  assertBlocked(result, "unauthorized", "AUTHORIZATION_DENIED");
  assertEquals(papermarkCalls, 0);
  assertEquals(fixtureCalls, 0);
});

Deno.test("hosted sandbox and localhost Papermark configs cannot invoke a factory", async () => {
  let factoryCalls = 0;
  for (
    const [environment, endpoint] of [
      ["local-development", "http://localhost:3000/api"],
      ["sandbox-certification", "https://api.papermark.com"],
    ] as const
  ) {
    const result = await selectProvider({
      mode: "configured",
      provider: "papermark",
      scope: integrationScope(),
      connectorAccountId: "connector_papermark",
      providerWorkspaceId: "room_local",
      configuration: papermarkConfiguration(endpoint, environment),
      factories: {
        papermark: () => {
          factoryCalls += 1;
          return new RecordingAdapter("papermark", environment);
        },
      },
    });
    assertBlocked(result, "unauthorized", "AUTHORIZATION_DENIED");
  }
  assertEquals(factoryCalls, 0);
});

Deno.test("nested configuration credentials are rejected before factory invocation", async () => {
  let factoryCalls = 0;
  const secret = "nested-secret-must-not-be-retained";
  const configurations = [
    {
      ...papermarkConfiguration(),
      secretRef: {
        manager: "environment",
        name: "PAPER_MARK_SECRET",
        value: secret,
      },
    },
    {
      ...papermarkConfiguration(),
      activation: { ...activation(), credentials: { value: secret } },
    },
  ];
  for (const configuration of configurations) {
    const result = await selectProvider({
      mode: "configured",
      provider: "papermark",
      scope: integrationScope(),
      connectorAccountId: "connector_papermark",
      providerWorkspaceId: "room_local",
      configuration: configuration as never,
      factories: {
        papermark: () => {
          factoryCalls += 1;
          return new RecordingAdapter("papermark", "local-development");
        },
      },
    });

    assertBlocked(result, "invalid", "INVALID_REQUEST");
    assertEquals(JSON.stringify(result).includes(secret), false);
  }
  assertEquals(factoryCalls, 0);
});

Deno.test("binding validation rejects missing connector or provider workspace before factory", async () => {
  let factoryCalls = 0;
  const factory = () => {
    factoryCalls += 1;
    return new RecordingAdapter("papermark", "local-development");
  };

  const missingConnector = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: " ",
    providerWorkspaceId: "room_local",
    configuration: papermarkConfiguration(),
    factories: { papermark: factory },
  });
  const missingWorkspace = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: "connector_papermark",
    providerWorkspaceId: "",
    configuration: papermarkConfiguration(),
    factories: { papermark: factory },
  });

  assertBlocked(missingConnector, "invalid", "INVALID_REQUEST");
  assertBlocked(missingWorkspace, "invalid", "INVALID_REQUEST");
  assertEquals(factoryCalls, 0);
});

Deno.test("selected operation failure remains a real-provider failure", async () => {
  const selection = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: "connector_papermark",
    providerWorkspaceId: "room_local",
    configuration: papermarkConfiguration(),
    factories: {
      papermark: () => new RecordingAdapter("papermark", "local-development"),
      fixture: () => new RecordingAdapter("fixture", "fixture"),
    },
  });

  assertEquals(selection.kind, "blocked");
  const result = await executeSelectedOperation(
    selection,
    "list_documents",
    () => Promise.reject({ status: 503, message: "provider unavailable" }),
  );

  assertEquals(result.ok, false);
  assert(result.ok === false);
  assertEquals(result.failure.code, "AUTHORIZATION_DENIED");
  assertEquals(result.failure.provider, "papermark");
});

Deno.test("selected operation callbacks require an IntegrationResult", () => {
  const rawCallback = () => Promise.resolve({ ok: true });
  // @ts-expect-error Raw ok:boolean payloads are not IntegrationResult values.
  const typedCallback: (
    adapter: IntegrationAdapter,
  ) => Promise<IntegrationResult<unknown>> = rawCallback;
  void typedCallback;
});

Deno.test("selection rejects adapters returning a different binding", async () => {
  const result = await selectProvider({
    mode: "configured",
    provider: "papermark",
    scope: integrationScope(),
    connectorAccountId: "connector_papermark",
    providerWorkspaceId: "room_local",
    configuration: papermarkConfiguration(),
    factories: {
      papermark: () =>
        new RecordingAdapter(
          "papermark",
          "local-development",
          integrationScope(),
          "connector_other",
          "room_other",
        ),
    },
  });

  assertBlocked(result, "unauthorized", "AUTHORIZATION_DENIED");
});

function assertBlocked(
  result: ProviderSelectionResult,
  reason:
    | "disabled"
    | "deferred"
    | "unconfigured"
    | "unavailable"
    | "unauthorized"
    | "invalid",
  code: string,
): void {
  assertEquals(result.kind, "blocked");
  assert(result.kind === "blocked");
  assertEquals(result.reason, reason);
  assertEquals(result.failure.code, code);
}

function papermarkConfiguration(
  endpoint = "http://localhost:3000/api",
  environment: "local-development" | "sandbox-certification" =
    "local-development",
) {
  return parseProviderConfiguration({
    provider: "papermark",
    lifecycle: "enabled",
    environment,
    endpoint,
    secretRef: { manager: "environment", name: "PAPER_MARK_SECRET" },
    activation: activation(),
  });
}

function activation() {
  return {
    approvalReference: "approval_papermark_local",
    providerVersion: "papermark-v1.0.0",
    license: "AGPLv3",
    deploymentModel: "self-hosted",
    region: "local",
    storageTopology: "postgres-object-store",
    rollbackOperator: "platform-on-call",
  } as const;
}

function integrationScope(): IntegrationScope {
  return parseIntegrationScope({
    tenantId: "tenant_northstar",
    workspaceId: "workspace_primary",
    dealId: "deal_solar-2026",
  });
}

class RecordingAdapter implements IntegrationAdapter {
  readonly documents: ScopedDocumentPort = new EmptyDocumentPort();
  readonly scope: IntegrationScope;

  constructor(
    readonly provider: "papermark" | "ideals" | "intralinks" | "fixture",
    readonly environment:
      | "interface-only"
      | "fixture"
      | "local-development"
      | "sandbox-certification",
    scope = integrationScope(),
    readonly connectorAccountId = `connector_${provider}`,
    readonly providerWorkspaceId = provider === "fixture"
      ? "room_fixture"
      : "room_local",
  ) {
    this.scope = scope;
  }

  readonly lifecycle = "enabled" as const;

  discoverCapabilities(): Promise<CapabilitySnapshot> {
    return Promise.resolve(createCapabilitySnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: this.provider === "fixture" ||
        this.environment !== "interface-only",
      source: this.provider === "fixture" ? "fixture" : "provider",
      scope: this.scope,
      requested: ["list_documents", "download_document"],
      observations: [
        { capability: "list_documents", status: "supported" },
        { capability: "download_document", status: "supported" },
      ],
      observedAt: new Date("2026-08-08T12:00:00.000Z"),
    }));
  }

  checkHealth(): Promise<HealthSnapshot> {
    return Promise.resolve(createHealthSnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: this.provider === "fixture" ||
        this.environment !== "interface-only",
      scope: this.scope,
      checks: [{ name: "fixture", state: "passed" }],
      observedAt: new Date("2026-08-08T12:00:00.000Z"),
    }));
  }
}

class EmptyDocumentPort implements ScopedDocumentPort {
  listDocuments(
    _request: never,
  ): Promise<IntegrationResult<ProviderDocumentPage>> {
    return Promise.resolve({ ok: true, value: { documents: [] } });
  }

  downloadDocument(
    _request: never,
  ): Promise<IntegrationResult<Uint8Array>> {
    return Promise.resolve({ ok: true, value: new Uint8Array() });
  }
}
