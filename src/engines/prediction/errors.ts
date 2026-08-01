export type PredictionErrorCode =
  | "ARTIFACT_MISSING"
  | "ARTIFACT_UNREADABLE"
  | "ARTIFACT_CORRUPT"
  | "ARTIFACT_MANIFEST_INVALID"
  | "ARTIFACT_TENSOR_CONTRACT_INVALID"
  | "ARTIFACT_LOAD_FAILED"
  | "PREDICTION_INPUT_INVALID"
  | "PREDICTION_NOT_INITIALIZED"
  | "PREDICTION_INFERENCE_FAILED";

export class PredictionError extends Error {
  public readonly code: PredictionErrorCode;

  public constructor(
    code: PredictionErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "PredictionError";
    this.code = code;
  }
}

export class ArtifactMissingError extends PredictionError {
  public constructor(path: string, cause?: unknown) {
    super(
      "ARTIFACT_MISSING",
      `ONNX artifact or manifest "${path}" is missing; expected a checked-in reference artifact.`,
      cause,
    );
    this.name = "ArtifactMissingError";
  }
}

export class ArtifactUnreadableError extends PredictionError {
  public constructor(path: string, cause?: unknown) {
    super(
      "ARTIFACT_UNREADABLE",
      `ONNX artifact or manifest "${path}" is unreadable; expected a readable file.`,
      cause,
    );
    this.name = "ArtifactUnreadableError";
  }
}

export class ArtifactCorruptError extends PredictionError {
  public constructor(path: string, expected: string, actual: string) {
    super(
      "ARTIFACT_CORRUPT",
      `ONNX artifact "${path}" checksum "${actual}" does not match expected "${expected}".`,
    );
    this.name = "ArtifactCorruptError";
  }
}

export class ArtifactManifestError extends PredictionError {
  public constructor(path: string, detail: string, cause?: unknown) {
    super(
      "ARTIFACT_MANIFEST_INVALID",
      `ONNX manifest "${path}" is invalid; expected the MAI-142 manifest contract: ${detail}.`,
      cause,
    );
    this.name = "ArtifactManifestError";
  }
}

export class ArtifactTensorContractError extends PredictionError {
  public constructor(detail: string) {
    super(
      "ARTIFACT_TENSOR_CONTRACT_INVALID",
      `ONNX tensor contract is incompatible; expected the six-input/four-output reference contract: ${detail}.`,
    );
    this.name = "ArtifactTensorContractError";
  }
}

export class ArtifactLoadError extends PredictionError {
  public constructor(path: string, cause?: unknown) {
    super(
      "ARTIFACT_LOAD_FAILED",
      `ONNX artifact "${path}" could not be initialized by the Deno/WASM runtime; expected a valid supported ONNX file.`,
      cause,
    );
    this.name = "ArtifactLoadError";
  }
}

export class PredictionInputError extends PredictionError {
  public constructor(value: unknown, detail: string) {
    super(
      "PREDICTION_INPUT_INVALID",
      `Prediction input ${
        describeValue(value)
      } is invalid; expected Float32Array shape [1, 6] with six finite ordered features: ${detail}.`,
    );
    this.name = "PredictionInputError";
  }
}

export class PredictionNotInitializedError extends PredictionError {
  public constructor() {
    super(
      "PREDICTION_NOT_INITIALIZED",
      "Prediction inference was requested before model initialization; expected loadOnnxModel() or PredictionEngine.initialize().",
    );
    this.name = "PredictionNotInitializedError";
  }
}

export class PredictionInferenceError extends PredictionError {
  public constructor(detail: string, cause?: unknown) {
    super(
      "PREDICTION_INFERENCE_FAILED",
      `ONNX inference failed with "${detail}"; expected a valid initialized session and six-feature tensor.`,
      cause,
    );
    this.name = "PredictionInferenceError";
  }
}

function describeValue(value: unknown): string {
  if (value instanceof Float32Array) {
    return `Float32Array(length=${value.length})`;
  }
  if (value === null) return "null";
  return typeof value;
}
