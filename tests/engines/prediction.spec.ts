import {
  assertAlmostEquals,
  assertEquals,
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
import { PredictionNotInitializedError } from "../../src/engines/prediction/errors.ts";

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
    PredictionNotInitializedError,
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
  assertEquals(
    result.churnProbability >= 0 && result.churnProbability <= 1,
    true,
  );
  assertEquals(result.dcfVolatility >= 0 && result.dcfVolatility <= 100, true);
  assertEquals(
    result.industry4Score >= 0 && result.industry4Score <= 100,
    true,
  );
  assertEquals(result.resultKind, "model");
  assertEquals(result.provenance.kind, "reference-model");
});

Deno.test("ONNXEngine - maps the four golden outputs in order", async () => {
  resetSession();
  await loadOnnxModel("models/ma_classifier_q8.onnx");

  const result = await ONNXEngine.runModelInference(MODEL_INPUT);

  assertAlmostEquals(result.insolvencyRisk, 0, 0.0001);
  assertAlmostEquals(result.churnProbability, 0, 0.0001);
  assertAlmostEquals(result.dcfVolatility, 0, 0.0001);
  assertAlmostEquals(result.industry4Score, 100, 0.0001);
});
