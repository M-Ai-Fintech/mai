import { assertEquals, assertRejects } from "@std/assert";
import { PredictionEngine } from "./index.ts";
import {
  ArtifactMissingError,
  PredictionInputError,
  PredictionNotInitializedError,
} from "./errors.ts";
import { loadOnnxModel, onnxInfer, resetSession, ZScoreLabel } from "./onnx.ts";

// The MAI-34 model actually expects 6 features (ebitda, revenue, totalAssets, totalLiabilities, operatingCashFlow, historicalVolatility)
const VALID_INPUT = new Float32Array([1.5, 2.0, -0.5, 1.2, 0.8, 3.1]);
const MOCK_MODEL_PATH = "models/ma_classifier_q8.onnx";

async function collectInferenceTimes(iterations: number): Promise<number[]> {
  const times: number[] = [];
  // Warmup
  for (let i = 0; i < 5; i++) {
    await onnxInfer(VALID_INPUT);
  }
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await onnxInfer(VALID_INPUT);
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b);
}

function percentile(times: number[], ratio: number): number {
  return times[Math.floor(times.length * ratio)];
}

function reportInferenceTimes(p50: number, p99: number): void {
  console.table({
    P50: `${p50.toFixed(2)} ms`,
    P99: `${p99.toFixed(2)} ms`,
  });
}

Deno.test("ONNX Engine - loads a quantized model via loadOnnxModel", async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);
  // The test passes when no exception is thrown.
});

Deno.test("ONNX Engine - fails to load a missing model", async () => {
  resetSession();
  await assertRejects(
    async () => {
      await loadOnnxModel("models/does_not_exist.onnx");
    },
    ArtifactMissingError,
  );
});

Deno.test("ONNX Engine - throws a typed validation error for empty input", async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);

  await assertRejects(
    async () => {
      await onnxInfer(new Float32Array([]));
    },
    PredictionInputError,
  );
});

Deno.test("ONNX Engine - throws when inference runs before model loading", async () => {
  resetSession();
  await assertRejects(
    async () => {
      await onnxInfer(VALID_INPUT);
    },
    PredictionNotInitializedError,
  );
});

Deno.test("ONNX Engine - valid inference returns distressProbability and zScoreLabel", async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);

  const result = await onnxInfer(VALID_INPUT);

  assertEquals(typeof result.distressProbability, "number");
  assertEquals(typeof result.churnProbability, "number");
  assertEquals(typeof result.dcfVolatility, "number");
  assertEquals(typeof result.industry4Score, "number");
  assertEquals(result.resultKind, "model");
  assertEquals(result.provenance.kind, "reference-model");
  assertEquals(
    result.distressProbability >= 0 && result.distressProbability <= 1,
    true,
  );
  assertEquals(Object.values(ZScoreLabel).includes(result.zScoreLabel), true);
});

Deno.test("ONNX Engine - inference benchmark stays below 200ms (P50/P99)", async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);
  const times = await collectInferenceTimes(50);
  const p50 = percentile(times, 0.50);
  const p99 = percentile(times, 0.99);
  reportInferenceTimes(p50, p99);
  assertEquals(p50 < 100, true, `P50 was ${p50}ms (expected < 100ms)`);
  assertEquals(p99 < 200, true, `P99 was ${p99}ms (expected < 200ms)`);
});

Deno.test("PredictionEngine - integrates with onnxInfer", async () => {
  resetSession();
  const engine = new PredictionEngine();
  await engine.initialize(MOCK_MODEL_PATH);

  const result = await engine.predict(VALID_INPUT);
  assertEquals(typeof result.distressProbability, "number");
  assertEquals(typeof result.churnProbability, "number");
  assertEquals(typeof result.dcfVolatility, "number");
  assertEquals(typeof result.industry4Score, "number");
});
