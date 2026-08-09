import { assertEquals, assertRejects } from "@std/assert";
import {
  type AgentDefinition,
  createDefinitionCatalog,
  createSpecialistDefinitionCatalog,
} from "../../src/agent/governed.ts";
import {
  createGovernedSpecialist,
  type GovernedProposalPort,
  type GovernedProposalRequest,
  type GovernedProposalResponse,
} from "../../src/agent/governed.ts";

class RecordingProposalPort implements GovernedProposalPort {
  readonly requests: GovernedProposalRequest[] = [];

  constructor(private readonly response: GovernedProposalResponse) {}

  propose(
    request: GovernedProposalRequest,
  ): Promise<GovernedProposalResponse> {
    this.requests.push(request);
    return Promise.resolve(this.response);
  }
}

const proposedOutput = {
  success: true,
  response: "Review proposal prepared from exact evidence.",
  timestamp: "2026-08-08T12:00:00.000Z",
};

Deno.test("all pinned specialists emit schema-valid non-authoritative proposals", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  for (
    const id of [
      "broker-orchestrator-agent",
      "deal-matching-agent",
      "financial-risk-agent",
      "general-dd-agent",
      "legal-closing-agent",
      "legal-dd-agent",
      "negotiation-agent",
      "sourcing-kyb-agent",
    ] as const
  ) {
    const port = new RecordingProposalPort({
      status: "proposed",
      value: proposedOutput,
      tools: [{
        name: "governed.evidence.search",
        activityId: "activity_exact_evidence",
        capability: "read",
        status: "succeeded",
      }],
      evidence: [{
        sourceType: "document_version",
        sourceId: "docv_contract_v2",
        version: 2,
        checksum: "a".repeat(64),
      }],
    });
    const agent = createGovernedSpecialist(catalog, id, port);
    const result = await agent.propose({
      input: { dealId: "deal_horizon", query: "Prepare a proposal." },
      capability: "evidence.search",
    });

    assertEquals(result.status, "proposed");
    assertEquals(result.artifact.authoritative, false);
    assertEquals(result.artifact.reversible, true);
    assertEquals(result.providerReadinessClaimed, false);
    assertEquals(result.lineage.definition.id, id);
    assertEquals(
      result.lineage.definition.version,
      catalog.current(id).version,
    );
    assertEquals(result.lineage.toolActivityIds, [
      "activity_exact_evidence",
    ]);
    assertEquals(port.requests.length, 1);
  }
});

Deno.test("unavailable and prohibited capabilities never reach a proposal port", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const port = new RecordingProposalPort({
    status: "proposed",
    value: proposedOutput,
  });
  const agent = createGovernedSpecialist(
    catalog,
    "sourcing-kyb-agent",
    port,
  );

  const unavailable = await agent.propose({
    input: { dealId: "deal_horizon", query: "Search a registry." },
    capability: "provider.registry-verification",
  });
  const denied = await agent.propose({
    input: { dealId: "deal_horizon", query: "Release the result." },
    capability: "release",
  });

  assertEquals(unavailable.status, "unavailable");
  assertEquals(denied.status, "denied");
  assertEquals(port.requests.length, 0);
});

Deno.test("proposal output must satisfy the selected specialist schema", async () => {
  const catalog = createSpecialistDefinitionCatalog();
  const port = new RecordingProposalPort({
    status: "proposed",
    value: { success: true, response: "Missing timestamp." },
  });
  const agent = createGovernedSpecialist(
    catalog,
    "legal-dd-agent",
    port,
  );

  await assertRejects(
    () =>
      agent.propose({
        input: { dealId: "deal_horizon", query: "Review contracts." },
        capability: "evidence.search",
      }),
    Error,
  );
});

Deno.test("historical selection preserves the selected definition in lineage", async () => {
  const current = createSpecialistDefinitionCatalog().current(
    "broker-orchestrator-agent",
  );
  const historical = {
    ...current,
    version: "0.9.0",
  } as AgentDefinition;
  const catalog = createSpecialistDefinitionCatalogWith(historical);
  const port = new RecordingProposalPort({
    status: "proposed",
    value: proposedOutput,
  });
  const agent = createGovernedSpecialist(
    catalog,
    "broker-orchestrator-agent",
    port,
    "0.9.0",
  );

  const result = await agent.propose({
    input: { dealId: "deal_horizon", query: "Route this request." },
    capability: "evidence.search",
  });

  assertEquals(result.lineage.definition.version, "0.9.0");
  assertEquals(catalog.current("broker-orchestrator-agent").version, "1.0.0");
});

function createSpecialistDefinitionCatalogWith(
  historical: AgentDefinition,
) {
  const catalog = createSpecialistDefinitionCatalog();
  const definitions = [
    historical,
    ...[
      "broker-orchestrator-agent",
      "deal-matching-agent",
      "financial-risk-agent",
      "general-dd-agent",
      "legal-closing-agent",
      "legal-dd-agent",
      "negotiation-agent",
      "sourcing-kyb-agent",
    ].map((id) => catalog.current(id as AgentDefinition["id"])),
  ];
  return importCatalog(definitions);
}

function importCatalog(definitions: readonly AgentDefinition[]) {
  return createDefinitionCatalog(definitions);
}
