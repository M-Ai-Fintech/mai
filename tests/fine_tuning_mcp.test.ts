import { assertEquals } from "@std/assert";
import { huggingFaceMcpTool } from "../src/agent/actions.ts";
import { testToolContext } from "./support/tool_context.ts";
import { requireRecord } from "./support/value_guards.ts";

Deno.test("Hugging Face MCP Tool - Load LoRA adapter is unsupported", async () => {
  const output = await huggingFaceMcpTool.execute!({
    model: "meta-llama/Llama-3-8B-Instruct",
    task: "load_lora_adapter",
    adapterPath: "./lora_adapter_ma_br",
  }, testToolContext);
  const result = requireRecord(output);

  assertEquals(result.success, false);
  assertEquals(result.status, "unsupported");
  assertEquals(result.reason, "LEGACY_MODEL_ADAPTATION_UNSUPPORTED");
});

Deno.test("Hugging Face MCP Tool - Fine Tuned Inference is unsupported", async () => {
  const output = await huggingFaceMcpTool.execute!({
    model: "meta-llama/Llama-3-8B-Instruct",
    task: "fine_tuned_inference",
    text:
      "Analyze this Tag-Along clause and explain whether it complies with Brazilian CVM rules: '...'",
  }, testToolContext);
  const result = requireRecord(output);

  assertEquals(result.success, false);
  assertEquals(result.status, "unsupported");
  assertEquals(result.reason, "LEGACY_MODEL_ADAPTATION_UNSUPPORTED");
});
