
import { assertEquals, assertExists, assertGreater, assertLess } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { ONNXEngine, ONNXModelInput } from "../../src/engines/prediction/onnx.ts";

Deno.test("ONNXEngine - runModelInference fallback simulation", async () => {
  const input: ONNXModelInput = {
    ebitda: 2000000,
    revenue: 10000000,
    totalAssets: 15000000,
    totalLiabilities: 8000000,
    operatingCashFlow: 1500000,
    historicalVolatility: 0.15,
  };
  
  // Provide an invalid path to force fallback
  const result = await ONNXEngine.runModelInference(input, 'invalid_path.onnx');
  
  assertExists(result);
  assertExists(result.insolvencyRisk);
  assertExists(result.churnProbability);
  assertExists(result.dcfVolatility);
  assertExists(result.industry4Score);
  
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
  
  // Use the actual exported model
  const result = await ONNXEngine.runModelInference(input, 'models/ma_classifier_q8.onnx');
  
  assertExists(result);
  assertExists(result.insolvencyRisk);
  assertExists(result.churnProbability);
  assertExists(result.dcfVolatility);
  assertExists(result.industry4Score);
});
