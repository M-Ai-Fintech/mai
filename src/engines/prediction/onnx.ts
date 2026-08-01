import { env } from "@huggingface/transformers";
// onnxruntime-web is a transitive runtime peer without a root import-map alias.
// deno-lint-ignore no-import-prefix
import * as ort from "npm:onnxruntime-web@1.21.0";
import {
  type ArtifactManifest,
  DEFAULT_MODEL_PATH,
  INPUT_FEATURES,
  MODEL_INPUT_NAME,
  MODEL_OUTPUT_NAME,
  type ONNXModelInput,
  type OnnxOutput,
  type ONNXPredictionResult,
  OUTPUT_MAPPINGS,
  ZScoreLabel,
} from "./contracts.ts";
import {
  manifestPathForModel,
  readArtifactBytes,
  readArtifactManifest,
  sha256Hex,
  validateArtifactChecksum,
  validateModelContract,
} from "./artifact.ts";
import {
  ArtifactLoadError,
  ArtifactTensorContractError,
  PredictionError,
  PredictionInferenceError,
  PredictionInputError,
  PredictionNotInitializedError,
} from "./errors.ts";
import { inspectOnnxModel } from "./onnx-protobuf.ts";

// Configure the WASM backend for Deno.
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

export type OnnxInput = Float32Array;

let session: ort.InferenceSession | null = null;
let loadedManifest: ArtifactManifest | null = null;

export async function loadOnnxModel(
  path: string = DEFAULT_MODEL_PATH,
  manifestPath: string = manifestPathForModel(path),
): Promise<void> {
  const modelBytes = await readArtifactBytes(path);
  const manifest = await readArtifactManifest(manifestPath);
  const checksum = await sha256Hex(modelBytes);
  validateArtifactChecksum(path, manifest, checksum);
  validateContract(path, modelBytes, manifest);
  try {
    session = await ort.InferenceSession.create(path);
    loadedManifest = manifest;
  } catch (error: unknown) {
    resetSession();
    throw new ArtifactLoadError(path, error);
  }
}

export function validateInput(input: unknown): asserts input is OnnxInput {
  if (!(input instanceof Float32Array)) {
    throw new PredictionInputError(input, "the value must be a Float32Array");
  }
  if (input.length !== INPUT_FEATURES.length) {
    throw new PredictionInputError(
      input,
      `received ${input.length} values in order [${
        INPUT_FEATURES.join(", ")
      }], expected exactly ${INPUT_FEATURES.length}`,
    );
  }
  if (Array.from(input).some((value) => !Number.isFinite(value))) {
    throw new PredictionInputError(
      input,
      "all six values must be finite numbers",
    );
  }
}

export async function onnxInfer(input: OnnxInput): Promise<OnnxOutput> {
  validateInput(input);
  const activeSession = requireSession();
  try {
    const output = await runSession(activeSession, input);
    return mapModelOutput(output);
  } catch (error: unknown) {
    if (error instanceof PredictionError) throw error;
    throw new PredictionInferenceError(describeError(error), error);
  }
}

function requireSession(): ort.InferenceSession {
  if (session) return session;
  throw new PredictionNotInitializedError();
}

async function runSession(
  activeSession: ort.InferenceSession,
  input: OnnxInput,
): Promise<ort.Tensor> {
  const tensor = new ort.Tensor("float32", input, [1, input.length]);
  const results = await activeSession.run({
    [MODEL_INPUT_NAME]: tensor,
  });
  if (
    activeSession.outputNames.length !== 1 ||
    activeSession.outputNames[0] !== MODEL_OUTPUT_NAME
  ) {
    throw new ArtifactTensorContractError(
      `runtime output names ${
        JSON.stringify(activeSession.outputNames)
      } do not match ["${MODEL_OUTPUT_NAME}"]`,
    );
  }
  const output = results[MODEL_OUTPUT_NAME];
  if (!output) {
    throw new ArtifactTensorContractError(
      `runtime returned no tensor named "${MODEL_OUTPUT_NAME}"`,
    );
  }
  if (
    output.type !== "float32" || output.dims.length !== 2 ||
    output.dims[1] !== 4
  ) {
    throw new ArtifactTensorContractError(
      `runtime output tensor has type ${output.type} and shape ${
        JSON.stringify(output.dims)
      }, expected float32 [1, 4]`,
    );
  }
  if (!(output.data instanceof Float32Array) || output.data.length !== 4) {
    throw new ArtifactTensorContractError(
      `runtime output data has type ${output.data.constructor.name} and length ${output.data.length}, expected Float32Array length 4`,
    );
  }
  return output;
}

