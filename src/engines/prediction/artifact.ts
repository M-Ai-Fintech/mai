import {
  type ArtifactManifest,
  DEFAULT_MANIFEST_PATH,
  INPUT_FEATURES,
  MODEL_INPUT_NAME,
  MODEL_OPSET,
  MODEL_OUTPUT_NAME,
  OUTPUT_MAPPINGS,
} from "./contracts.ts";
import {
  ArtifactCorruptError,
  ArtifactManifestError,
  ArtifactMissingError,
  ArtifactTensorContractError,
  ArtifactUnreadableError,
} from "./errors.ts";
import type { OnnxModelContract, OnnxTensorInfo } from "./onnx-protobuf.ts";

export function manifestPathForModel(modelPath: string): string {
  if (modelPath === "models/ma_classifier_q8.onnx") {
    return DEFAULT_MANIFEST_PATH;
  }
  return modelPath.replace(/\.onnx$/i, ".manifest.json");
}

export async function readArtifactBytes(path: string): Promise<Uint8Array> {
  try {
    return await Deno.readFile(path);
  } catch (error: unknown) {
    throw classifyFileError(path, error);
  }
}

export async function readArtifactManifest(
  path: string,
): Promise<ArtifactManifest> {
  let text: string;
  try {
    text = await Deno.readTextFile(path);
  } catch (error: unknown) {
    throw classifyFileError(path, error);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error: unknown) {
    throw new ArtifactManifestError(path, "valid JSON", error);
  }
  validateManifest(value, path);
  return value;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const ownedBytes = new Uint8Array(bytes.byteLength);
  ownedBytes.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", ownedBytes.buffer);
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  )
    .join("");
}

export function validateArtifactChecksum(
  modelPath: string,
  manifest: ArtifactManifest,
  actualChecksum: string,
): void {
  if (manifest.artifact.sha256 === actualChecksum) return;
  throw new ArtifactCorruptError(
    modelPath,
    manifest.artifact.sha256,
    actualChecksum,
  );
}

export function validateModelContract(
  contract: OnnxModelContract,
  manifest: ArtifactManifest,
): void {
  if (
    contract.opset !== MODEL_OPSET || contract.opset !== manifest.onnx.opset
  ) {
    throw new ArtifactTensorContractError(
      `opset ${contract.opset} does not match expected ${MODEL_OPSET}`,
    );
  }
  validateTensor(
    contract.inputs,
    manifest.input,
    MODEL_INPUT_NAME,
    INPUT_FEATURES.length,
    "input",
  );
  validateTensor(
    contract.outputs,
    manifest.output,
    MODEL_OUTPUT_NAME,
    OUTPUT_MAPPINGS.length,
    "output",
  );
}

function validateTensor(
  tensors: readonly OnnxTensorInfo[],
  manifestTensor: {
    readonly name: string;
    readonly dtype: string;
    readonly shape: readonly [string, number];
  },
  expectedName: string,
  expectedWidth: number,
  direction: "input" | "output",
): void {
  if (tensors.length !== 1) {
    throw new ArtifactTensorContractError(
      `${direction} tensor count ${tensors.length} does not match expected 1`,
    );
  }
  const tensor = tensors[0];
  if (tensor.name !== expectedName || tensor.name !== manifestTensor.name) {
    throw new ArtifactTensorContractError(
      `${direction} tensor name "${tensor.name}" does not match expected "${expectedName}"`,
    );
  }
  if (tensor.elementType !== 1 || manifestTensor.dtype !== "float32") {
    throw new ArtifactTensorContractError(
      `${direction} tensor dtype ${tensor.elementType} does not match expected float32`,
    );
  }
  if (tensor.shape.length !== 2 || tensor.shape[1]?.value !== expectedWidth) {
    throw new ArtifactTensorContractError(
      `${direction} tensor shape ${
        JSON.stringify(tensor.shape.map((dimension) => dimension.value))
      } does not match expected [batch, ${expectedWidth}]`,
    );
  }
  if (manifestTensor.shape[1] !== expectedWidth) {
    throw new ArtifactTensorContractError(
      `${direction} manifest width ${
        manifestTensor.shape[1]
      } does not match expected ${expectedWidth}`,
    );
  }
  if (!isBatchDimension(tensor.shape[0]?.value)) {
    throw new ArtifactTensorContractError(
      `${direction} batch dimension ${
        String(tensor.shape[0]?.value)
      } is not dynamic or one`,
    );
  }
}

