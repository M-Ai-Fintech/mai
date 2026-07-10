import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  sourcingAndKYBAgent,
  financialRiskAgent,
  legalDueDiligenceAgent,
  legalClosingAgent,
  AgentOrchestrator,
} from "../../src/agent/index.ts";

import {
  googleCloudPubSubTool,
  huggingFaceMcpTool,
  geminiGoogleSearchTool,
  databaseMemoryServiceTool,
  vdrStructuredAccessTool,
} from "../../src/agent/actions.ts";

import { LocalPubSubBus } from "../../src/core/pubsub/LocalPubSubBus.ts";
import { DatabaseMemoryService } from "../../src/core/db/DatabaseMemoryService.ts";

// Mock DatabaseMemoryService to avoid ECONNREFUSED in CI without DB
const originalQuery = DatabaseMemoryService.prototype.query;
DatabaseMemoryService.prototype.query = async function (text: string, params?: any[]) {
  if (text.includes("user_preferences")) {
    return { rows: [{ preferences: { defaultValuationMethod: "DCF" } }] };
  } else if (text.includes("flow_checkpoints")) {
    return { rows: [{ state: { step: "mocked" } }] };
  }
  return { rows: [] };
};

Deno.test("M&A E2E Flow: Sourcing -> DD -> Closing", async (t) => {
  const dealId = crypto.randomUUID();
  const correlationId = `corr_${crypto.randomUUID()}`;
  
  // 1. Database Memory Service Tool
  await t.step("Save preferences in Database Memory Service", async () => {
    const memResult = await databaseMemoryServiceTool.execute!({
      action: "save_user_preferences",
      userId: "broker_123",
      data: { preferCash: true, riskTolerance: "medium" },
    }, { runId: "test" } as any);
    assertEquals(memResult.success, true);
    
    const memFetch = await databaseMemoryServiceTool.execute!({
      action: "get_user_preferences",
      userId: "broker_123",
    }, { runId: "test" } as any);
    assertEquals(memFetch.success, true);
  });

  // 2. Pub/Sub and VDR Access
  await t.step("Request VDR access via Pub/Sub", async () => {
    const bus = LocalPubSubBus.getInstance();
    let responseReceived = false;

    bus.subscribe(`vdr_requests_response`, (data) => {
      if (data.dealId === dealId) {
        responseReceived = true;
      }
    });

    const pubsubResult = await googleCloudPubSubTool.execute!({
      topic: "vdr_requests",
      dealId: dealId,
      requester: "SourcingAgent",
      action: "request_vdr_access",
    }, { runId: "test" } as any);

    assertEquals(pubsubResult.success, true);
    assertExists(pubsubResult.documents);
    
    // Wait for the async callback
    await new Promise((resolve) => setTimeout(resolve, 100));
    assertEquals(responseReceived, true, "Pub/Sub response should be received");
  });

  // 3. Gemini Search Tool
  await t.step("Gemini Search Tool for Sourcing", async () => {
    const searchResult = await geminiGoogleSearchTool.execute!({
      query: "Reputação da empresa Tech Nova M&A",
      targetCompany: "Tech Nova",
      aspect: "reputation",
    }, { runId: "test" } as any);
    assertEquals(searchResult.success, true);
    assertExists(searchResult.summary);
  });

  // 4. Sourcing Agent
  await t.step("Sourcing Agent generates report", async () => {
    const response = await sourcingAndKYBAgent.generate(`Generate a sourcing report for deal ${dealId} with correlation ID ${correlationId}`);
    assertExists(response.text);
    assert(response.text.includes("MOCK") || response.text.length > 0);
  });

  // 5. ONNX Engine via HuggingFace MCP
  await t.step("ONNX Inference Engine for Financial Risk", async () => {
    const onnxResult = await huggingFaceMcpTool.execute!({
      task: "predict_insolvency",
      model: "onnx-risk-predictor-q8",
      inputData: {
        ebitda: 5000000,
        revenue: 20000000,
        totalAssets: 15000000,
        totalLiabilities: 8000000,
        operatingCashFlow: 3000000,
        historicalVolatility: 0.15,
      },
    }, { runId: "test" } as any);
    assertEquals(onnxResult.success, true);
    assertExists(onnxResult.prediction.insolvencyRiskScore);
  });

  // 6. Financial Risk Agent
  await t.step("Financial Risk Agent generates score", async () => {
    const response = await financialRiskAgent.generate(`Evaluate financial risk for deal ${dealId}. Correlation ID: ${correlationId}`);
    assertExists(response.text);
  });

  // 7. Legal DD Agent and VDR Structured Access
  await t.step("Legal Due Diligence and VDR compliance", async () => {
    const vdrAudit = await vdrStructuredAccessTool.execute!({
      action: "audit_compliance",
      dealId: dealId,
    }, { runId: "test" } as any);
    assertEquals(vdrAudit.success, true);
    
    const response = await legalDueDiligenceAgent.generate(`Perform legal DD for deal ${dealId}. Correlation ID: ${correlationId}`);
    assertExists(response.text);
  });

  // 8. Legal Closing Agent
  await t.step("Legal Closing Agent generates markdown preview", async () => {
    const response = await legalClosingAgent.generate(`Generate final closing preview markdown for deal ${dealId}. Correlation ID: ${correlationId}`);
    assertExists(response.text);
  });
  
  // 9. Check Orchestrator
  await t.step("AgentOrchestrator execution", async () => {
    const response = await AgentOrchestrator.executeAgentQuery(dealId, "What is the status of the deal?", "Context data");
    assertExists(response);
  });
});
