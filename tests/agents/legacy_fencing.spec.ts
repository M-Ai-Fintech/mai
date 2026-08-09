import { assertEquals, assertRejects } from "@std/assert";
import { BrokerOrchestratorAgent } from "../../src/agent/agents/broker-orchestrator/index.ts";
import { DealMatchingAgent } from "../../src/agent/agents/deal-matching/index.ts";
import { FinancialRiskAgent } from "../../src/agent/agents/financial-risk/index.ts";
import { GeneralDueDiligenceAgent } from "../../src/agent/agents/general-dd/index.ts";
import { LegalClosingAgent } from "../../src/agent/agents/legal-closing/index.ts";
import { LegalDueDiligenceAgent } from "../../src/agent/agents/legal-dd/index.ts";
import { NegotiationAgent } from "../../src/agent/agents/negotiation/index.ts";
import { SourcingAndKYBAgent } from "../../src/agent/agents/sourcing-kyb/index.ts";
import * as financialRiskTools from "../../src/agent/agents/financial-risk/tools/index.ts";
import * as generalDueDiligenceTools from "../../src/agent/agents/general-dd/tools/index.ts";
import * as legalDueDiligenceTools from "../../src/agent/agents/legal-dd/tools/index.ts";
import {
  AgentOrchestrator,
  BrokerOrchestratorService,
  type LegacyAgentAdapter,
} from "../../src/agent/index.ts";
import {
  geminiGoogleSearchTool,
  huggingFaceMcpTool,
} from "../../src/agent/tools/ai_tools.ts";
import { testToolContext } from "../support/tool_context.ts";
import { requireRecord } from "../support/value_guards.ts";

const ADAPTATION_MODEL = "meta-llama/Llama-3-8B-Instruct";

const directLegacyAdapters: readonly LegacyAgentAdapter[] = [
  BrokerOrchestratorAgent,
  SourcingAndKYBAgent,
  GeneralDueDiligenceAgent,
  FinancialRiskAgent,
  LegalDueDiligenceAgent,
  DealMatchingAgent,
  NegotiationAgent,
  LegalClosingAgent,
];

class UnavailableMemoryStore {
  public searchSimilarPreferences(
    _embedding: number[],
    _limit: number,
  ): Promise<never> {
    return Promise.reject(
      new Error("memory store unavailable; expected a connected store"),
    );
  }

  public searchSimilarKnowledge(
    _embedding: number[],
    _limit: number,
  ): Promise<never> {
    return Promise.reject(
      new Error("memory store unavailable; expected a connected store"),
    );
  }

  public getUserPreferences(
    _userId: string,
  ): Promise<never> {
    return Promise.reject(
      new Error("memory store unavailable; expected a connected store"),
    );
  }

  public getDomainKnowledge(
    _category: string,
  ): Promise<never> {
    return Promise.reject(
      new Error("memory store unavailable; expected a connected store"),
    );
  }
}

function exportedNames(module: object): string[] {
  return Object.keys(module);
}

Deno.test("direct specialist imports are provider-free and fail closed", async () => {
  for (const adapter of directLegacyAdapters) {
    assertEquals(adapter.name, adapter.id);
    await assertRejects(
      () => adapter.generate("the direct raw agent path must stay disabled"),
      Error,
      "LEGACY_RAW_AGENT_EXECUTION_DISABLED",
    );
  }
});

async function runAdaptationTask(
  task: "load_lora_adapter" | "fine_tuned_inference",
): Promise<Record<string, unknown>> {
  const output = await huggingFaceMcpTool.execute!({
    model: ADAPTATION_MODEL,
    task,
    adapterPath: "./legacy-adapter",
    text: "Analyze this clause without running a model adaptation.",
  }, testToolContext);
  return requireRecord(output);
}

Deno.test("legacy VDR access is absent from governed specialist catalogs", () => {
  for (
    const catalog of [
      financialRiskTools,
      generalDueDiligenceTools,
      legalDueDiligenceTools,
    ]
  ) {
    assertEquals(
      exportedNames(catalog).includes("vdrStructuredAccessTool"),
      false,
    );
  }
});

Deno.test("agent entry point re-exports governed public surfaces", async () => {
  const source = await Deno.readTextFile(
    new URL("../../src/agent/index.ts", import.meta.url),
  );
  assertEquals(source.includes('export * from "./governed.ts";'), true);
  for (
    const forbidden of [
      "@mastra/core/agent",
      "./agents/",
      "Agent.prototype.generate",
      "mock-key-for-dry-run",
    ]
  ) {
    assertEquals(source.includes(forbidden), false);
  }
  const compatibilityExports = [
    "brokerOrchestratorAgent",
    "dealMatchingAgent",
    "financialRiskAgent",
    "generalDueDiligenceAgent",
    "legalClosingAgent",
    "legalDueDiligenceAgent",
    "negotiationAgent",
    "sourcingAndKYBAgent",
  ];
  const entrypoint = await import("../../src/agent/index.ts");
  for (const compatibilityExport of compatibilityExports) {
    assertEquals(compatibilityExport in entrypoint, true);
  }
  const catalog = entrypoint.createSpecialistDefinitionCatalog();
  assertEquals(
    catalog.current("broker-orchestrator-agent").name,
    "BrokerOrchestratorAgent",
  );
  const governed = requireRecord(
    await AgentOrchestrator.executeAgentQuery(
      "deal-for-fencing-test",
      "summarize",
    ).then((output) => JSON.parse(output)),
  );
  assertEquals(governed.status, "unavailable");
  assertEquals(governed.reason, "LEGACY_RAW_AGENT_EXECUTION_DISABLED");
});

