import {
  createFallbackPrediction,
  DEFAULT_MODEL_PATH,
  loadOnnxModel,
  onnxInfer,
} from "./onnx.ts";
import { PredictionError, PredictionNotInitializedError } from "./errors.ts";
import type {
  OnnxInput,
  ONNXModelInput,
  OnnxOutput,
  ONNXPredictionResult,
} from "./onnx.ts";

export class PredictionEngine {
  private initialized = false;

  async initialize(modelPath: string = DEFAULT_MODEL_PATH): Promise<void> {
    if (!this.initialized) {
      await loadOnnxModel(modelPath);
      this.initialized = true;
    }
  }

  async predict(input: OnnxInput): Promise<OnnxOutput> {
    if (!this.initialized) {
      throw new PredictionNotInitializedError();
    }
    return await onnxInfer(input);
  }

  async predictWithFallback(input: OnnxInput): Promise<OnnxOutput> {
    try {
      return await this.predict(input);
    } catch (error: unknown) {
      const reason = error instanceof PredictionError
        ? error.code
        : "UNKNOWN_FAILURE";
      return createFallbackPrediction(input, reason);
    }
  }
}

export {
  DEFAULT_MODEL_PATH,
  loadOnnxModel,
  onnxInfer,
  type OnnxInput,
  type ONNXModelInput,
  type OnnxOutput,
  type ONNXPredictionResult,
};
