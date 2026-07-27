import {
  loadOnnxModel,
  onnxInfer,
  OnnxInput,
  OnnxOutput,
  ZScoreLabel,
} from "./onnx.ts";

export class PredictionEngine {
  private initialized = false;

  async initialize(modelPath: string = "models/ma_classifier_q8.onnx") {
    if (!this.initialized) {
      await loadOnnxModel(modelPath);
      this.initialized = true;
    }
  }

  async predict(input: OnnxInput): Promise<OnnxOutput> {
    if (!this.initialized) {
      throw new Error("PredictionEngine not initialized");
    }
    return await onnxInfer(input);
  }
}

export {
  loadOnnxModel,
  onnxInfer,
  type OnnxInput,
  type OnnxOutput,
  ZScoreLabel,
};
