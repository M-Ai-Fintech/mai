import { env } from 'npm:@huggingface/transformers';
import * as ort from 'npm:onnxruntime-web';
import { z } from 'zod';

// Configuração do backend WASM para rodar em Deno
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

export enum ZScoreLabel {
  Safe = 'Safe',
  Grey = 'Grey',
  Distress = 'Distress',
}

export type OnnxInput = Float32Array;

export interface OnnxOutput {
  distressProbability: number;
  zScoreLabel: ZScoreLabel;
}

const InputSchema = z.instanceof(Float32Array).refine((arr) => arr.length > 0, {
  message: 'Input array must not be empty',
});

let session: ort.InferenceSession | null = null;

export async function loadOnnxModel(path: string): Promise<void> {
  try {
    session = await ort.InferenceSession.create(path);
  } catch (error: any) {
    throw new Error(`Failed to load ONNX model via WASM: ${error.message}`);
  }
}

export function validateInput(input: OnnxInput): void {
  InputSchema.parse(input);
}

export async function onnxInfer(input: OnnxInput): Promise<OnnxOutput> {
  validateInput(input);

  if (!session) {
    throw new Error('ONNX model not loaded. Call loadOnnxModel() first.');
  }

  // Ensure tensor shape is correct for the model. We assume shape [1, N]
  const tensor = new ort.Tensor('float32', input, [1, input.length]);
  
  const inputName = session.inputNames[0];
  const feeds: Record<string, ort.Tensor> = {};
  feeds[inputName] = tensor;

  const results = await session.run(feeds);
  
  const outputName = session.outputNames[0];
  const outputTensor = results[outputName];
  const data = outputTensor.data as Float32Array;
  
  let distressProbability = data[0];
  if (typeof distressProbability !== 'number' || isNaN(distressProbability)) {
     distressProbability = 0;
  }
  
  // Cap to avoid Infinity in Z-Score calculation
  distressProbability = Math.max(1e-7, Math.min(1 - 1e-7, distressProbability));

  // Compute pseudo Z-Score based on inverse logic:
  // distressProbability = 1 / (1 + exp(Z - 2)) => Z = 2 + ln((1 - P) / P)
  const zScore = 2 + Math.log((1 - distressProbability) / distressProbability);

  let zScoreLabel = ZScoreLabel.Safe;
  if (zScore < 1.81) {
    zScoreLabel = ZScoreLabel.Distress;
  } else if (zScore < 2.99) {
    zScoreLabel = ZScoreLabel.Grey;
  }

  return {
    distressProbability,
    zScoreLabel,
  };
}

export function resetSession() {
  session = null;
}
