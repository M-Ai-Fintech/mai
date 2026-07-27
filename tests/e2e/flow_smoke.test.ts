import { assert, assertExists } from "@std/assert";
import {
  AgentOrchestrator,
  financialRiskAgent,
  legalClosingAgent,
  legalDueDiligenceAgent,
  sourcingAndKYBAgent,
} from "../../src/agent/index.ts";

const liveSmokeEnabled = Deno.env.get("RUN_LIVE_E2E") === "1";

async function assertAgentResponse(
  generate: (prompt: string) => Promise<{ text: string }>,
  prompt: string,
): Promise<void> {
  const response = await generate(prompt);
  assertExists(response.text);
  assert(
    !response.text.includes("[DRY-RUN/MOCK]"),
    "Live smoke expected a real model response.",
  );
}

async function runAgentSmoke(dealId: string, correlationId: string) {
  await assertAgentResponse(
    (prompt) => sourcingAndKYBAgent.generate(prompt),
    `Generate a sourcing report for deal ${dealId}. ${correlationId}`,
  );
  await assertAgentResponse(
    (prompt) => financialRiskAgent.generate(prompt),
    `Evaluate financial risk for deal ${dealId}. ${correlationId}`,
  );
  await assertAgentResponse(
    (prompt) => legalDueDiligenceAgent.generate(prompt),
    `Perform legal DD for deal ${dealId}. ${correlationId}`,
  );
  await assertAgentResponse(
    (prompt) => legalClosingAgent.generate(prompt),
    `Generate final closing preview for deal ${dealId}. ${correlationId}`,
  );
}

async function runOrchestratorSmoke(dealId: string): Promise<void> {
  const response = await AgentOrchestrator.executeAgentQuery(
    dealId,
    "What is the status of the deal?",
    "Live integration smoke context",
  );
  assertExists(response);
  assert(
    !response.includes("[DRY-RUN/MOCK]"),
    "Live smoke expected a real orchestrator response.",
  );
}

Deno.test({
  name: "M&A live agent flow: sourcing through closing",
  ignore: !liveSmokeEnabled,
  fn: async () => {
    const dealId = crypto.randomUUID();
    const correlationId = `correlation_${crypto.randomUUID()}`;
    await runAgentSmoke(dealId, correlationId);
    await runOrchestratorSmoke(dealId);
  },
});
