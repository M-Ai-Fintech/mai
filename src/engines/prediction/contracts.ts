export const DEFAULT_MODEL_PATH = "models/ma_classifier_q8.onnx";
export const DEFAULT_MANIFEST_PATH = "models/ma_classifier_q8.manifest.json";

export const MODEL_INPUT_NAME = "financials";
export const MODEL_OUTPUT_NAME = "predictions";
export const MODEL_OPSET = 17;

export const INPUT_FEATURES = [
  "ebitda",
  "revenue",
  "totalAssets",
  "totalLiabilities",
  "operatingCashFlow",
  "historicalVolatility",
] as const;

export const OUTPUT_MAPPINGS = [
  { name: "insolvencyRisk", index: 0, scale: 1, unit: "probability" },
  { name: "churnProbability", index: 1, scale: 1, unit: "probability" },
  { name: "dcfVolatility", index: 2, scale: 100, unit: "percent" },
  { name: "industry4Score", index: 3, scale: 100, unit: "score" },
] as const;

export type InputFeatureName = typeof INPUT_FEATURES[number];
export type OutputName = typeof OUTPUT_MAPPINGS[number]["name"];
export type ReadinessClassification = "reference-only";
export type TensorDataType = "float32";

export enum ZScoreLabel {
  Safe = "Safe",
  Grey = "Grey",
  Distress = "Distress",
}

export interface TensorManifest {
  readonly name: string;
  readonly dtype: TensorDataType;
  readonly shape: readonly [string, number];
}

export interface InputManifest extends TensorManifest {
  readonly features: readonly InputFeatureName[];
}

export interface OutputMappingManifest {
  readonly name: OutputName;
  readonly index: number;
  readonly scale: number;
  readonly unit: string;
}

export interface OutputManifest extends TensorManifest {
  readonly values: readonly OutputMappingManifest[];
}

export interface ArtifactManifest {
  readonly schemaVersion: 1;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly trainingCodeVersion: string;
  readonly input: InputManifest;
  readonly output: OutputManifest;
  readonly onnx: {
    readonly opset: number;
    readonly quantization: string;
  };
  readonly artifact: {
    readonly path: string;
    readonly sha256: string;
    readonly generatedTimestamp: string;
    readonly readinessClassification: ReadinessClassification;
  };
  readonly dataset: {
    readonly source: string;
    readonly generationMethod: string;
    readonly schema: readonly string[];
    readonly limitations: readonly string[];
  };
}

export interface PredictionProvenance {
  readonly kind: "reference-model" | "heuristic-fallback";
  readonly modelId?: string;
  readonly modelVersion?: string;
  readonly artifactSha256?: string;
  readonly reason?: string;
}

export type PredictionResultKind = "model" | "fallback";

export interface OnnxOutput {
  readonly resultKind: PredictionResultKind;
  readonly provenance: PredictionProvenance;
  readonly distressProbability: number;
  readonly zScoreLabel: ZScoreLabel;
  readonly churnProbability: number;
  readonly dcfVolatility: number;
  readonly industry4Score: number;
}

export interface ONNXModelInput {
  readonly ebitda: number;
  readonly revenue: number;
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  readonly operatingCashFlow: number;
  readonly historicalVolatility: number;
}

export interface ONNXPredictionResult {
  readonly resultKind: PredictionResultKind;
  readonly provenance: PredictionProvenance;
  readonly insolvencyRisk: number;
  readonly churnProbability: number;
  readonly dcfVolatility: number;
  readonly industry4Score: number;
  readonly zScore: ZScoreLabel;
}
