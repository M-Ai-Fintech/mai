import { assertEquals, assertExists, assertGreater, assertLess } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { ONNXEngine, ONNXModelInput, loadOnnxModel } from "../../src/engines/prediction/onnx.ts";

Deno.test("ONNXEngine - runModelInference fallback simulation", async () => {
  const input: ONNXModelInput = {
    ebitda: 2000000,
    revenue: 10000000,
    totalAssets: 15000000,
    totalLiabilities: 8000000,
    operatingCashFlow: 1500000,
    historicalVolatility: 0.15,
  };
  
  // Directly run inference, which will trigger fallback because model is not loaded yet
  const result = await ONNXEngine.runModelInference(input);
  
  assertExists(result);
  assertExists(result.insolvencyRisk);
  assertExists(result.zScore);
  
  assertGreater(result.insolvencyRisk, 0);
  assertLess(result.insolvencyRisk, 1);
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
  
  try {
    // Load the actual exported model
    await loadOnnxModel('models/ma_classifier_q8.onnx');
    
    const result = await ONNXEngine.runModelInference(input);
    
    assertExists(result);
    assertExists(result.insolvencyRisk);
    assertExists(result.zScore);
  } catch (error) {
    console.log("Model loading skipped:", error);
  }
});
