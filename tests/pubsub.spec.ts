import { assertEquals, assertNotEquals } from "@std/assert";
import {
  googleCloudPubSubTool,
  mcpDatabaseTool,
  huggingFaceMcpTool,
  geminiGoogleSearchTool
} from "../src/agent/actions.ts";
import { LocalPubSubBus } from "../src/core/pubsub/LocalPubSubBus.ts";

Deno.test("LocalPubSubBus - Publish and Subscribe real messaging flow", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();

  let receivedData1: any = null;
  let receivedData2: any = null;

  bus.subscribe("test_topic", (data: any) => {
    receivedData1 = data;
  });

  bus.subscribe("test_topic", (data: any) => {
    receivedData2 = data;
  });

  const payload = { hello: "world", test: true };
  bus.publish("test_topic", payload);

  // Wait for async delivery
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertNotEquals(receivedData1, null);
  assertEquals(receivedData1.hello, "world");
  assertEquals(receivedData1.test, true);

  assertNotEquals(receivedData2, null);
  assertEquals(receivedData2.hello, "world");
  assertEquals(receivedData2.test, true);
});

Deno.test("LocalPubSubBus - Error isolation", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();

  let receivedData: any = null;

  bus.subscribe("error_topic", () => {
    throw new Error("Simulated failure");
  });

  bus.subscribe("error_topic", (data: any) => {
    receivedData = data;
  });

  bus.publish("error_topic", { success: true });

  await new Promise((resolve) => setTimeout(resolve, 10));

  assertNotEquals(receivedData, null);
  assertEquals(receivedData.success, true);
});

Deno.test("LocalPubSubBus - Cleanup and memory leak prevention", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();

  let count = 0;
  bus.subscribe("clean_topic", () => {
    count++;
  });

  bus.publish("clean_topic", { test: 1 });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertEquals(count, 1);

  bus.clear("clean_topic");

  bus.publish("clean_topic", { test: 2 });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertEquals(count, 1); // should not increment because listener was cleared
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

Deno.test("googleCloudPubSubTool - Handles trigger_engine action", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();

  let responseData: any = null;
  bus.subscribe("engine_requests_response", (data: any) => {
    responseData = data;
  });

  const result = await googleCloudPubSubTool.execute!({
    topic: "engine_requests",
    action: "trigger_engine",
    dealId: "deal_2",
  }, {} as any);

  assertEquals(result.success, true);
  assertEquals(result.action, "trigger_engine");
  assertEquals(result.dealId, "deal_2");

  await new Promise((resolve) => setTimeout(resolve, 10));

  assertNotEquals(responseData, null);
  assertEquals(responseData.status, "success");
  assertEquals(responseData.result, "Engine triggered successfully for deal_2");
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
    query: "SaaS valuation multiples Brazil 2026",
    targetCompany: "SaaS Dev Corp",
    aspect: "general",
  }, {} as any);

  assertEquals(result.success, true);
  assertNotEquals(result.groundingMetadata?.sources, undefined);
  assertNotEquals(result.summary, undefined);
});
