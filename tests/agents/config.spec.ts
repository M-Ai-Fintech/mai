import { assertEquals } from "@std/assert";
import {
  brokerOrchestratorAgent,
  dealMatchingAgent,
  financialRiskAgent,
  generalDueDiligenceAgent,
  legalClosingAgent,
  legalDueDiligenceAgent,
  negotiationAgent,
  sourcingAndKYBAgent,
} from "../../src/agent/index.ts";

Deno.test("Agent Configuration - All agents are properly instantiated", () => {
  assertEquals(brokerOrchestratorAgent.name, "BrokerOrchestratorAgent");
  assertEquals(sourcingAndKYBAgent.name, "SourcingAndKYBAgent");
  assertEquals(generalDueDiligenceAgent.name, "GeneralDueDiligenceAgent");
  assertEquals(financialRiskAgent.name, "FinancialRiskAgent");
  assertEquals(legalDueDiligenceAgent.name, "LegalDueDiligenceAgent");
  assertEquals(dealMatchingAgent.name, "DealMatchingAgent");
  assertEquals(negotiationAgent.name, "NegotiationAgent");
  assertEquals(legalClosingAgent.name, "LegalClosingAgent");
});