function validateManifest(
  value: unknown,
  path: string,
): asserts value is ArtifactManifest {
  if (!isRecord(value)) throw new ArtifactManifestError(path, "an object");
  if (value.schemaVersion !== 1) {
    throw new ArtifactManifestError(path, "schemaVersion 1");
  }
  requireString(value, "modelId", path);
  requireString(value, "modelVersion", path);
  requireString(value, "trainingCodeVersion", path);
  requireTensorManifest(value.input, "input", path, INPUT_FEATURES);
  requireTensorManifest(
    value.output,
    "output",
    path,
    OUTPUT_MAPPINGS.map((mapping) => mapping.name),
  );
  const onnx = requireRecord(value.onnx, "onnx", path);
  if (onnx.opset !== MODEL_OPSET || typeof onnx.quantization !== "string") {
    throw new ArtifactManifestError(
      path,
      "onnx opset 17 and quantization method",
    );
  }
  const artifact = requireRecord(value.artifact, "artifact", path);
  requireString(artifact, "path", path);
  requireString(artifact, "sha256", path);
  requireString(artifact, "generatedTimestamp", path);
  if (!/^[a-f0-9]{64}$/.test(String(artifact.sha256))) {
    throw new ArtifactManifestError(
      path,
      "a lowercase 64-character SHA-256 checksum",
    );
  }
  if (artifact.readinessClassification !== "reference-only") {
    throw new ArtifactManifestError(
      path,
      "readinessClassification reference-only",
    );
  }
  const dataset = requireRecord(value.dataset, "dataset", path);
  requireString(dataset, "source", path);
  requireString(dataset, "generationMethod", path);
  requireStringArray(dataset, "schema", path);
  requireStringArray(dataset, "limitations", path);
}

function requireTensorManifest(
  value: unknown,
  field: string,
  path: string,
  expectedNames: readonly string[],
): void {
  const tensor = requireRecord(value, field, path);
  requireString(tensor, "name", path);
  if (tensor.dtype !== "float32") {
    throw new ArtifactManifestError(path, `${field}.dtype float32`);
  }
  if (!Array.isArray(tensor.shape) || tensor.shape.length !== 2) {
    throw new ArtifactManifestError(path, `${field}.shape [batch, width]`);
  }
  if (
    typeof tensor.shape[0] !== "string" || typeof tensor.shape[1] !== "number"
  ) {
    throw new ArtifactManifestError(path, `${field}.shape [string, number]`);
  }
  if (field === "input") {
    if (!arraysEqual(tensor.features, expectedNames)) {
      throw new ArtifactManifestError(
        path,
        "the ordered six-feature input schema",
      );
    }
  } else {
    if (
      !Array.isArray(tensor.values) ||
      tensor.values.length !== expectedNames.length
    ) {
      throw new ArtifactManifestError(path, "the complete four-output mapping");
    }
    for (const [index, expectedName] of expectedNames.entries()) {
      const output = tensor.values[index];
      if (
        !isRecord(output) || output.name !== expectedName ||
        output.index !== index
      ) {
        throw new ArtifactManifestError(
          path,
          `output mapping ${index} named ${expectedName}`,
        );
      }
    }
  }
}

function requireRecord(
  value: unknown,
  field: string,
  path: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ArtifactManifestError(path, `${field} object`);
  }
  return value;
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  path: string,
): void {
  if (typeof record[field] !== "string" || record[field] === "") {
    throw new ArtifactManifestError(path, `${field} non-empty string`);
  }
}

function requireStringArray(
  record: Record<string, unknown>,
  field: string,
  path: string,
): void {
  if (
    !Array.isArray(record[field]) ||
    !record[field].every((item) => typeof item === "string")
  ) {
    throw new ArtifactManifestError(path, `${field} string array`);
  }
}

function arraysEqual(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) && value.length === expected.length &&
    value.every((item, index) => item === expected[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBatchDimension(value: number | string | undefined): boolean {
  return value === 1 || (typeof value === "string" && value.length > 0);
}

function classifyFileError(path: string, error: unknown): PredictionError {
  if (error instanceof Deno.errors.NotFound) {
    return new ArtifactMissingError(path, error);
  }
  return new ArtifactUnreadableError(path, error);
}

type PredictionError = ArtifactMissingError | ArtifactUnreadableError;
