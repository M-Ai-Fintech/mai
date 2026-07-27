// src/engines/prediction/ml.ts
import { ONNXEngine, ONNXModelInput, ONNXPredictionResult } from "./onnx.ts";
import { TransformersEngine } from "./transformers.ts";

export interface CompanyFinancialProfile {
  name: string;
  ebitda: number;
  revenue: number;
  totalAssets: number;
  totalLiabilities: number;
  operatingCashFlow: number;
  historicalVolatility: number;
  businessSector: string;
}

export interface MLPredictionReport {
  companyName: string;
  metrics: ONNXPredictionResult;
  embeddingsGenerated: boolean;
  dcfRiskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
}

export class MLEngine {
  /**
   * Evaluates a company's financial profile by running the ML pipeline.
   * This includes generating text embeddings for context analysis and running the ONNX neural network.
   */
  public static async analyzeProfile(
    profile: CompanyFinancialProfile,
  ): Promise<MLPredictionReport> {
    const embeddingsGenerated = await generateProfileEmbedding(profile);
    const metrics = await ONNXEngine.runModelInference(modelInput(profile));
    return {
      companyName: profile.name,
      metrics,
      embeddingsGenerated,
      dcfRiskLabel: riskLabel(metrics.insolvencyRisk),
      timestamp: new Date().toISOString(),
    };
  }
}

async function generateProfileEmbedding(
  profile: CompanyFinancialProfile,
): Promise<boolean> {
  const context =
    `Company ${profile.name} operating in the ${profile.businessSector} sector. EBITDA: ${profile.ebitda}, Revenue: ${profile.revenue}.`;
  try {
    const embedding = await TransformersEngine.generateEmbedding(context);
    return embedding.length > 0;
  } catch (error: unknown) {
    console.warn(
      "Failed to generate Transformers embeddings, continuing without them:",
      error,
    );
    return false;
  }
}

function modelInput(profile: CompanyFinancialProfile): ONNXModelInput {
  return {
    ebitda: profile.ebitda,
    revenue: profile.revenue,
    totalAssets: profile.totalAssets,
    totalLiabilities: profile.totalLiabilities,
    operatingCashFlow: profile.operatingCashFlow,
    historicalVolatility: profile.historicalVolatility,
  };
}

function riskLabel(
  risk: number,
): MLPredictionReport["dcfRiskLabel"] {
  if (risk > 0.8) return "CRITICAL";
  if (risk > 0.5) return "HIGH";
  if (risk > 0.25) return "MEDIUM";
  return "LOW";
}
