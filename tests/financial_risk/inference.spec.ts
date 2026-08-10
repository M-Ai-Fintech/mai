import { assertEquals } from "@std/assert";
import { PredictionNotInitializedError } from "../../src/engines/prediction/errors.ts";
import type { ONNXPredictionResult } from "../../src/engines/prediction/contracts.ts";
import {
  FinancialRiskInferenceAdapter,
  type FinancialRiskRuntimeMetadata,
  type FinancialRiskRuntimePort,
} from "../../src/financial_risk/inference.ts";
import type { FinancialRiskInput } from "../../src/financial_risk/model.ts";
import {
  FALLBACK_OUTPUTS,
  MODEL_OUTPUTS,
  TEST_CHECKSUM,
  TEST_INPUT,
} from "./support.ts";

Deno.test("uninitialized model capability is unavailable without fallback policy", async () => {
  const runtime = new FakeRuntime(new PredictionNotInitializedError());
  const result = await new FinancialRiskInferenceAdapter(runtime).infer(
    TEST_INPUT,
  );

  assertEquals(result.state, "unavailable");
  assertEquals(runtime.fallbackCalls, 0);
});

Deno.test("configured fallback records explicit fallback provenance", async () => {
  const runtime = new FakeRuntime(new PredictionNotInitializedError());
  const result = await new FinancialRiskInferenceAdapter(runtime, "configured")
    .infer(TEST_INPUT);

  assertEquals(result.state, "fallback");
  if (result.state === "fallback") {
    assertEquals(result.provenance.kind, "configured-fallback");
    assertEquals(result.provenance.readiness, "not-claimed");
  }
  assertEquals(runtime.fallbackCalls, 1);
});

Deno.test("non-reference runtime readiness fails closed before model execution", async () => {
  const runtime = new FakeRuntime(undefined, undefined, "not-claimed");
  const result = await new FinancialRiskInferenceAdapter(runtime).infer(
    TEST_INPUT,
  );

  assertEquals(result.state, "unavailable");
  assertEquals(runtime.modelCalls, 0);
  assertEquals(runtime.fallbackCalls, 0);
});

Deno.test("model results missing immutable artifact lineage fail closed", async () => {
  const runtime = new FakeRuntime(undefined, {
    resultKind: "model",
    provenance: {
      kind: "reference-model",
    },
    insolvencyRisk: MODEL_OUTPUTS.insolvencyRisk,
    churnProbability: MODEL_OUTPUTS.churnProbability,
    dcfVolatility: MODEL_OUTPUTS.dcfVolatility,
    industry4Score: MODEL_OUTPUTS.industry4Score,
    zScore: MODEL_OUTPUTS.zScore,
  });
  const result = await new FinancialRiskInferenceAdapter(runtime).infer(
    TEST_INPUT,
  );

  assertEquals(result.state, "failed");
});

Deno.test("model results with heuristic-fallback provenance fail closed", async () => {
  const runtime = new FakeRuntime(undefined, {
    resultKind: "model",
    provenance: {
      kind: "heuristic-fallback",
      reason: "misclassified runtime result",
    },
    insolvencyRisk: MODEL_OUTPUTS.insolvencyRisk,
    churnProbability: MODEL_OUTPUTS.churnProbability,
    dcfVolatility: MODEL_OUTPUTS.dcfVolatility,
    industry4Score: MODEL_OUTPUTS.industry4Score,
    zScore: MODEL_OUTPUTS.zScore,
  });
  const result = await new FinancialRiskInferenceAdapter(runtime).infer(
    TEST_INPUT,
  );

  assertEquals(result.state, "failed");
  assertEquals("outputs" in result, false);
});

