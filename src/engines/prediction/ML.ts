// src/engines/prediction/ML.ts
import { ONNXEngine, ONNXModelInput, ONNXPredictionResult } from "./ONNX.ts";
import { TransformersEngine } from "./Transformers.ts";

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
    profile: CompanyFinancialProfile
  ): Promise<MLPredictionReport> {
    // 1. Generate text embeddings for the sector/company description
    const sectorContext = `Company ${profile.name} operating in the ${profile.businessSector} sector. EBITDA: ${profile.ebitda}, Revenue: ${profile.revenue}.`;
    let embeddingsGenerated = false;
    try {
      const embedding = await TransformersEngine.generateEmbedding(sectorContext);
      embeddingsGenerated = embedding && embedding.length > 0;
    } catch (err) {
      console.warn("Failed to generate Transformers embeddings, continuing without them:", err);
    }

    // 2. Map profile to ONNX inputs
    const modelInput: ONNXModelInput = {
      ebitda: profile.ebitda,
      revenue: profile.revenue,
      totalAssets: profile.totalAssets,
      totalLiabilities: profile.totalLiabilities,
      operatingCashFlow: profile.operatingCashFlow,
      historicalVolatility: profile.historicalVolatility,
    };

    // 3. Execute the ONNX model (Altman Z-Score neural simulation)
    const metrics = await ONNXEngine.runModelInference(modelInput);

    // 4. Derive labels based on risk scores
    let dcfRiskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (metrics.insolvencyRisk > 0.8) {
      dcfRiskLabel = "CRITICAL";
    } else if (metrics.insolvencyRisk > 0.5) {
      dcfRiskLabel = "HIGH";
    } else if (metrics.insolvencyRisk > 0.25) {
      dcfRiskLabel = "MEDIUM";
    }

    return {
      companyName: profile.name,
      metrics,
      embeddingsGenerated,
      dcfRiskLabel,
      timestamp: new Date().toISOString(),
    };
  }
}
