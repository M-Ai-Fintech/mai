import { assertEquals } from "@std/assert";
import { huggingFaceMcpTool } from "../src/agent/actions.ts";
import { testToolContext } from "./support/tool_context.ts";
import { requireRecord } from "./support/value_guards.ts";

Deno.test("Hugging Face MCP Tool - Load LoRA adapter", async () => {
  const output = await huggingFaceMcpTool.execute!({
    model: "meta-llama/Llama-3-8B-Instruct",
    task: "load_lora_adapter",
    adapterPath: "./lora_adapter_ma_br",
  }, testToolContext);
  const result = requireRecord(output);

  assertEquals(result.success, true);
  assertEquals(
    result.status,
    "LoRA adapter loaded and merged successfully for inference.",
  );
  assertEquals(result.adapterPath, "./lora_adapter_ma_br");
});

Deno.test("Hugging Face MCP Tool - Fine Tuned Inference", async () => {
  const output = await huggingFaceMcpTool.execute!({
    model: "meta-llama/Llama-3-8B-Instruct",
    task: "fine_tuned_inference",
    text:
      "Analyze this Tag-Along clause and explain whether it complies with Brazilian CVM rules: '...'",
  }, testToolContext);
  const result = requireRecord(output);

  assertEquals(result.success, true);
  assertEquals(
    String(result.output).includes(
      "[MOCK - Fine-Tuned Inference (meta-llama/Llama-3-8B-Instruct)]",
    ),
    true,
  );
});