Deno.test("broker corrections are explicitly unsupported and non-authoritative", async () => {
  const service = new BrokerOrchestratorService();
  const result = await service.processUserCorrection(
    "user-for-fencing-test",
    "user_preference",
    "adjustments",
    { variableName: "valuation", correctedValue: 12_000_000 },
    "legacy feedback must not mutate authoritative memory",
  );

  assertEquals(result, {
    success: false,
    conflict: true,
    status: "unsupported",
    reason: "LEGACY_CONTINUOUS_LEARNING_DISABLED",
    conflictReason:
      "Legacy correction persistence is disabled; use an authorized human command.",
  });
});

Deno.test("broker context reports unavailable memory without a process-local fallback", async () => {
  const service = new BrokerOrchestratorService(new UnavailableMemoryStore());
  const result = await service.getOrchestratorContext(
    "user-for-fencing-test",
    "general",
    [0.1, 0.2],
  );

  assertEquals(result, {
    preferences: [],
    domainKnowledge: [],
    status: "unavailable",
    reason: "MEMORY_UNAVAILABLE",
  });
});

Deno.test("legacy model adaptation tasks return explicit unsupported results", async () => {
  for (const task of ["load_lora_adapter", "fine_tuned_inference"] as const) {
    const result = await runAdaptationTask(task);
    assertEquals(result.success, false);
    assertEquals(result.status, "unsupported");
    assertEquals(result.reason, "LEGACY_MODEL_ADAPTATION_UNSUPPORTED");
    assertEquals(result.task, task);
    assertEquals(result.model, ADAPTATION_MODEL);
    assertEquals("output" in result, false);
  }
});

Deno.test("legacy weight loading is unsupported rather than simulated", async () => {
  const output = await huggingFaceMcpTool.execute!({
    model: "onnx-risk-predictor-q8",
    task: "load_weights",
  }, testToolContext);
  const result = requireRecord(output);

  assertEquals(result.success, false);
  assertEquals(result.status, "unsupported");
  assertEquals(result.reason, "LEGACY_WEIGHT_LOADING_UNSUPPORTED");
  assertEquals("output" in result, false);
});

Deno.test("ONNX failures are unavailable without prediction evidence", async () => {
  const output = await huggingFaceMcpTool.execute!({
    model: "onnx-risk-predictor-q8",
    task: "predict_insolvency",
    inputData: { revenue: 1_000_000 },
  }, testToolContext);
  const result = requireRecord(output);

  assertEquals(result.success, false);
  assertEquals(result.status, "unavailable");
  assertEquals(result.reason, "ONNX_INFERENCE_UNAVAILABLE");
  assertEquals("prediction" in result, false);
  assertEquals("fallback" in result, false);
});

Deno.test("missing Gemini provider is unavailable without fabricated sources", async () => {
  const previousProvider = Deno.env.get("MAI_AI_PROVIDER");
  Deno.env.set("MAI_AI_PROVIDER", "disabled");
  try {
    const output = await geminiGoogleSearchTool.execute!({
      query: "company reputation",
      targetCompany: "Target Company",
      aspect: "reputation",
    }, testToolContext);
    const result = requireRecord(output);
    const grounding = requireRecord(result.groundingMetadata);

    assertEquals(result.success, false);
    assertEquals(result.status, "unavailable");
    assertEquals(result.reason, "GEMINI_PROVIDER_UNAVAILABLE");
    assertEquals(grounding.sources, []);
    assertEquals("summary" in result, false);
  } finally {
    if (previousProvider === undefined) {
      Deno.env.delete("MAI_AI_PROVIDER");
    } else {
      Deno.env.set("MAI_AI_PROVIDER", previousProvider);
    }
  }
});

Deno.test("Gemini responses without grounding evidence stay unavailable", async () => {
  const previousProvider = Deno.env.get("MAI_AI_PROVIDER");
  const previousKey = Deno.env.get("GEMINI_API_KEY");
  const previousFetch = globalThis.fetch;
  Deno.env.delete("MAI_AI_PROVIDER");
  Deno.env.set("GEMINI_API_KEY", "test-provider-key");
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{
            content: { parts: [{ text: "Unverified summary" }] },
          }],
        }),
        { status: 200 },
      ),
    );
  try {
    const output = await geminiGoogleSearchTool.execute!({
      query: "company reputation",
      targetCompany: "Target Company",
      aspect: "reputation",
    }, testToolContext);
    const result = requireRecord(output);
    const grounding = requireRecord(result.groundingMetadata);

    assertEquals(result.success, false);
    assertEquals(result.status, "unavailable");
    assertEquals(result.reason, "GEMINI_GROUNDING_EVIDENCE_UNAVAILABLE");
    assertEquals(grounding.sources, []);
    assertEquals("summary" in result, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousProvider === undefined) {
      Deno.env.delete("MAI_AI_PROVIDER");
    } else {
      Deno.env.set("MAI_AI_PROVIDER", previousProvider);
    }
    if (previousKey === undefined) {
      Deno.env.delete("GEMINI_API_KEY");
    } else {
      Deno.env.set("GEMINI_API_KEY", previousKey);
    }
  }
});
