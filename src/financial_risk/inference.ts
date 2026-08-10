import {
  type ArtifactManifest,
  createFallbackPrediction,
  getLoadedArtifactManifest,
  ONNXEngine,
  type ONNXModelInput,
  type ONNXPredictionResult,
} from "../engines/prediction/onnx.ts";
import { PredictionError } from "../engines/prediction/errors.ts";
import { payloadDigest } from "../platform/persistence/v1.ts";
import {
  assertFinancialRiskInput,
  assertFinancialRiskOutputs,
} from "./model.ts";
import type {
  FinancialRiskInput,
  FinancialRiskOutputs,
  FinancialRiskPromptLineage,
  FinancialRiskProvenance,
} from "./model.ts";

export const DEFAULT_FINANCIAL_RISK_PROMPT: FinancialRiskPromptLineage = Object
  .freeze({
    templateReference: "src/agent/agents/financial-risk/instructions.md",
    templateVersion: "1.0.0",
    promptDigest:
      "sha256:363b21dd3cf0b8704492506711ba6e42e1f6ab95de62b8d046d6495688bb2d8b",
  });

export interface FinancialRiskRuntimeMetadata {
  readonly runtimeIdentity: string;
  readonly adapterIdentity: string;
  readonly providerIdentity?: string;
  readonly modelId?: string;
  readonly modelVersion?: string;
  readonly artifactChecksum?: string;
  readonly readiness: "reference-only" | "not-claimed" | "unavailable";
}

export interface FinancialRiskRuntimePort {
  metadata(): FinancialRiskRuntimeMetadata;
  runModel(input: FinancialRiskInput): Promise<ONNXPredictionResult>;
  runFallback(
    input: FinancialRiskInput,
    reason: string,
  ): Promise<ONNXPredictionResult>;
}

export type FinancialRiskInferenceResult =
  | {
    readonly state: "completed";
    readonly outputs: FinancialRiskOutputs;
    readonly provenance: FinancialRiskProvenance;
  }
  | {
    readonly state: "fallback";
    readonly outputs: FinancialRiskOutputs;
    readonly provenance: FinancialRiskProvenance;
  }
  | {
    readonly state: "unavailable" | "failed" | "cancelled";
    readonly reason: string;
    readonly provenance: FinancialRiskProvenance;
  };

export class FinancialRiskInferenceAdapter {
  constructor(
    private readonly runtime: FinancialRiskRuntimePort,
    private readonly fallbackPolicy: "disabled" | "configured" = "disabled",
    private readonly prompt: FinancialRiskPromptLineage =
      DEFAULT_FINANCIAL_RISK_PROMPT,
  ) {}

  async infer(
    input: FinancialRiskInput,
  ): Promise<FinancialRiskInferenceResult> {
    const inputDigest = await payloadDigest(input);
    const metadata = this.runtime.metadata();
    const lineage = {
      providerIdentity: metadata.providerIdentity ?? metadata.runtimeIdentity,
      prompt: this.prompt,
      inputDigest,
    };
    try {
      assertFinancialRiskInput(input);
    } catch (error) {
      return failedResult(describeError(error), metadata, lineage);
    }
    if (metadata.readiness !== "reference-only") {
      return this.unavailableWithConfiguredFallback(
        input,
        metadata,
        `Financial-risk runtime readiness is "${metadata.readiness}"; expected "reference-only".`,
        lineage,
      );
    }
    try {
      const result = await this.runtime.runModel(input);
      return modelInference(result, metadata, lineage);
    } catch (error) {
      const reason = describeError(error);
      if (this.fallbackPolicy === "configured") {
        try {
          const fallback = await this.runtime.runFallback(input, reason);
          return configuredFallback(fallback, metadata, reason, lineage);
        } catch (fallbackError) {
          return failedResult(
            `Configured fallback failed after model error "${reason}": ${
              describeError(fallbackError)
            }`,
            metadata,
            lineage,
          );
        }
      }
      return unavailableOrFailed(error, metadata, reason, lineage);
    }
  }

  private async unavailableWithConfiguredFallback(
    input: FinancialRiskInput,
    metadata: FinancialRiskRuntimeMetadata,
    reason: string,
    lineage: FinancialRiskLineage,
  ): Promise<FinancialRiskInferenceResult> {
    if (this.fallbackPolicy !== "configured") {
      return unavailableResult(reason, metadata, lineage);
    }
    try {
      const fallback = await this.runtime.runFallback(input, reason);
      return configuredFallback(fallback, metadata, reason, lineage);
    } catch (error) {
      return failedResult(
        `Configured fallback failed after unavailable runtime "${reason}": ${
          describeError(error)
        }`,
        metadata,
        lineage,
      );
    }
  }
}

export class OnnxFinancialRiskRuntime implements FinancialRiskRuntimePort {
  metadata(): FinancialRiskRuntimeMetadata {
    const manifest = getLoadedArtifactManifest();
    return manifest === null
      ? unavailableMetadata()
      : manifestMetadata(manifest);
  }

  runModel(input: FinancialRiskInput): Promise<ONNXPredictionResult> {
    return ONNXEngine.runModelInference(input as ONNXModelInput);
  }

  runFallback(
    input: FinancialRiskInput,
    reason: string,
  ): Promise<ONNXPredictionResult> {
    const values = new Float32Array([
      input.ebitda,
      input.revenue,
      input.totalAssets,
      input.totalLiabilities,
      input.operatingCashFlow,
      input.historicalVolatility,
    ]);
    const result = createFallbackPrediction(values, reason);
    return Promise.resolve({
      resultKind: result.resultKind,
      provenance: result.provenance,
      insolvencyRisk: result.distressProbability,
      churnProbability: result.churnProbability,
      dcfVolatility: result.dcfVolatility,
      industry4Score: result.industry4Score,
      zScore: result.zScoreLabel,
    });
  }
}

