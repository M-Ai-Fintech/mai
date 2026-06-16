// src/engines/optimization/KYC_Valuations.ts
import { MLEngine, CompanyFinancialProfile } from "../prediction/ML.ts";
import { MILPOptimizer, MATarget, MILPConfig, MILPResult } from "./MILP.ts";

export interface TargetRawInput {
  id: string;
  name: string;
  synergyValue: number;
  acquisitionCost: number;
  ebitda: number;
  revenue: number;
  totalAssets: number;
  totalLiabilities: number;
  operatingCashFlow: number;
  historicalVolatility: number;
  businessSector: string;
}

export interface IntegratedOptimizationResult {
  optimization: MILPResult;
  evaluatedProfiles: Record<string, any>;
  totalSynergy: number;
  totalCost: number;
  timestamp: string;
}

export class KYCValuationsCoordinator {
  /**
   * Evaluates targets' risks via MLEngine first, then optimizes the portfolio using MILP.
   */
  public static async evaluateAndOptimize(
    rawTargets: TargetRawInput[],
    config: MILPConfig
  ): Promise<IntegratedOptimizationResult> {
    const evaluatedProfiles: Record<string, any> = {};
    const optimizedTargets: MATarget[] = [];

    // 1. Run predictive analysis (ONNX model) on each target to determine its real risk profile
    for (const raw of rawTargets) {
      const profile: CompanyFinancialProfile = {
        name: raw.name,
        ebitda: raw.ebitda,
        revenue: raw.revenue,
        totalAssets: raw.totalAssets,
        totalLiabilities: raw.totalLiabilities,
        operatingCashFlow: raw.operatingCashFlow,
        historicalVolatility: raw.historicalVolatility,
        businessSector: raw.businessSector,
      };

      const analysis = await MLEngine.analyzeProfile(profile);
      evaluatedProfiles[raw.id] = analysis;

      // Map the analysis output to the MILP target interface
      // Using the predicted insolvency risk as the KYC risk index
      optimizedTargets.push({
        id: raw.id,
        name: raw.name,
        synergyValue: raw.synergyValue,
        acquisitionCost: raw.acquisitionCost,
        kycRiskIndex: analysis.metrics.insolvencyRisk,
      });
    }

    // 2. Solve the MILP portfolio optimization problem
    const optResult = await MILPOptimizer.optimizePortfolio(optimizedTargets, config);

    return {
      optimization: optResult,
      evaluatedProfiles,
      totalSynergy: optResult.totalSynergy,
      totalCost: optResult.totalCostSpent,
      timestamp: new Date().toISOString(),
    };
  }
}
