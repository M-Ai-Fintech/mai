import { assertEquals, assertRejects } from "@std/assert";
import { initializeOnnxEngine } from "../../src/core/boot.ts";
import {
  readArtifactBytes,
  readArtifactManifest,
  sha256Hex,
} from "../../src/engines/prediction/artifact.ts";
import {
  ArtifactCorruptError,
  ArtifactManifestError,
  ArtifactMissingError,
  ArtifactTensorContractError,
  ArtifactUnreadableError,
  PredictionInputError,
} from "../../src/engines/prediction/errors.ts";
import { PredictionEngine } from "../../src/engines/prediction/index.ts";
import {
  getLoadedArtifactManifest,
  loadOnnxModel,
  resetSession,
  validateInput,
} from "../../src/engines/prediction/onnx.ts";

const MODEL_PATH = "models/ma_classifier_q8.onnx";
const MANIFEST_PATH = "models/ma_classifier_q8.manifest.json";
const VALID_INPUT = new Float32Array([1.5, 2, -0.5, 1.2, 0.8, 3.1]);

Deno.test("MAI-142 artifact manifest checksum matches the checked-in model", async () => {
  const bytes = await readArtifactBytes(MODEL_PATH);
  const manifest = await readArtifactManifest(MANIFEST_PATH);
  const checksum = await sha256Hex(bytes);

  assertEquals(checksum, manifest.artifact.sha256);
  assertEquals(manifest.output.values.length, 4);
  assertEquals(
    (await Deno.readTextFile("models/ma_classifier_q8.onnx.sha256")).trim(),
    `${checksum}  ma_classifier_q8.onnx`,
  );
});

Deno.test("MAI-142 distinguishes missing, unreadable, corrupt, and invalid artifacts", async () => {
  const tempDirectory = await Deno.makeTempDir({
    prefix: "reference-artifact-",
  });
  const manifestPath = `${tempDirectory}/candidate.manifest.json`;
  const baseManifest = JSON.parse(
    await Deno.readTextFile(MANIFEST_PATH),
  ) as Record<
    string,
    unknown
  >;
  try {
    await Deno.writeTextFile(manifestPath, JSON.stringify(baseManifest));
    await assertRejects(
      () => loadOnnxModel(`${tempDirectory}/missing.onnx`, manifestPath),
      ArtifactMissingError,
    );
    await assertRejects(
      () => loadOnnxModel(tempDirectory, manifestPath),
      ArtifactUnreadableError,
    );

    const corruptPath = `${tempDirectory}/corrupt.onnx`;
    await Deno.writeFile(corruptPath, new Uint8Array([1, 2, 3, 4]));
    await assertRejects(
      () => loadOnnxModel(corruptPath, manifestPath),
      ArtifactCorruptError,
    );

    const invalidManifestPath = `${tempDirectory}/invalid.manifest.json`;
    await Deno.writeTextFile(invalidManifestPath, "{}\n");
    await assertRejects(
      () => loadOnnxModel(MODEL_PATH, invalidManifestPath),
      ArtifactManifestError,
    );
  } finally {
    resetSession();
    await Deno.remove(tempDirectory, { recursive: true });
  }
});

Deno.test("MAI-142 rejects an artifact whose manifest tensor name is incompatible", async () => {
  const tempDirectory = await Deno.makeTempDir({
    prefix: "reference-contract-",
  });
  const manifestPath = `${tempDirectory}/candidate.manifest.json`;
  const manifest = JSON.parse(await Deno.readTextFile(MANIFEST_PATH)) as {
    input: { name: string };
  };
  manifest.input.name = "wrong-input";
  try {
    await Deno.writeTextFile(manifestPath, JSON.stringify(manifest));
    await assertRejects(
      () => loadOnnxModel(MODEL_PATH, manifestPath),
      ArtifactTensorContractError,
    );
  } finally {
    resetSession();
    await Deno.remove(tempDirectory, { recursive: true });
  }
});

Deno.test("MAI-142 validates exactly six finite ordered inputs", () => {
  validateInput(VALID_INPUT);
  for (
    const invalidInput of [
      new Float32Array(5),
      new Float32Array([1, 2, 3, 4, 5, Number.NaN]),
    ]
  ) {
    let error: unknown;
    try {
      validateInput(invalidInput);
    } catch (caught: unknown) {
      error = caught;
    }
    assertEquals(error instanceof PredictionInputError, true);
  }
});

Deno.test("MAI-142 returns an explicit fallback classification with provenance", async () => {
  resetSession();
  const result = await new PredictionEngine().predictWithFallback(VALID_INPUT);

  assertEquals(result.resultKind, "fallback");
  assertEquals(result.provenance.kind, "heuristic-fallback");
  assertEquals(result.provenance.reason, "PREDICTION_NOT_INITIALIZED");
  assertEquals(Number.isFinite(result.distressProbability), true);
});

Deno.test("MAI-142 application bootstrap path initializes the validated artifact", async () => {
  resetSession();
  await initializeOnnxEngine();

  assertEquals(
    getLoadedArtifactManifest()?.modelId,
    "mai-financial-risk-reference",
  );
  assertEquals(
    getLoadedArtifactManifest()?.artifact.readinessClassification,
    "reference-only",
  );
  resetSession();
});
