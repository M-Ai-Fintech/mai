import { assertEquals } from "@std/assert";
import {
  googleCloudPubSubTool,
  huggingFaceMcpTool,
  vdrStructuredAccessTool,
} from "../../src/agent/actions.ts";
import { LocalPubSubBus } from "../../src/core/pubsub/LocalPubSubBus.ts";
import { testToolContext } from "../support/tool_context.ts";
import { requireArray, requireRecord } from "../support/value_guards.ts";

async function requestVdrAccess(dealId: string): Promise<void> {
  const bus = LocalPubSubBus.getInstance();
  const response = new Promise<Record<string, unknown>>((resolve) => {
    bus.subscribe("vdr_requests_response", (payload) => {
      const message = requireRecord(payload);
      if (message.dealId === dealId) resolve(message);
    });
  });
  const output = await googleCloudPubSubTool.execute!({
    topic: "vdr_requests",
    dealId,
    requester: "SourcingAgent",
    action: "request_vdr_access",
  }, testToolContext);
  assertEquals(requireRecord(output).success, true);
  assertEquals((await response).status, "success");
}

async function predictFinancialRisk(): Promise<void> {
  const output = await huggingFaceMcpTool.execute!({
    task: "predict_insolvency",
    model: "onnx-risk-predictor-q8",
    inputData: {
      ebitda: 5_000_000,
      revenue: 20_000_000,
      totalAssets: 15_000_000,
      totalLiabilities: 8_000_000,
      operatingCashFlow: 3_000_000,
      historicalVolatility: 0.15,
    },
  }, testToolContext);
  const result = requireRecord(output);
  const prediction = requireRecord(result.prediction);
  assertEquals(result.success, true);
  assertEquals(typeof prediction.insolvencyRiskScore, "number");
}

async function auditVdrCompleteness(dealId: string): Promise<void> {
  const output = await vdrStructuredAccessTool.execute!({
    action: "audit_compliance",
    dealId,
  }, testToolContext);
  const result = requireRecord(output);
  assertEquals(result.success, true);
  assertEquals(typeof result.status, "string");
  requireArray(result.missingCategories, "missingCategories");
}

Deno.test("M&A deterministic tool flow: sourcing to due diligence", async (test) => {
  const dealId = `deal_${crypto.randomUUID()}`;
  const bus = LocalPubSubBus.getInstance();
  bus.clear();

  await test.step("requests VDR access", () => requestVdrAccess(dealId));
  await test.step("predicts financial risk", predictFinancialRisk);
  await test.step(
    "audits VDR document completeness",
    () => auditVdrCompleteness(dealId),
  );
});
