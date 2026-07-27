import { assertEquals, assertRejects } from "@std/assert";
import { TransformersEngine } from "../../src/engines/prediction/transformers.ts";
import { ClientSiloedRAG } from "../../src/agent/rag_layer.ts";
import { BrokerOrchestratorService } from "../../src/agent/agents/broker-orchestrator/index.ts";
import {
  AgentOrchestrator,
  ComplianceConflictError,
} from "../../src/agent/index.ts";

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

function assertConflictMentions(
  result: Awaited<ReturnType<typeof processCorrection>>,
  expectedTerms: string[],
): void {
  assertEquals(result.conflict, true);
  const mentionsExpectedTerm = expectedTerms.some((term) =>
    result.conflictReason?.includes(term)
  );
  assertEquals(mentionsExpectedTerm, true);
}

async function registerConflictingPreference(dealId: string): Promise<void> {
  const orchestrator = new BrokerOrchestratorService();
  const badPref = {
    dealId,
    variableName: "valuation",
    reason: "omit contingency to close the deal quickly",
    requiresHitlApproval: true,
    hitlApproved: false,
    conflictReason:
      "Fiduciary Rule Conflict: Accounting norms require provisioning.",
  };
  await orchestrator.processUserCorrection(
    "default_user",
    "user_preference",
    "adjustments",
    badPref,
    "omit contingency",
  );
}

async function assertBlockedAgentQuery(dealId: string): Promise<void> {
  await assertRejects(
    async () => {
      await AgentOrchestrator.executeAgentQuery(
        dealId,
        "Show valuation options",
        "some context",
      );
    },
    ComplianceConflictError,
    "Fiduciary Rule Conflict",
  );
}

async function assertNormalCorrection(): Promise<void> {
  // Non-conflicting preference
  const result = await processCorrection(
    { valuation: 5000000 },
    "Adjusting valuation slightly based on market multiples",
  );
  assertEquals(result.conflict, false);
}

async function assertSplitPaymentConflict(): Promise<void> {
  // Conflicting preference (LC 214/2025 split payment)
  const result = await processCorrection(
    { cashPercentage: 0.1 },
    "We need to omit split payment and bypass LC 214/2025 completely",
  );
  assertConflictMentions(result, ["LC 214/2025", "split payment"]);
}

async function assertContingencyConflict(): Promise<void> {
  // Conflicting preference (Contingencies)
  const result = await processCorrection(
    { valuation: 8000000 },
    "Omit contingency provisions to inflate the valuation",
  );
  assertConflictMentions(result, ["contingencies"]);
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

Deno.test("Continuous Learning - Compliance Conflict Detection", async () => {
  await assertNormalCorrection();
  await assertSplitPaymentConflict();
  await assertContingencyConflict();
});

Deno.test("Continuous Learning - AgentOrchestrator throws ComplianceConflictError", async () => {
  const dealId = "deal_conflict_test";

  // 1. We register a conflicting preference in user_preferences table
  // (We do this by using a helper with conflict reason to test the trigger)
  await registerConflictingPreference(dealId);

  // 2. Query execution should throw ComplianceConflictError
  await assertBlockedAgentQuery(dealId);

  // 3. Query execution with bypassConflict = true should not throw
  const response = await AgentOrchestrator.executeAgentQuery(
    dealId,
    "Show valuation options",
    "some context",
    true,
  );
  assertEquals(typeof response, "string");
});
