import {
  assertExists,
  assertGreater,
  assertLess,
  assertRejects,
} from "@std/assert";
import {
  loadOnnxModel,
  ONNXEngine,
  type ONNXModelInput,
  resetSession,
} from "../../src/engines/prediction/onnx.ts";

const MODEL_INPUT: ONNXModelInput = {
  ebitda: 2000000,
  revenue: 10000000,
  totalAssets: 15000000,
  totalLiabilities: 8000000,
  operatingCashFlow: 1500000,
  historicalVolatility: 0.15,
};

Deno.test("ONNXEngine - runModelInference rejects when session is null", async () => {
  resetSession();
  await assertRejects(
    async () => {
      await ONNXEngine.runModelInference(MODEL_INPUT);
    },
    Error,
    "ONNX model not loaded",
  );
});

Deno.test("ONNXEngine - runModelInference with actual model", async () => {
  // Load the actual exported model (should not throw)
  await loadOnnxModel("models/ma_classifier_q8.onnx");

  const result = await ONNXEngine.runModelInference(MODEL_INPUT);

  assertExists(result);
  assertExists(result.insolvencyRisk);
  assertExists(result.zScore);

  assertGreater(result.insolvencyRisk, 0);
  assertLess(result.insolvencyRisk, 1);
});
