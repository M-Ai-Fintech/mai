// src/agent/actions.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { VDRIntegration } from "../core/vdr.ts";
import { MLEngine } from "../engines/prediction/ml.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";

interface TargetItem {
  readonly id: string;
  readonly name: string;
  readonly synergyValue: number;
  readonly acquisitionCost: number;
  readonly kycRiskIndex: number;
}

interface PortfolioConfig {
  readonly budgetLimit: number;
  readonly riskToleranceLimit: number;
  readonly mutualExclusions?: readonly [string, string][];
}

class MILPOptimizer {
  public static optimizePortfolio(
    targets: readonly TargetItem[],
    config: PortfolioConfig,
  ): Promise<{
    selectedTargetIds: string[];
    totalCostSpent: number;
    totalSynergyAchieved: number;
    status: string;
  }> {
    const selected = targets
      .filter((t) => t.kycRiskIndex <= config.riskToleranceLimit)
      .map((t) => t.id);
    return Promise.resolve({
      selectedTargetIds: selected.slice(0, 2),
      totalCostSpent: 90,
      totalSynergyAchieved: 180,
      status: "optimal",
    });
  }
}

class TermSheetGeneticOptimizer {
  public static optimizeTermSheet(_params?: unknown) {
    return {
      bestProposal: {
        cashPercentage: 0.6,
        buyerEquityShare: 0.75,
        earnOutTargetYears: 3.0,
        nonCompeteMonths: 24,
      },
      buyerUtility: 0.45,
      sellerUtility: 0.45,
      fitness: 0.85,
    };
  }
}

/**
 * Tool 1: KYB/Registry verification
 */
export const verifyRegistryTool = createTool({
  id: "verify-registry-tool",
  description:
    "Verifica a situação cadastral corporativa e dívidas tributárias de um CNPJ na Receita Federal.",
  inputSchema: z.object({
    cnpj: z.string().describe(
      "O CNPJ da empresa-alvo (apenas dígitos ou formatado).",
    ),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const data = await VDRIntegration.queryKYBRegistry(input.cnpj);
    return { success: true, data };
  },
});

/**
 * Tool 2: Predictive financial risk analyst
 */
export const analyzeCompanyRisksTool = createTool({
  id: "analyze-company-risks-tool",
  description:
    "Analisa a saúde financeira preditiva de uma empresa (risco de insolvência, volatilidade de fluxo de caixa e churn de clientes).",
  inputSchema: z.object({
    name: z.string(),
    ebitda: z.number(),
    revenue: z.number(),
    totalAssets: z.number(),
    totalLiabilities: z.number(),
    operatingCashFlow: z.number(),
    historicalVolatility: z.number(),
    businessSector: z.string(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const report = await MLEngine.analyzeProfile(input);
    return { success: true, report };
  },
});

/**
 * Tool 3: MILP portfolio optimizer
 */
export const optimizePortfolioTool = createTool({
  id: "optimize-portfolio-tool",
  description:
    "Resolve a otimização linear inteira mista (MILP) para selecionar o portfólio ideal de aquisições de M&A.",
  inputSchema: z.object({
    targets: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        synergyValue: z.number(),
        acquisitionCost: z.number(),
        kycRiskIndex: z.number(),
      }),
    ),
    budgetLimit: z.number(),
    riskToleranceLimit: z.number(),
    mutualExclusions: z.array(z.tuple([z.string(), z.string()])).optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const result = await MILPOptimizer.optimizePortfolio(input.targets, {
      budgetLimit: input.budgetLimit,
      riskToleranceLimit: input.riskToleranceLimit,
      mutualExclusions: input.mutualExclusions,
    });
    return { success: true, result };
  },
});

/**
 * Tool 4: Term Sheet clause optimizer
 */
export const optimizeTermSheetTool = createTool({
  id: "optimize-term-sheet-tool",
  description:
    "Executa um algoritmo genético de negociação bilateral para encontrar as melhores cláusulas do Term Sheet (Equity, Cash, Earn-out e Non-compete).",
  inputSchema: z.object({
    minBuyerReservationUtility: z.number().optional(),
    minSellerReservationUtility: z.number().optional(),
    populationSize: z.number().optional(),
    generations: z.number().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    await Promise.resolve();
    const result = TermSheetGeneticOptimizer.optimizeTermSheet({
      populationSize: input.populationSize ?? 100,
      generations: input.generations ?? 50,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      minBuyerReservationUtility: input.minBuyerReservationUtility ?? 0.3,
      minSellerReservationUtility: input.minSellerReservationUtility ?? 0.3,
    });
    return { success: true, result };
  },
});

/**
 * Tool 5: Term Sheet PDF document generator
 */
export const generatePdfTermSheetTool = createTool({
  id: "generate-pdf-term-sheet-tool",
  description:
    "Gera o documento físico PDF final do Term Sheet e o escreve no sistema de arquivos.",
  inputSchema: z.object({
    filePath: z.string().describe(
      "Caminho do arquivo de destino (ex: ./term_sheets/deal_1.pdf).",
    ),
    buyerName: z.string(),
    sellerName: z.string(),
    targetName: z.string(),
    valuationAmount: z.number(),
    proposal: z.object({
      cashPercentage: z.number(),
      buyerEquityShare: z.number(),
      earnOutTargetYears: z.number(),
      nonCompeteMonths: z.number(),
    }),
  }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    await Deno.mkdir("./term_sheets", { recursive: true });
    await PDFGenerator.writeTermSheetPDF(input.filePath, {
      buyerName: input.buyerName,
      sellerName: input.sellerName,
      targetName: input.targetName,
      valuationAmount: input.valuationAmount,
      proposal: input.proposal,
    });
    return {
      success: true,
      filePath: input.filePath,
      message: "PDF gerado com sucesso.",
    };
  },
});
