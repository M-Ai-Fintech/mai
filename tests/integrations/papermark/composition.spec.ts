import { assert, assertEquals } from "@std/assert";
import {
  action,
  type ActorReference,
  resourceKind,
  type RoleFact,
} from "../../../src/platform/authz/v1.ts";
import {
  parseRequestContext,
  type RequestContext,
} from "../../../src/shared/contracts/request_context.ts";
import {
  type ActorId,
  parseActorId,
} from "../../../src/shared/contracts/identifiers.ts";
import {
  parseProviderConfiguration,
  parseSecretReference,
} from "../../../src/integrations/configuration.ts";
import {
  type IntegrationScope,
  parseIntegrationScope,
} from "../../../src/integrations/contracts.ts";
import {
  parsePapermarkAdapterConfig,
} from "../../../src/integrations/papermark/config.ts";
import { PapermarkIntegrationAdapter } from "../../../src/integrations/papermark/adapter.ts";
import {
  type PapermarkAuthorizationInput,
  type PapermarkIntegrationCompositionInput,
  selectAuthorizedPapermarkProvider,
} from "../../../src/integrations/papermark/composition.ts";
import {
  createPapermarkSyntheticTestBundle,
} from "./support/synthetic_test_bundle.ts";
import type { PapermarkAuthorizationRequest } from "../../../src/integrations/papermark/authorization.ts";

const scope = parseIntegrationScope({
  tenantId: "tenant_acme",
  workspaceId: "workspace_horizon",
  dealId: "deal_horizon",
});
const actor: ActorReference = {
  id: actorId("actor_operator"),
  kind: "human",
  state: "active",
};
const context = createContext();

Deno.test("authorized local composition constructs and invokes the real adapter", async () => {
  const { input, bundle } = compositionInput();
  let factoryCalls = 0;
  const selected = await selectAuthorizedPapermarkProvider({
    ...input,
    adapterFactory: (config, dependencies) => {
      factoryCalls += 1;
      assert(dependencies.authorization !== undefined);
      return new PapermarkIntegrationAdapter(config, dependencies);
    },
  });

  assertEquals(selected.kind, "configured");
  assertEquals(factoryCalls, 1);
  if (selected.kind !== "configured") return;
  assertEquals(selected.providerResourceId, "dataroom_horizon");
  const result = await selected.adapter.documents.listDocuments({
    scope,
    providerResourceId: "dataroom_horizon",
  });
  assertEquals(result.ok, true);
  assertEquals(
    bundle.controls.fetch.calls[0].url,
    "http://localhost:3000/api/v1/datarooms/dataroom_horizon/documents?folder_id=folder_horizon&limit=50",
  );
});

Deno.test("actor and context mismatch are denied before adapter factory construction", async () => {
  let factoryCalls = 0;
  const { input } = compositionInput();
  const result = await selectAuthorizedPapermarkProvider({
    ...input,
    actor: { ...actor, id: actorId("actor_other") },
    adapterFactory: () => {
      factoryCalls += 1;
      throw new Error("factory must not run");
    },
  });

  assertBlocked(result, "unauthorized");
  assertEquals(factoryCalls, 0);
});

Deno.test("cross-scope and provider identity mismatches are denied before construction", async () => {
  const cases = [
    {
      scope: { ...scope, tenantId: "tenant_other" },
      connectorAccount: {
        id: "connector_other",
        provider: "papermark" as const,
        tenantId: "tenant_other" as typeof scope.tenantId,
      },
    },
    { scope: { ...scope, workspaceId: "workspace_other" } },
    { scope: { ...scope, dealId: "deal_other" } },
    {
      connectorAccount: {
        id: "connector_other",
        provider: "papermark" as const,
        tenantId: scope.tenantId,
      },
    },
    { dataRoomId: "dataroom_other" },
    { dataRoomFolderId: "folder_other" },
  ];
  for (const change of cases) {
    let factoryCalls = 0;
    const { input } = compositionInput();
    const result = await selectAuthorizedPapermarkProvider({
      ...input,
      ...change,
      adapterFactory: () => {
        factoryCalls += 1;
        throw new Error("factory must not run");
      },
    } as PapermarkIntegrationCompositionInput);
    assertBlocked(result, "unauthorized");
    assertEquals(factoryCalls, 0);
  }
});

Deno.test("revoked current authorization blocks the call before secret resolution or fetch", async () => {
  const { input, bundle } = compositionInput();
  let revoked = false;
  const authorization: PapermarkAuthorizationInput = {
    policy: input.authorization.policy,
    currentRequest: () =>
      authorizationRequest(input, revoked ? [] : roleFacts(scope)),
  };
  const selected = await selectAuthorizedPapermarkProvider({
    ...input,
    authorization,
  });
  assertEquals(selected.kind, "configured");
  if (selected.kind !== "configured") return;
  revoked = true;

  const result = await selected.adapter.documents.listDocuments({
    scope,
    providerResourceId: "dataroom_horizon",
  });
  assertEquals(result.ok, false);
  assertEquals(bundle.controls.secret.calls.length, 0);
  assertEquals(bundle.controls.fetch.calls.length, 0);
});

