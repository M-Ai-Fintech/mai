import { assertEquals, assertNotEquals } from "@std/assert";
import {
  googleCloudPubSubTool,
  mcpDatabaseTool,
  huggingFaceMcpTool,
  geminiGoogleSearchTool
} from "../src/agent/actions.ts";
import { LocalPubSubBus } from "../src/core/pubsub/LocalPubSubBus.ts";

Deno.test("LocalPubSubBus - Publish and Subscribe real messaging flow", () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();

  let receivedData: any = null;
  bus.subscribe("test_topic", (data: any) => {
    receivedData = data;
  });

  const payload = { hello: "world", test: true };
  bus.publish("test_topic", payload);

  assertNotEquals(receivedData, null);
  assertEquals(receivedData.hello, "world");
  assertEquals(receivedData.test, true);
});

Deno.test("googleCloudPubSubTool - Publishes and returns success and handles request_vdr_access", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();

  let responseData: any = null;
  bus.subscribe("vdr_requests_response", (data: any) => {
    responseData = data;
  });

  const result = await googleCloudPubSubTool.execute!({
    topic: "vdr_requests",
    action: "request_vdr_access",
    dealId: "deal_1",
    requester: "LegalDueDiligenceAgent",
  }, {} as any);

  assertEquals(result.success, true);
  assertEquals(result.action, "request_vdr_access");
  assertEquals(result.dealId, "deal_1");
  assertNotEquals(result.documents, undefined);

  // Wait a small bit for any async handlers
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertNotEquals(responseData, null);
  assertEquals(responseData.status, "success");
  assertEquals(responseData.requester, "LegalDueDiligenceAgent");
});

Deno.test("mcpDatabaseTool - Runs tables and schema commands with graceful fallback", async () => {
  const resultList = await mcpDatabaseTool.execute!({
    action: "list_tables",
  }, {} as any);

  assertEquals(resultList.success, true);
  assertNotEquals(resultList.tables, undefined);
  assertEquals(resultList.tables.includes("transaction"), true);

  const resultInspect = await mcpDatabaseTool.execute!({
    action: "inspect_schema",
    table: "transaction",
  }, {} as any);

  assertEquals(resultInspect.success, true);
  assertEquals(resultInspect.table, "transaction");
  assertNotEquals(resultInspect.schema?.columns, undefined);
});

Deno.test("huggingFaceMcpTool - Predicts insolvency and loads weights", async () => {
  const resultLoad = await huggingFaceMcpTool.execute!({
    task: "load_weights",
  }, {} as any);

  assertEquals(resultLoad.success, true);
  assertEquals(resultLoad.status.includes("loaded"), true);

  const resultPredict = await huggingFaceMcpTool.execute!({
    task: "predict_insolvency",
    inputData: {
      ebitda: 10,
      revenue: 50,
      totalAssets: 100,
      totalLiabilities: 30,
      operatingCashFlow: 8,
      historicalVolatility: 0.15,
    }
  }, {} as any);

  assertEquals(resultPredict.success, true);
  assertNotEquals(resultPredict.prediction?.insolvencyRiskScore, undefined);
  assertNotEquals(resultPredict.prediction?.riskLevel, undefined);
});

Deno.test("geminiGoogleSearchTool - Executes query and returns sources and summary", async () => {
  const result = await geminiGoogleSearchTool.execute!({
    query: "Valuation múltiplos SaaS Brasil 2026",
    targetCompany: "SaaS Dev Corp",
    aspect: "general",
  }, {} as any);

  assertEquals(result.success, true);
  assertNotEquals(result.groundingMetadata?.sources, undefined);
  assertNotEquals(result.summary, undefined);
});
