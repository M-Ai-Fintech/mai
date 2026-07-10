import { assertEquals, assertExists, assertGreater, assertLess, assertRejects } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { ONNXEngine, ONNXModelInput, loadOnnxModel, resetSession } from "../../src/engines/prediction/onnx.ts";

Deno.test("ONNXEngine - runModelInference rejects when session is null", async () => {
  resetSession();
  const input: ONNXModelInput = {
    ebitda: 2000000,
    revenue: 10000000,
    totalAssets: 15000000,
    totalLiabilities: 8000000,
    operatingCashFlow: 1500000,
    historicalVolatility: 0.15,
  };
  
  await assertRejects(
    async () => {
      await ONNXEngine.runModelInference(input);
    },
    Error,
    "ONNX model not loaded"
  );
});

Deno.test("ONNXEngine - runModelInference with actual model", async () => {
  const input: ONNXModelInput = {
    ebitda: 2000000,
    revenue: 10000000,
    totalAssets: 15000000,
    totalLiabilities: 8000000,
    operatingCashFlow: 1500000,
    historicalVolatility: 0.15,
  };
  
  // Load the actual exported model (should not throw)
  await loadOnnxModel('models/ma_classifier_q8.onnx');
  
  const result = await ONNXEngine.runModelInference(input);
  
  assertExists(result);
  assertExists(result.insolvencyRisk);
  assertExists(result.zScore);
  
  assertGreater(result.insolvencyRisk, 0);
  assertLess(result.insolvencyRisk, 1);
});