Deno.test("configured construction failure does not invoke a fixture path", async () => {
  const { input, bundle } = compositionInput();
  const result = await selectAuthorizedPapermarkProvider({
    ...input,
    adapterFactory: () => {
      throw new Error("configured provider unavailable");
    },
  });

  assertBlocked(result, "unavailable");
  assertEquals(bundle.controls.secret.calls.length, 0);
  assertEquals(bundle.controls.fetch.calls.length, 0);
});

function compositionInput(): {
  readonly input: PapermarkIntegrationCompositionInput;
  readonly bundle: ReturnType<typeof createPapermarkSyntheticTestBundle>;
} {
  const configuration = parseProviderConfiguration({
    provider: "papermark",
    lifecycle: "enabled",
    environment: "local-development",
    endpoint: "http://localhost:3000/api",
    secretRef: parseSecretReference({
      manager: "environment",
      name: "PAPERMARK_BEARER_TOKEN",
    }),
    activation: {
      approvalReference: "approval_papermark_local",
      providerVersion: "papermark-v1.0.0",
      apiScopes: ["datarooms.read"],
      license: "AGPLv3",
      deploymentModel: "self-hosted",
      region: "local",
      storageTopology: "postgres-object-store",
      rollbackOperator: "platform-on-call",
    },
  });
  const adapterConfig = parsePapermarkAdapterConfig({
    configuration,
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
    dataRoomFolderId: "folder_horizon",
  });
  const bundle = createPapermarkSyntheticTestBundle(adapterConfig, {
    responses: [new Response(JSON.stringify({ data: [], next_cursor: null }))],
  });
  return {
    input: {
      context,
      actor,
      scope,
      connectorAccount: adapterConfig.binding.connectorAccount,
      providerAccount: adapterConfig.binding.providerAccount,
      dataRoomId: adapterConfig.binding.dataRoomId,
      dataRoomFolderId: adapterConfig.binding.dataRoomFolderId,
      configuration,
      capability: "list_documents",
      authorization: {
        policy: {
          resource: {
            kind: resourceKind("papermark_dataroom"),
            id: "dataroom_horizon",
          },
          action: action("list_documents"),
          capability: "list_documents",
          connectorAccountId: "connector_papermark",
          providerAccountId: "account_papermark",
          providerTeamId: "team_papermark",
          dataRoomId: "dataroom_horizon",
          dataRoomFolderId: "folder_horizon",
          requestedFields: [],
          roleFacts: roleFacts(scope),
          grantFacts: [],
          restrictionFacts: [],
          relationshipFacts: [],
          clock: { now: () => "2026-08-09T12:00:00.000Z" },
        },
      },
      dependencies: bundle.dependencies,
    },
    bundle,
  };
}

function createContext(): RequestContext {
  const result = parseRequestContext({
    actorId: actor.id,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    dealId: scope.dealId,
    correlationId: "cor_composition",
    origin: "internal",
  });
  if (result.ok) return result.value;
  throw new Error("Composition test context could not be created.");
}

function actorId(value: string): ActorId {
  const result = parseActorId(value);
  if (result.ok) return result.value;
  throw new Error("Composition test actor could not be created.");
}

function roleFacts(currentScope: IntegrationScope): readonly RoleFact[] {
  return [{
    id: "role_integration_operator",
    scope: currentScope,
    resourceKinds: [resourceKind("papermark_dataroom")],
    actions: [action("list_documents")],
    fields: [],
  }];
}

function authorizationRequest(
  input: PapermarkIntegrationCompositionInput,
  facts: readonly RoleFact[],
): PapermarkAuthorizationRequest {
  return {
    ...input.authorization.policy,
    context: input.context,
    actor: input.actor,
    scope: input.scope,
    capability: input.capability,
    connectorAccountId: input.connectorAccount.id,
    providerAccountId: input.providerAccount.accountId,
    providerTeamId: input.providerAccount.teamId,
    dataRoomId: input.dataRoomId,
    dataRoomFolderId: input.dataRoomFolderId,
    roleFacts: facts,
  };
}

function assertBlocked(
  result: Awaited<ReturnType<typeof selectAuthorizedPapermarkProvider>>,
  reason: "unauthorized" | "unavailable",
): void {
  assertEquals(result.kind, "blocked");
  assert(result.kind === "blocked");
  assertEquals(result.reason, reason);
}
