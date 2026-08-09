import {
  assert,
  assertEquals,
  assertExists,
  assertMatch,
  assertThrows,
} from "@std/assert";
import {
  AGENT_DEFINITION_IDS,
  type AgentDefinition,
  agentDefinitionEnvelopeSchema,
  type AgentDefinitionId,
  agentProposalResultSchema,
  createAgentProposalResult,
  createDefinitionCatalog,
  CURRENT_DEFINITION_VERSIONS,
  GOVERNED_TOOL_NAMES,
  HUMAN_ONLY_EFFECTS,
  SPECIALIST_DEFINITIONS,
  type VerifiedAgentLineage,
} from "../../src/agent/definitions/index.ts";

const input = { dealId: "deal_definition_test", query: "review" };

Deno.test("governed catalog pins and validates all eight specialist definitions", () => {
  assertEquals(SPECIALIST_DEFINITIONS.length, 8);
  assertEquals(new Set(AGENT_DEFINITION_IDS).size, 8);

  const catalog = createDefinitionCatalog(SPECIALIST_DEFINITIONS);
  for (const id of AGENT_DEFINITION_IDS) {
    const definition = catalog.current(id);
    assertEquals(definition.id, id);
    assertEquals(definition.version, CURRENT_DEFINITION_VERSIONS[id]);
    assertEquals(
      agentDefinitionEnvelopeSchema.safeParse(definition).success,
      true,
    );
    assertExists(definition.inputValidator);
    assertExists(definition.outputValidator);
    assertExists(definition.knowledgeAssets[0]);
    assertMatch(definition.prompt.promptDigest, /^sha256:[0-9a-f]{64}$/);
    assertEquals(definition.artifactPolicy.authoritative, false);
    assertEquals(definition.artifactPolicy.providerReadiness, "not_claimed");
  }

  const sourcing = catalog.current("sourcing-kyb-agent");
  assertEquals(sourcing.inputValidator.safeParse(input).success, true);
  assertEquals(
    sourcing.outputSchemaReference.reference,
    "src/agent/agents/sourcing-kyb/schemas/output.ts",
  );
});

Deno.test("definitions enumerate every human-only effect and never allow one", () => {
  assertEquals(HUMAN_ONLY_EFFECTS.length, 17);
  for (const definition of SPECIALIST_DEFINITIONS) {
    for (const effect of HUMAN_ONLY_EFFECTS) {
      assert(definition.prohibitedEffects.includes(effect));
      assert(!definition.allowedCapabilities.includes(effect));
    }
  }
});

Deno.test("legacy or provider-dependent capabilities are explicit unavailable or denied results", () => {
  for (const definition of SPECIALIST_DEFINITIONS) {
    const unavailable = [
      ...definition.unavailableCapabilities,
      ...definition.deniedCapabilities,
    ];
    assert(unavailable.length > 0);
    assert(
      unavailable.every(({ reason }) => reason.trim().length > 0),
    );
    assert(
      unavailable.every(({ capability }) =>
        !definition.allowedCapabilities.includes(capability)
      ),
    );
  }

  const legacyUsers = SPECIALIST_DEFINITIONS.filter((definition) =>
    definition.legacyToolReferences.includes("vdrStructuredAccessTool")
  );
  assertEquals(legacyUsers.length, 3);
  assert(
    legacyUsers.every((definition) =>
      definition.deniedCapabilities.some(({ capability }) =>
        capability === "legacy.vdr-structured-access"
      )
    ),
  );
});

Deno.test("active definition tools are governed and legacy direct tools remain migration-only", () => {
  const directToolPattern =
    /(database|pubsub|provider|filesystem|memory|vdr|lora|fine[-_]?tuned)/i;
  for (const definition of SPECIALIST_DEFINITIONS) {
    for (const tool of definition.toolReferences) {
      assert(GOVERNED_TOOL_NAMES.includes(tool));
      assert(!directToolPattern.test(tool));
    }
    assert(
      definition.legacyToolReferences.some((tool) =>
        directToolPattern.test(tool)
      ),
    );
    assert(
      !definition.toolReferences.some((tool) =>
        String(tool) === "vdrStructuredAccessTool"
      ),
    );
  }
});

Deno.test("proposal results are non-authoritative and carry stable complete lineage", () => {
  const definition = SPECIALIST_DEFINITIONS[0];
  const result = createAgentProposalResult(
    definition,
    {
      kind: "proposal",
      value: { summary: "review proposed" },
    },
    trustedLineage(definition, {
      tools: [{ name: "evidence.search", activityId: "activity_1" }],
      evidence: [{
        sourceType: "document_version",
        sourceId: "document_1",
        version: 3,
        checksum: "a".repeat(64),
      }],
    }),
  );

  assertEquals(agentProposalResultSchema.safeParse(result).success, true);
  assertEquals(result.artifact.reversible, true);
  assertEquals(result.artifact.authoritative, false);
  assertEquals(result.artifact.providerReadiness, "not_claimed");
  assertEquals(result.lineage.definition.id, definition.id);
  assertEquals(result.lineage.definition.version, definition.version);
  assertEquals(
    result.lineage.prompt.promptDigest,
    definition.prompt.promptDigest,
  );
  assertEquals(result.lineage.tools[0].activityId, "activity_1");
  assertEquals(result.lineage.evidence[0].version, 3);
  assertEquals(result.providerReadinessClaimed, false);
});

