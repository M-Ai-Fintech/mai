import { assertEquals } from "@std/assert";
import { BrokerOrchestratorService } from "../../src/agent/agents/broker-orchestrator/index.ts";
import * as financialRiskTools from "../../src/agent/agents/financial-risk/tools/index.ts";
import * as generalDueDiligenceTools from "../../src/agent/agents/general-dd/tools/index.ts";
import * as legalDueDiligenceTools from "../../src/agent/agents/legal-dd/tools/index.ts";
import { huggingFaceMcpTool } from "../../src/agent/tools/ai_tools.ts";
import { testToolContext } from "../support/tool_context.ts";
import { requireRecord } from "../support/value_guards.ts";

const ADAPTATION_MODEL = "meta-llama/Llama-3-8B-Instruct";

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
  assertEquals(
    source.includes('export * from "./definitions/index.ts";'),
    true,
  );
  assertEquals(source.includes('export * from "./governed_agent.ts";'), true);
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
    conflict: false,
    status: "unsupported",
    reason: "LEGACY_CONTINUOUS_LEARNING_DISABLED",
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