function mapModelOutput(output: ort.Tensor): OnnxOutput {
  const values = output.data as Float32Array;
  const insolvencyRisk = scaledValue(values, OUTPUT_MAPPINGS[0].index, 1);
  return {
    resultKind: "model",
    provenance: {
      kind: "reference-model",
      modelId: loadedManifest?.modelId,
      modelVersion: loadedManifest?.modelVersion,
      artifactSha256: loadedManifest?.artifact.sha256,
    },
    distressProbability: boundedProbability(insolvencyRisk),
    zScoreLabel: zScoreLabel(insolvencyRisk),
    churnProbability: scaledValue(
      values,
      OUTPUT_MAPPINGS[1].index,
      OUTPUT_MAPPINGS[1].scale,
    ),
    dcfVolatility: scaledValue(
      values,
      OUTPUT_MAPPINGS[2].index,
      OUTPUT_MAPPINGS[2].scale,
    ),
    industry4Score: scaledValue(
      values,
      OUTPUT_MAPPINGS[3].index,
      OUTPUT_MAPPINGS[3].scale,
    ),
  };
}

function scaledValue(
  values: Float32Array,
  index: number,
  scale: number,
): number {
  return boundedScore(values[index]) * scale;
}

function boundedProbability(value: number): number {
  return Math.max(1e-7, Math.min(1 - 1e-7, boundedScore(value)));
}

function boundedScore(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function zScoreLabel(distressProbability: number): ZScoreLabel {
  const zScore = 2 + Math.log((1 - distressProbability) / distressProbability);
  if (zScore < 1.81) return ZScoreLabel.Distress;
  if (zScore < 2.99) return ZScoreLabel.Grey;
  return ZScoreLabel.Safe;
}

export function resetSession(): void {
  session = null;
  loadedManifest = null;
}

export function getLoadedArtifactManifest(): ArtifactManifest | null {
  return loadedManifest;
}

export class ONNXEngine {
  static async runModelInference(
    input: ONNXModelInput,
  ): Promise<ONNXPredictionResult> {
    const result = await onnxInfer(modelArray(input));
    return {
      resultKind: result.resultKind,
      provenance: result.provenance,
      insolvencyRisk: result.distressProbability,
      churnProbability: result.churnProbability,
      dcfVolatility: result.dcfVolatility,
      industry4Score: result.industry4Score,
      zScore: result.zScoreLabel,
    };
  }
}

export function createFallbackPrediction(
  input: OnnxInput,
  reason: string,
): OnnxOutput {
  validateInput(input);
  const [
    ebitda,
    revenue,
    totalAssets,
    totalLiabilities,
    operatingCashFlow,
    volatility,
  ] = input;
  const assets = totalAssets === 0 ? 1 : Math.abs(totalAssets);
  const leverage = Math.abs(totalLiabilities) / assets;
  const score = 1.2 * (revenue * 0.1 / assets) + 3.3 * (ebitda / assets);
  const insolvencyRisk = 1 / (1 + Math.exp(score - 1.5));
  const churnProbability = Math.min(
    0.98,
    Math.max(
      0.02,
      leverage * 0.4 + (operatingCashFlow < 0 ? 0.3 : 0) + volatility * 0.5,
    ),
  );
  const dcfVolatility = Math.min(
    100,
    Math.max(2, volatility * 30 + leverage * 10),
  );
  const industry4Score = Math.max(
    0,
    Math.min(100, 100 - insolvencyRisk * 50 - churnProbability * 30),
  );
  return {
    resultKind: "fallback",
    provenance: { kind: "heuristic-fallback", reason },
    distressProbability: boundedProbability(insolvencyRisk),
    zScoreLabel: zScoreLabel(insolvencyRisk),
    churnProbability,
    dcfVolatility,
    industry4Score,
  };
}

function modelArray(input: ONNXModelInput): Float32Array {
  return new Float32Array([
    input.ebitda,
    input.revenue,
    input.totalAssets,
    input.totalLiabilities,
    input.operatingCashFlow,
    input.historicalVolatility,
  ]);
}

function validateContract(
  path: string,
  modelBytes: Uint8Array,
  manifest: ArtifactManifest,
): void {
  try {
    validateModelContract(inspectOnnxModel(modelBytes), manifest);
  } catch (error: unknown) {
    if (error instanceof ArtifactTensorContractError) throw error;
    throw new ArtifactLoadError(path, error);
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export {
  type ArtifactManifest,
  DEFAULT_MODEL_PATH,
  type ONNXModelInput,
  type OnnxOutput,
  type ONNXPredictionResult,
  ZScoreLabel,
};
