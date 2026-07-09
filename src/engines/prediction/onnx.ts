
import { env, Tensor } from 'npm:@huggingface/transformers';

export interface ONNXModelInput {
  ebitda: number;
  revenue: number;
  totalAssets: number;
  totalLiabilities: number;
  operatingCashFlow: number;
  historicalVolatility: number;
}

export interface ONNXPredictionResult {
  insolvencyRisk: number; // 0 to 1
  churnProbability: number; // 0 to 1
  dcfVolatility: number; // percentage
  industry4Score: number; // general fitness score
}

export class ONNXEngine {
  private static session: any = null;

  private static async getSession(modelPath: string) {
    if (this.session) return this.session;
    try {
      const ortDirect = await import('npm:onnxruntime-web');
      if (ortDirect && ortDirect.InferenceSession) {
         this.session = await ortDirect.InferenceSession.create(modelPath);
         return this.session;
      }
      throw new Error('InferenceSession not found');
    } catch (e: any) {
      console.warn('ONNXEngine - Failed to load ONNX model:', e.message);
      return null;
    }
  }

  public static async runModelInference(
    input: ONNXModelInput,
    modelPath = 'models/ma_classifier_q8.onnx'
  ): Promise<ONNXPredictionResult> {
    const session = await this.getSession(modelPath);

    if (!session) {
      return this.simulateInference(input);
    }

    try {
      const { Tensor } = await import('npm:onnxruntime-web');
      const tensor = new Tensor('float32', [
        input.ebitda,
        input.revenue,
        input.totalAssets,
        input.totalLiabilities,
        input.operatingCashFlow,
        input.historicalVolatility
      ], [1, 6]);

      const results = await session.run({ financials: tensor });
      const outputTensor = results.predictions;
      const data = outputTensor.data;

      return {
        insolvencyRisk: parseFloat(data[0].toFixed(4)),
        churnProbability: parseFloat(data[1].toFixed(4)),
        dcfVolatility: parseFloat((data[2] * 100).toFixed(2)),
        industry4Score: parseFloat((data[3] * 100).toFixed(2)),
      };
    } catch (e: any) {
      console.warn('ONNXEngine - Inference failed, using fallback:', e.message);
      return this.simulateInference(input);
    }
  }

  private static simulateInference(input: ONNXModelInput): ONNXPredictionResult {
    const totalAssets = input.totalAssets || 1;
    const workingCapital = input.revenue * 0.15;
    const retainedEarnings = input.ebitda * 2;
    const x1 = workingCapital / totalAssets;
    const x2 = retainedEarnings / totalAssets;
    const x3 = input.ebitda / totalAssets;
    const x4 = input.revenue / totalAssets;
    const zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4;
    const insolvencyRisk = 1 / (1 + Math.exp(zScore - 2));
    const leverage = input.totalLiabilities / totalAssets;
    const churnBase = leverage * 0.4 + (input.operatingCashFlow < 0 ? 0.3 : 0.0) + (input.historicalVolatility * 0.5);
    const churnProbability = Math.min(Math.max(churnBase, 0.02), 0.98);
    const dcfVolatility = Math.min(Math.max(input.historicalVolatility * 1.2 + (leverage * 5), 2), 65);
    const industry4Score = Math.max(10, Math.min(100, 100 - (insolvencyRisk * 50) - (churnProbability * 30)));

    return {
      insolvencyRisk: parseFloat(insolvencyRisk.toFixed(4)),
      churnProbability: parseFloat(churnProbability.toFixed(4)),
      dcfVolatility: parseFloat(dcfVolatility.toFixed(2)),
      industry4Score: parseFloat(industry4Score.toFixed(2)),
    };
  }
}
