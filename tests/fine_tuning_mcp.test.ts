import { assertEquals } from "jsr:@std/assert";
import { huggingFaceMcpTool } from "../src/agent/actions.ts";

Deno.test("Hugging Face MCP Tool - Load LoRA adapter", async () => {
  // @ts-ignore: bypass execute being possibly undefined and requiring context for simple test
  const result = await huggingFaceMcpTool.execute!({
    model: "meta-llama/Llama-3-8B-Instruct",
    task: "load_lora_adapter",
    adapterPath: "./lora_adapter_ma_br",
  }, {} as any);

  assertEquals(result.success, true);
  assertEquals(result.status, "LoRA adapter loaded and merged successfully for inference.");
  assertEquals(result.adapterPath, "./lora_adapter_ma_br");
});

Deno.test("Hugging Face MCP Tool - Fine Tuned Inference", async () => {
  // @ts-ignore: bypass execute being possibly undefined and requiring context for simple test
  const result = await huggingFaceMcpTool.execute!({
    model: "meta-llama/Llama-3-8B-Instruct",
    task: "fine_tuned_inference",
    text: "Analise a seguinte cláusula de Tag-Along e explique se ela respeita a norma da CVM brasileira: '...'",
  }, {} as any);

  assertEquals(result.success, true);
  assertEquals(
    result.output.includes("[MOCK - Inferência Fine-Tuned (meta-llama/Llama-3-8B-Instruct)]"),
    true
  );
});