Deno.test("catalog rejects duplicate definition versions and selects historical versions without rewriting lineage", () => {
  const current = SPECIALIST_DEFINITIONS[0];
  assertThrows(
    () => createDefinitionCatalog([current, current]),
    Error,
    "duplicated",
  );

  const historical: AgentDefinition = {
    ...current,
    version: "0.9.0",
    prompt: { ...current.prompt, templateVersion: "0.9.0" },
  };
  const catalog = createDefinitionCatalog(
    [...SPECIALIST_DEFINITIONS, historical],
    CURRENT_DEFINITION_VERSIONS,
  );
  assertEquals(catalog.current(current.id).version, "1.0.0");
  assertEquals(catalog.select(current.id, "0.9.0").version, "0.9.0");
  assertEquals(catalog.rollback(current.id, "0.9.0").mode, "rollback");
  assertEquals(catalog.current(current.id).version, "1.0.0");

  const result = createAgentProposalResult(
    catalog.select(current.id, "0.9.0"),
    {
      kind: "proposal",
      value: { historical: true },
    },
    trustedLineage(catalog.select(current.id, "0.9.0")),
  );
  assertEquals(result.lineage.definition.version, "0.9.0");
  assertEquals(result.lineage.prompt.templateVersion, "0.9.0");
  assertEquals(result.lineage.definition.version === "1.0.0", false);
});

Deno.test("catalog reports missing pinned versions instead of silently choosing one", () => {
  const current = SPECIALIST_DEFINITIONS[0];
  assertThrows(
    () => {
      createDefinitionCatalog(
        SPECIALIST_DEFINITIONS,
        { ...CURRENT_DEFINITION_VERSIONS, [current.id]: "9.9.9" },
      );
    },
    Error,
    "pinned",
  );
});

Deno.test("catalog selections are immutable snapshots", () => {
  const catalog = createDefinitionCatalog(SPECIALIST_DEFINITIONS);
  const selected = catalog.current("broker-orchestrator-agent");
  const allowed = [...selected.allowedCapabilities];

  assertEquals(Object.isFrozen(selected), true);
  assertEquals(Object.isFrozen(selected.allowedCapabilities), true);
  assertEquals(Object.isFrozen(selected.modelPolicy), true);
  assertThrows(
    () => (selected.allowedCapabilities as string[]).push("forged.capability"),
    TypeError,
  );
  assertThrows(
    () => ((selected.modelPolicy as { provider: string }).provider = "forged"),
    TypeError,
  );
  assertEquals(catalog.current(selected.id).allowedCapabilities, allowed);
});

Deno.test("definition envelopes reject unknown sensitive fields before registration", () => {
  const current = SPECIALIST_DEFINITIONS[0];
  const adversarial = {
    ...current,
    providerClient: { apiKey: "secret" },
    modelPolicy: {
      ...current.modelPolicy,
      providerClient: { apiKey: "secret" },
    },
    capabilities: {
      ...current.capabilities,
      rawClient: { secret: "value" },
    },
    knowledgeAssets: [
      {
        ...current.knowledgeAssets[0],
        secrets: { apiKey: "secret" },
      },
      ...current.knowledgeAssets.slice(1),
    ],
  };

  assertEquals(
    agentDefinitionEnvelopeSchema.safeParse(adversarial).success,
    false,
  );
  assertThrows(
    () => createDefinitionCatalog([adversarial as AgentDefinition]),
    Error,
    "Unrecognized key",
  );
});

type KnownAgentDefinitionId = AgentDefinitionId;
const _typeCheck: KnownAgentDefinitionId = "broker-orchestrator-agent";
assertEquals(_typeCheck, "broker-orchestrator-agent");

function trustedLineage(
  definition: AgentDefinition,
  overrides: Partial<VerifiedAgentLineage> = {},
): VerifiedAgentLineage {
  return {
    definition: { id: definition.id, version: definition.version },
    prompt: definition.prompt,
    modelPolicyReference: definition.modelPolicy.policyReference,
    model: {
      policyReference: definition.modelPolicy.policyReference,
      provider: definition.modelPolicy.provider,
      model: definition.modelPolicy.model,
      modelVersion: definition.modelPolicy.modelVersion,
    },
    tools: [],
    evidence: [],
    ...overrides,
  };
}
