import { assertEquals } from "@std/assert";
import { TransformersEngine } from "../../src/engines/prediction/transformers.ts";
import { ClientSiloedRAG } from "../../src/agent/rag_layer.ts";
import { BrokerOrchestratorService } from "../../src/agent/agents/broker-orchestrator/index.ts";
import { AgentOrchestrator, buildBrokerPrompt } from "../../src/agent/index.ts";

const TEST_USER = "user_test";
type CorrectionResult = Awaited<
  ReturnType<BrokerOrchestratorService["processUserCorrection"]>
>;

async function processCorrection(
  variables: Record<string, number>,
  reason: string,
): Promise<CorrectionResult> {
  const service = new BrokerOrchestratorService();
  return await service.processUserCorrection(
    TEST_USER,
    "user_preference",
    "adjustments",
    variables,
    reason,
  );
}

async function assertNormalCorrection(): Promise<void> {
  // Non-conflicting preference
  const result = await processCorrection(
    { valuation: 5000000 },
    "Adjusting valuation slightly based on market multiples",
  );
  assertEquals(result.success, false);
  assertEquals(result.status, "unsupported");
  assertEquals(result.reason, "LEGACY_CONTINUOUS_LEARNING_DISABLED");
  assertEquals(result.conflict, false);
}

async function assertSplitPaymentConflict(): Promise<void> {
  // Conflicting preference (LC 214/2025 split payment)
  const result = await processCorrection(
    { cashPercentage: 0.1 },
    "We need to omit split payment and bypass LC 214/2025 completely",
  );
  assertEquals(result.success, false);
  assertEquals(result.status, "unsupported");
  assertEquals(result.reason, "LEGACY_CONTINUOUS_LEARNING_DISABLED");
  assertEquals(result.conflict, true);
  assertEquals(
    result.conflictReason?.includes("LC 214/2025"),
    true,
  );
  assertEquals(result.conflictReason?.includes("split payment"), true);
}

async function assertContingencyConflict(): Promise<void> {
  // Conflicting preference (Contingencies)
  const result = await processCorrection(
    { valuation: 8000000 },
    "Omit contingency provisions to inflate the valuation",
  );
  assertEquals(result.success, false);
  assertEquals(result.status, "unsupported");
  assertEquals(result.reason, "LEGACY_CONTINUOUS_LEARNING_DISABLED");
  assertEquals(result.conflict, true);
  assertEquals(result.conflictReason?.includes("contingencies"), true);
}

Deno.test("Continuous Learning - Local Embedding Generation", async () => {
  const text = "Test preference for valuation and cash percentage";
  const embedding = await TransformersEngine.generateEmbedding(text);

  assertEquals(Array.isArray(embedding), true);
  assertEquals(embedding.length, 384);
  assertEquals(typeof embedding[0], "number");
});

Deno.test("Continuous Learning - ClientSiloedRAG In-Memory Fallback when DB is offline", async () => {
  const dealId = "deal_test_offline";

  // Initialize Silo (should fall back to in-memory silo when DB throws connection refuse)
  const chunkCount = await ClientSiloedRAG.initializeSilo(
    dealId,
    "./non_existent_folder_test_offline",
  );
  assertEquals(chunkCount > 0, true);

  // Query Silo (should use in-memory cosine similarity and return results)
  const results = await ClientSiloedRAG.querySilo(
    dealId,
    "financial results",
    2,
  );
  assertEquals(results.length, 2);
  assertEquals(typeof results[0].text, "string");
  assertEquals(typeof results[0].score, "number");
});

Deno.test("Legacy correction fence preserves non-authoritative conflict classification", async () => {
  await assertNormalCorrection();
  await assertSplitPaymentConflict();
  await assertContingencyConflict();
});

Deno.test("AgentOrchestrator uses caller context without legacy feedback retrieval", async () => {
  const response = await AgentOrchestrator.executeAgentQuery(
    "deal_context_only",
    "Show valuation options",
    "Trusted caller context",
  );
  assertEquals(typeof response, "string");
});

Deno.test("broker prompt contains only caller context and the requested instruction", () => {
  const prompt = buildBrokerPrompt(
    "deal_context_only",
    "Show valuation options",
    "Trusted caller context",
  );
  assertEquals(prompt.includes("Trusted caller context"), true);
  assertEquals(prompt.includes("Show valuation options"), true);
  assertEquals(prompt.includes("Continuous Learning"), false);
  assertEquals(prompt.includes("Legal/Tax Domain Knowledge"), false);
});