function modelInference(
  result: ONNXPredictionResult,
  metadata: FinancialRiskRuntimeMetadata,
  lineage: FinancialRiskLineage,
): FinancialRiskInferenceResult {
  if (result.resultKind !== "model") {
    return failedResult(
      "Runtime returned a non-model result for model inference.",
      metadata,
      lineage,
    );
  }
  const modelId = result.provenance.modelId ?? metadata.modelId;
  const modelVersion = result.provenance.modelVersion ?? metadata.modelVersion;
  const artifactChecksum = result.provenance.artifactSha256 ??
    metadata.artifactChecksum;
  if (
    modelId === undefined || modelVersion === undefined ||
    artifactChecksum === undefined || metadata.readiness !== "reference-only"
  ) {
    return failedResult(
      "Model provenance is incomplete; expected reference readiness, model, version, and artifact checksum.",
      metadata,
      lineage,
    );
  }
  const outputs = outputsFrom(result);
  try {
    assertFinancialRiskOutputs(outputs);
  } catch (error) {
    return failedResult(describeError(error), metadata, lineage);
  }
  return {
    state: "completed",
    outputs,
    provenance: {
      kind: "model-inference",
      ...lineage,
      modelId,
      modelVersion,
      artifactChecksum,
      readiness: "reference-only",
      runtimeIdentity: metadata.runtimeIdentity,
      adapterIdentity: metadata.adapterIdentity,
    },
  };
}

function configuredFallback(
  result: ONNXPredictionResult,
  metadata: FinancialRiskRuntimeMetadata,
  reason: string,
  lineage: FinancialRiskLineage,
): FinancialRiskInferenceResult {
  if (result.resultKind !== "fallback") {
    return failedResult(
      "Configured fallback returned a model result.",
      metadata,
      lineage,
    );
  }
  const outputs = outputsFrom(result);
  try {
    assertFinancialRiskOutputs(outputs);
  } catch (error) {
    return failedResult(describeError(error), metadata, lineage);
  }
  return {
    state: "fallback",
    outputs,
    provenance: {
      kind: "configured-fallback",
      ...lineage,
      fallbackReason: reason,
      readiness: "not-claimed",
      runtimeIdentity: metadata.runtimeIdentity,
      adapterIdentity: metadata.adapterIdentity,
    },
  };
}

function unavailableOrFailed(
  error: unknown,
  metadata: FinancialRiskRuntimeMetadata,
  reason: string,
  lineage: FinancialRiskLineage,
): FinancialRiskInferenceResult {
  const state = error instanceof PredictionError &&
      [
        "PREDICTION_NOT_INITIALIZED",
        "ARTIFACT_MISSING",
        "ARTIFACT_UNREADABLE",
        "ARTIFACT_CORRUPT",
        "ARTIFACT_MANIFEST_INVALID",
        "ARTIFACT_TENSOR_CONTRACT_INVALID",
        "ARTIFACT_LOAD_FAILED",
      ].includes(error.code)
    ? "unavailable"
    : "failed";
  return state === "unavailable"
    ? unavailableResult(reason, metadata, lineage)
    : failedResult(reason, metadata, lineage);
}

function unavailableResult(
  reason: string,
  metadata: FinancialRiskRuntimeMetadata,
  lineage: FinancialRiskLineage,
): FinancialRiskInferenceResult {
  return {
    state: "unavailable",
    reason,
    provenance: {
      kind: "unavailable",
      ...lineage,
      reason,
      readiness: "unavailable",
      runtimeIdentity: metadata.runtimeIdentity,
      adapterIdentity: metadata.adapterIdentity,
    },
  };
}

function failedResult(
  reason: string,
  metadata: FinancialRiskRuntimeMetadata,
  lineage?: FinancialRiskLineage,
): FinancialRiskInferenceResult {
  return {
    state: "failed",
    reason,
    provenance: {
      kind: "failed",
      ...lineage,
      reason,
      readiness: "unavailable",
      runtimeIdentity: metadata.runtimeIdentity,
      adapterIdentity: metadata.adapterIdentity,
    },
  };
}

function outputsFrom(result: ONNXPredictionResult): FinancialRiskOutputs {
  return {
    insolvencyRisk: result.insolvencyRisk,
    churnProbability: result.churnProbability,
    dcfVolatility: result.dcfVolatility,
    industry4Score: result.industry4Score,
    zScore: result.zScore,
  };
}

function manifestMetadata(
  manifest: ArtifactManifest,
): FinancialRiskRuntimeMetadata {
  return {
    runtimeIdentity: "onnxruntime-web",
    adapterIdentity: "financial-risk-onnx-adapter",
    providerIdentity: "reference-onnx-runtime",
    modelId: manifest.modelId,
    modelVersion: manifest.modelVersion,
    artifactChecksum: manifest.artifact.sha256,
    readiness: manifest.artifact.readinessClassification,
  };
}

function unavailableMetadata(): FinancialRiskRuntimeMetadata {
  return {
    runtimeIdentity: "onnxruntime-web",
    adapterIdentity: "financial-risk-onnx-adapter",
    providerIdentity: "reference-onnx-runtime",
    readiness: "unavailable",
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface FinancialRiskLineage {
  readonly providerIdentity: string;
  readonly prompt: FinancialRiskPromptLineage;
  readonly inputDigest: string;
}
