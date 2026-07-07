import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { TransformersEngine } from "../../src/engines/prediction/transformers.ts";
import { DatabaseMemoryService } from "../../src/core/db/memory_service.ts";
import { ClientSiloedRAG } from "../../src/agent/rag_layer.ts";
import { BrokerOrchestratorService } from "../../src/agent/agents/broker-orchestrator/index.ts";
import { AgentOrchestrator, ComplianceConflictError } from "../../src/agent/index.ts";

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
  const chunkCount = await ClientSiloedRAG.initializeSilo(dealId, "./non_existent_folder_test_offline");
  assertEquals(chunkCount > 0, true);

  // Query Silo (should use in-memory cosine similarity and return results)
  const results = await ClientSiloedRAG.querySilo(dealId, "financial results", 2);
  assertEquals(results.length, 2);
  assertEquals(typeof results[0].text, "string");
  assertEquals(typeof results[0].score, "number");
});

Deno.test("Continuous Learning - Compliance Conflict Detection", async () => {
  const service = new BrokerOrchestratorService();
  
  // Non-conflicting preference
  const normalResult = await service.processUserCorrection(
    "user_test",
    "user_preference",
    "adjustments",
    { valuation: 5000000 },
    "Adjusting valuation slightly based on market multiples"
  );
  assertEquals(normalResult.conflict, false);

  // Conflicting preference (LC 214/2025 split payment)
  const conflictResult1 = await service.processUserCorrection(
    "user_test",
    "user_preference",
    "adjustments",
    { cashPercentage: 0.1 },
    "We need to omit split payment and bypass LC 214/2025 completely"
  );
  assertEquals(conflictResult1.conflict, true);
  assertEquals(conflictResult1.conflictReason?.includes("LC 214/2025") || conflictResult1.conflictReason?.includes("split payment"), true);

  // Conflicting preference (Contingencies)
  const conflictResult2 = await service.processUserCorrection(
    "user_test",
    "user_preference",
    "adjustments",
    { valuation: 8000000 },
    "Omitir provisão de contingências para inflar a valuation"
  );
  assertEquals(conflictResult2.conflict, true);
  assertEquals(conflictResult2.conflictReason?.includes("contingencies") || conflictResult2.conflictReason?.includes("contingências"), true);
});

Deno.test("Continuous Learning - AgentOrchestrator throws ComplianceConflictError", async () => {
  const dealId = "deal_conflict_test";
  
  // 1. We register a conflicting preference in user_preferences table
  // (We do this by using a helper with conflict reason to test the trigger)
  const orchestrator = new BrokerOrchestratorService();
  const badPref = {
    dealId,
    variableName: "valuation",
    reason: "omitir contingência para fechar acordo rápido",
    requiresHitlApproval: true,
    hitlApproved: false,
    conflictReason: "Fiduciary Rule Conflict: Accounting norms require provisioning."
  };
  
  await orchestrator.processUserCorrection(
    "default_user",
    "user_preference",
    "adjustments",
    badPref,
    "omitir contingência"
  );

  // 2. Query execution should throw ComplianceConflictError
  await assertRejects(
    async () => {
      await AgentOrchestrator.executeAgentQuery(dealId, "Show valuation options", "some context");
    },
    ComplianceConflictError,
    "Fiduciary Rule Conflict"
  );

  // 3. Query execution with bypassConflict = true should not throw
  const response = await AgentOrchestrator.executeAgentQuery(dealId, "Show valuation options", "some context", true);
  assertEquals(typeof response, "string");
});
