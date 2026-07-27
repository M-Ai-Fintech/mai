import { env } from "@huggingface/transformers";
// onnxruntime-web is a transitive runtime peer without a root import-map alias.
// deno-lint-ignore no-import-prefix
import * as ort from "npm:onnxruntime-web@1.21.0";
import { z } from "zod";
import { describeError } from "../../shared/errors.ts";

// Configure the WASM backend for Deno.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

export enum ZScoreLabel {
  Safe = "Safe",
  Grey = "Grey",
  Distress = "Distress",
}

export type OnnxInput = Float32Array;

export interface OnnxOutput {
  distressProbability: number;
  zScoreLabel: ZScoreLabel;
}

const InputSchema = z.instanceof(Float32Array).refine((arr) => arr.length > 0, {
  message: "Input array must not be empty",
});

let session: ort.InferenceSession | null = null;

export async function loadOnnxModel(path: string): Promise<void> {
  try {
    session = await ort.InferenceSession.create(path);
  } catch (error: unknown) {
    throw new Error(
      `Failed to load ONNX model via WASM from "${path}"; expected a readable ONNX model: ${
        describeError(error)
      }`,
    );
  }
}

export function validateInput(input: OnnxInput): void {
  InputSchema.parse(input);
}

export async function onnxInfer(input: OnnxInput): Promise<OnnxOutput> {
  validateInput(input);
  const activeSession = requireSession();
  const rawProbability = await distressProbability(activeSession, input);
  const probability = boundedProbability(rawProbability);
  return {
    distressProbability: probability,
    zScoreLabel: zScoreLabel(probability),
  };
}

function requireSession(): ort.InferenceSession {
  if (session) return session;
  throw new Error(
    "ONNX model not loaded: session was null; expected loadOnnxModel() to initialize it first.",
  );
}

async function distressProbability(
  activeSession: ort.InferenceSession,
  input: OnnxInput,
): Promise<number> {
  const tensor = new ort.Tensor("float32", input, [1, input.length]);
  const results = await activeSession.run({
    [activeSession.inputNames[0]]: tensor,
  });
  const output = results[activeSession.outputNames[0]].data as Float32Array;
  return output[0];
}

function boundedProbability(value: number): number {
  const finiteValue = typeof value === "number" && !isNaN(value) ? value : 0;
  return Math.max(1e-7, Math.min(1 - 1e-7, finiteValue));
}

function zScoreLabel(distressProbability: number): ZScoreLabel {
  const zScore = 2 + Math.log((1 - distressProbability) / distressProbability);
  if (zScore < 1.81) return ZScoreLabel.Distress;
  if (zScore < 2.99) return ZScoreLabel.Grey;
  return ZScoreLabel.Safe;
}

export function resetSession() {
  session = null;
}

export interface ONNXModelInput {
  ebitda: number;
  revenue: number;
  totalAssets: number;
  totalLiabilities: number;
  operatingCashFlow: number;
  historicalVolatility: number;
}

export interface ONNXPredictionResult {
  insolvencyRisk: number;
  zScore: ZScoreLabel;
}

export class ONNXEngine {
  static async runModelInference(
    input: ONNXModelInput,
  ): Promise<ONNXPredictionResult> {
    try {
      const res = await onnxInfer(modelArray(input));
      return {
        insolvencyRisk: res.distressProbability,
        zScore: res.zScoreLabel,
      };
    } catch (error: unknown) {
      console.error(
        `[ONNX] Session error or not initialized: ${describeError(error)}`,
      );
      throw error;
    }
  }
}

function modelArray(input: ONNXModelInput): Float32Array {
  return new Float32Array([
    input.ebitda || 0,
    input.revenue || 0,
    input.totalAssets || 1,
    input.totalLiabilities || 0,
    input.operatingCashFlow || 0,
    input.historicalVolatility || 0,
  ]);
}
