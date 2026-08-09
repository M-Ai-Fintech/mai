import { assertEquals, assertRejects } from "@std/assert";
import {
  AGENT_DEFINITION_IDS,
  brokerOrchestratorAgent,
  createSpecialistDefinitionCatalog,
  dealMatchingAgent,
  financialRiskAgent,
  generalDueDiligenceAgent,
  legalClosingAgent,
  legalDueDiligenceAgent,
  negotiationAgent,
  sourcingAndKYBAgent,
} from "../../src/agent/index.ts";

const legacyAdapters = [
  brokerOrchestratorAgent,
  sourcingAndKYBAgent,
  generalDueDiligenceAgent,
  financialRiskAgent,
  legalDueDiligenceAgent,
  dealMatchingAgent,
  negotiationAgent,
  legalClosingAgent,
];

Deno.test("Agent Configuration - governed definitions are active", () => {
  const catalog = createSpecialistDefinitionCatalog();
  assertEquals(AGENT_DEFINITION_IDS.length, legacyAdapters.length);
  for (const definitionId of AGENT_DEFINITION_IDS) {
    assertEquals(catalog.current(definitionId).version, "1.0.0");
  }
});

Deno.test("legacy agent export adapters fail closed without Mastra", async () => {
  for (const adapter of legacyAdapters) {
    assertEquals(adapter.name, adapter.id);
    await assertRejects(
      () => adapter.generate("the raw agent path must stay disabled"),
      Error,
      "LEGACY_RAW_AGENT_EXECUTION_DISABLED",
    );
  }
});
