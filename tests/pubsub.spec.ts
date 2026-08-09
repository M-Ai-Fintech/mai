import { assertEquals } from "@std/assert";
import {
  geminiGoogleSearchTool,
  googleCloudPubSubTool,
  huggingFaceMcpTool,
  mcpDatabaseTool,
} from "../src/agent/actions.ts";
import { LocalPubSubBus } from "../src/core/pubsub/LocalPubSubBus.ts";
import { testToolContext } from "./support/tool_context.ts";
import { requireArray, requireRecord } from "./support/value_guards.ts";

const VDR_REQUEST = {
  topic: "vdr_requests",
  action: "request_vdr_access",
  dealId: "deal_1",
  requester: "LegalDueDiligenceAgent",
};

const ENGINE_REQUEST = {
  topic: "engine_requests",
  action: "trigger_engine",
  dealId: "deal_2",
};

const INSOLVENCY_INPUT = {
  ebitda: 10,
  revenue: 50,
  totalAssets: 100,
  totalLiabilities: 30,
  operatingCashFlow: 8,
  historicalVolatility: 0.15,
};

function nextMessage(
  bus: LocalPubSubBus,
  topic: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    bus.subscribe(topic, (payload) => resolve(requireRecord(payload)));
  });
}

function assertVdrToolResult(result: Record<string, unknown>): void {
  assertEquals(result.success, true);
  assertEquals(result.action, "request_vdr_access");
  assertEquals(result.dealId, "deal_1");
  requireArray(result.documents, "documents");
}

function assertVdrResponse(response: Record<string, unknown>): void {
  assertEquals(response.status, "success");
  assertEquals(response.requester, "LegalDueDiligenceAgent");
}

function assertEngineToolResult(result: Record<string, unknown>): void {
  assertEquals(result.success, true);
  assertEquals(result.action, "trigger_engine");
  assertEquals(result.dealId, "deal_2");
}

function assertEngineResponse(response: Record<string, unknown>): void {
  assertEquals(response.status, "success");
  assertEquals(response.result, "Engine triggered successfully for deal_2");
}

Deno.test("LocalPubSubBus delivers a publication to every subscriber", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  const firstMessage = nextMessage(bus, "test_topic");
  const secondMessage = nextMessage(bus, "test_topic");

  bus.publish("test_topic", { hello: "world", test: true });

  assertEquals(await firstMessage, { hello: "world", test: true });
  assertEquals(await secondMessage, { hello: "world", test: true });
});

Deno.test("LocalPubSubBus isolates a failing subscriber", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  bus.subscribe("error_topic", () => {
    throw new Error("Simulated failure");
  });
  const deliveredMessage = nextMessage(bus, "error_topic");

  bus.publish("error_topic", { success: true });

  assertEquals(await deliveredMessage, { success: true });
});

Deno.test("LocalPubSubBus stops delivery after topic cleanup", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  let deliveryCount = 0;
  bus.subscribe("clean_topic", () => deliveryCount++);

  const firstDelivery = nextMessage(bus, "clean_topic");
  bus.publish("clean_topic", { sequence: 1 });
  await firstDelivery;
  assertEquals(deliveryCount, 1);

  bus.clear("clean_topic");
  const eventLoopBarrier = nextMessage(bus, "barrier_topic");
  bus.publish("clean_topic", { sequence: 2 });
  bus.publish("barrier_topic", { complete: true });
  await eventLoopBarrier;
  assertEquals(deliveryCount, 1);
});

Deno.test("googleCloudPubSubTool publishes a VDR response", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  const responseMessage = nextMessage(bus, "vdr_requests_response");

  const output = await googleCloudPubSubTool.execute!(
    VDR_REQUEST,
    testToolContext,
  );
  const result = requireRecord(output);
  assertVdrToolResult(result);
  assertVdrResponse(await responseMessage);
});

Deno.test("googleCloudPubSubTool publishes an engine response", async () => {
  const bus = LocalPubSubBus.getInstance();
  bus.clear();
  const responseMessage = nextMessage(bus, "engine_requests_response");

  const output = await googleCloudPubSubTool.execute!(
    ENGINE_REQUEST,
    testToolContext,
  );
  const result = requireRecord(output);
  assertEngineToolResult(result);
  assertEngineResponse(await responseMessage);
});

async function assertDatabaseTableList(): Promise<void> {
  const listOutput = await mcpDatabaseTool.execute!({
    action: "list_tables",
  }, testToolContext);
  const tableList = requireRecord(listOutput);
  const tables = requireArray(tableList.tables, "tables");
  assertEquals(tableList.success, true);
  assertEquals(tables.includes("transaction"), true);
}

async function assertTransactionSchema(): Promise<void> {
  const inspectOutput = await mcpDatabaseTool.execute!({
    action: "inspect_schema",
    table: "transaction",
  }, testToolContext);
  const inspection = requireRecord(inspectOutput);
  const schema = requireRecord(inspection.schema);

  assertEquals(inspection.success, true);
  assertEquals(inspection.table, "transaction");
  requireArray(schema.columns, "schema.columns");
}

Deno.test("mcpDatabaseTool lists tables and inspects schema", async () => {
  await assertDatabaseTableList();
  await assertTransactionSchema();
});

Deno.test("huggingFaceMcpTool reports unavailable legacy model capabilities", async () => {
  const loadOutput = await huggingFaceMcpTool.execute!({
    task: "load_weights",
  }, testToolContext);
  const loadResult = requireRecord(loadOutput);
  assertEquals(loadResult.success, false);
  assertEquals(loadResult.status, "unsupported");
  assertEquals(loadResult.reason, "LEGACY_WEIGHT_LOADING_UNSUPPORTED");
  assertEquals("prediction" in loadResult, false);

  const predictionOutput = await huggingFaceMcpTool.execute!(
    { task: "predict_insolvency", inputData: INSOLVENCY_INPUT },
    testToolContext,
  );
  const predictionResult = requireRecord(predictionOutput);

  assertEquals(predictionResult.success, false);
  assertEquals(predictionResult.status, "unavailable");
  assertEquals(predictionResult.reason, "ONNX_INFERENCE_UNAVAILABLE");
  assertEquals("prediction" in predictionResult, false);
  assertEquals("fallback" in predictionResult, false);
});

Deno.test("geminiGoogleSearchTool reports unavailable without provider evidence", async () => {
  const previousProvider = Deno.env.get("MAI_AI_PROVIDER");
  Deno.env.set("MAI_AI_PROVIDER", "disabled");
  try {
    const output = await geminiGoogleSearchTool.execute!({
      query: "SaaS valuation multiples Brazil 2026",
      targetCompany: "SaaS Dev Corp",
      aspect: "general",
    }, testToolContext);
    const result = requireRecord(output);
    const groundingMetadata = requireRecord(result.groundingMetadata);

    assertEquals(result.success, false);
    assertEquals(result.status, "unavailable");
    assertEquals(result.reason, "GEMINI_PROVIDER_UNAVAILABLE");
    assertEquals(groundingMetadata.sources, []);
    assertEquals("summary" in result, false);
  } finally {
    if (previousProvider === undefined) {
      Deno.env.delete("MAI_AI_PROVIDER");
    } else {
      Deno.env.set("MAI_AI_PROVIDER", previousProvider);
    }
  }
});
