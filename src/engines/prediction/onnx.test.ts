import { assertEquals, assertRejects } from '@std/assert';
import { loadOnnxModel, onnxInfer, resetSession, ZScoreLabel } from './onnx.ts';
import { PredictionEngine } from './index.ts';

// The MAI-34 model actually expects 6 features (ebitda, revenue, totalAssets, totalLiabilities, operatingCashFlow, historicalVolatility)
const VALID_INPUT = new Float32Array([1.5, 2.0, -0.5, 1.2, 0.8, 3.1]);
const MOCK_MODEL_PATH = 'models/ma_classifier_q8.onnx';

Deno.test('ONNX Engine - Carregar modelo quantizado via loadOnnxModel', async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);
  // Se não lançar exceção, o teste passa.
});

Deno.test('ONNX Engine - Falha ao carregar modelo inexistente', async () => {
  resetSession();
  await assertRejects(
    async () => {
      await loadOnnxModel('models/does_not_exist.onnx');
    },
    Error,
    'Failed to load ONNX model via WASM'
  );
});

Deno.test('ONNX Engine - Lança erro de validação (Zod) se input for vazio', async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);
  
  await assertRejects(
    async () => {
      await onnxInfer(new Float32Array([]));
    },
    Error,
    'Input array must not be empty'
  );
});

Deno.test('ONNX Engine - Lança erro se tentar inferir sem carregar modelo', async () => {
  resetSession();
  await assertRejects(
    async () => {
      await onnxInfer(VALID_INPUT);
    },
    Error,
    'ONNX model not loaded'
  );
});

Deno.test('ONNX Engine - Inferência válida retorna distressProbability e zScoreLabel', async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);
  
  const result = await onnxInfer(VALID_INPUT);
  
  assertEquals(typeof result.distressProbability, 'number');
  assertEquals(result.distressProbability >= 0 && result.distressProbability <= 1, true);
  assertEquals(Object.values(ZScoreLabel).includes(result.zScoreLabel), true);
});

Deno.test('ONNX Engine - Benchmark < 200ms para inferência (P50/P99)', async () => {
  resetSession();
  await loadOnnxModel(MOCK_MODEL_PATH);
  
  const iterations = 50;
  const times: number[] = [];
  
  // Warmup
  for (let i = 0; i < 5; i++) {
    await onnxInfer(VALID_INPUT);
  }
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await onnxInfer(VALID_INPUT);
    const end = performance.now();
    times.push(end - start);
  }
  
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(iterations * 0.50)];
  const p99 = times[Math.floor(iterations * 0.99)];
  
  console.table({
    P50: `${p50.toFixed(2)} ms`,
    P99: `${p99.toFixed(2)} ms`,
  });

  assertEquals(p50 < 100, true, `P50 foi ${p50}ms (esperado < 100ms)`);
  assertEquals(p99 < 200, true, `P99 foi ${p99}ms (esperado < 200ms)`);
});

Deno.test('PredictionEngine - Integração com onnxInfer', async () => {
  resetSession();
  const engine = new PredictionEngine();
  await engine.initialize(MOCK_MODEL_PATH);
  
  const result = await engine.predict(VALID_INPUT);
  assertEquals(typeof result.distressProbability, 'number');
});