Deno.test("fallback results with reference-model provenance fail closed", async () => {
  const runtime = new FakeRuntime(
    new PredictionNotInitializedError(),
    undefined,
    "reference-only",
    {
      resultKind: "fallback",
      provenance: {
        kind: "reference-model",
        modelId: "reference-risk-model",
        modelVersion: "1.0.0",
        artifactSha256: TEST_CHECKSUM,
      },
      insolvencyRisk: FALLBACK_OUTPUTS.insolvencyRisk,
      churnProbability: FALLBACK_OUTPUTS.churnProbability,
      dcfVolatility: FALLBACK_OUTPUTS.dcfVolatility,
      industry4Score: FALLBACK_OUTPUTS.industry4Score,
      zScore: FALLBACK_OUTPUTS.zScore,
    },
  );
  const result = await new FinancialRiskInferenceAdapter(runtime, "configured")
    .infer(TEST_INPUT);

  assertEquals(result.state, "failed");
  assertEquals("outputs" in result, false);
});

Deno.test("malformed model outputs become a failed inference result", async () => {
  const runtime = new FakeRuntime(undefined, {
    resultKind: "model",
    provenance: {
      kind: "reference-model",
      modelId: "reference-risk-model",
      modelVersion: "1.0.0",
      artifactSha256: TEST_CHECKSUM,
    },
    insolvencyRisk: Number.NaN,
    churnProbability: MODEL_OUTPUTS.churnProbability,
    dcfVolatility: MODEL_OUTPUTS.dcfVolatility,
    industry4Score: MODEL_OUTPUTS.industry4Score,
    zScore: MODEL_OUTPUTS.zScore,
  });
  const result = await new FinancialRiskInferenceAdapter(runtime).infer(
    TEST_INPUT,
  );

  assertEquals(result.state, "failed");
  assertEquals(result.provenance.kind, "failed");
});

class FakeRuntime implements FinancialRiskRuntimePort {
  fallbackCalls = 0;
  modelCalls = 0;
  private readonly error?: Error;
  private readonly modelResult?: ONNXPredictionResult;
  private readonly fallbackResult?: ONNXPredictionResult;
  private readonly readiness: FinancialRiskRuntimeMetadata["readiness"];

  constructor(
    error?: Error,
    modelResult?: ONNXPredictionResult,
    readiness: FinancialRiskRuntimeMetadata["readiness"] = "reference-only",
    fallbackResult?: ONNXPredictionResult,
  ) {
    this.error = error;
    this.modelResult = modelResult;
    this.readiness = readiness;
    this.fallbackResult = fallbackResult;
  }

  metadata(): FinancialRiskRuntimeMetadata {
    const metadata: FinancialRiskRuntimeMetadata = {
      runtimeIdentity: "fake-runtime",
      adapterIdentity: "fake-adapter",
      readiness: this.readiness,
    };
    if (this.modelResult?.provenance.modelId === undefined) return metadata;
    return {
      ...metadata,
      modelId: "reference-risk-model",
      modelVersion: "1.0.0",
      artifactChecksum: TEST_CHECKSUM,
    };
  }

  runModel(_input: FinancialRiskInput) {
    this.modelCalls++;
    if (this.error !== undefined) return Promise.reject(this.error);
    return Promise.resolve({
      resultKind: "model" as const,
      provenance: {
        kind: "reference-model" as const,
        modelId: "reference-risk-model",
        modelVersion: "1.0.0",
        artifactSha256: TEST_CHECKSUM,
      },
      insolvencyRisk: MODEL_OUTPUTS.insolvencyRisk,
      churnProbability: MODEL_OUTPUTS.churnProbability,
      dcfVolatility: MODEL_OUTPUTS.dcfVolatility,
      industry4Score: MODEL_OUTPUTS.industry4Score,
      zScore: MODEL_OUTPUTS.zScore,
      ...this.modelResult,
    });
  }

  runFallback(_input: FinancialRiskInput, _reason: string) {
    this.fallbackCalls++;
    if (this.fallbackResult !== undefined) {
      return Promise.resolve(this.fallbackResult);
    }
    return Promise.resolve({
      resultKind: "fallback" as const,
      provenance: { kind: "heuristic-fallback" as const, reason: "configured" },
      insolvencyRisk: FALLBACK_OUTPUTS.insolvencyRisk,
      churnProbability: FALLBACK_OUTPUTS.churnProbability,
      dcfVolatility: FALLBACK_OUTPUTS.dcfVolatility,
      industry4Score: FALLBACK_OUTPUTS.industry4Score,
      zScore: FALLBACK_OUTPUTS.zScore,
    });
  }
}
