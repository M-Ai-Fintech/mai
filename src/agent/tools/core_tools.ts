import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { VDRIntegration } from "../vdr_mock.ts";
import { MLEngine } from "../../engines/prediction/ml.ts";
import { PDFGenerator } from "../../engines/document-generator/pdf.ts";
import { PortfolioSolver } from "../../engines/optimization/kyc/kyc_valuation_solver.ts";

interface PortfolioToolTarget {
  id: string;
  name: string;
  synergyValue: number;
  acquisitionCost: number;
  kycRiskIndex: number;
  ebitda?: number;
  revenue?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  operatingCashFlow?: number;
  historicalVolatility?: number;
  businessSector?: string;
  taxDebtsAmount?: number;
}

export const verifyRegistryTool = createTool({
  id: "verify-registry-tool",
  description:
    "Verifies the corporate registration status and tax debts of a CNPJ at the Federal Revenue.",
  inputSchema: z.object({
    cnpj: z.string().describe(
      "The target company's CNPJ (digits only or formatted).",
    ),
  }),
  outputSchema: z.unknown(),
  execute: async (input) => {
    const data = await VDRIntegration.queryKYBRegistry(input.cnpj);
    return { success: true, data };
  },
});

export const analyzeCompanyRisksTool = createTool({
  id: "analyze-company-risks-tool",
  description:
    "Analyzes the predictive financial health of a company (insolvency risk, cash flow volatility, and customer churn).",
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
  outputSchema: z.unknown(),
  execute: async (input) => {
    const report = await MLEngine.analyzeProfile(input);
    return { success: true, report };
  },
});

export const optimizePortfolioTool = createTool({
  id: "optimize-portfolio-tool",
  description:
    "Solves the mixed-integer linear programming (MILP) optimization to select the ideal portfolio of M&A acquisitions.",
  inputSchema: z.object({
    targets: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        synergyValue: z.number(),
        acquisitionCost: z.number(),
        kycRiskIndex: z.number(),
        ebitda: z.number().optional(),
        revenue: z.number().optional(),
        totalAssets: z.number().optional(),
        totalLiabilities: z.number().optional(),
        operatingCashFlow: z.number().optional(),
        historicalVolatility: z.number().optional(),
        businessSector: z.string().optional(),
        taxDebtsAmount: z.number().optional(),
      }),
    ),
    budgetLimit: z.number(),
    riskToleranceLimit: z.number(),
    taxDebtCap: z.number().optional(),
    sectorAllocationCaps: z.record(z.string(), z.number()).optional(),
    mutualExclusions: z.array(z.tuple([z.string(), z.string()])).optional(),
  }),
  outputSchema: z.unknown(),
  execute: optimizePortfolio,
});

async function optimizePortfolio(input: {
  targets: PortfolioToolTarget[];
  budgetLimit: number;
  riskToleranceLimit: number;
  taxDebtCap?: number;
  sectorAllocationCaps?: Record<string, number>;
  mutualExclusions?: [string, string][];
}) {
  const result = await PortfolioSolver.evaluateAndOptimize(
    input.targets.map(toSolverTarget),
    portfolioConstraints(input),
  );
  return { success: true, result: portfolioResult(result) };
}

function portfolioConstraints(input: {
  budgetLimit: number;
  riskToleranceLimit: number;
  taxDebtCap?: number;
  sectorAllocationCaps?: Record<string, number>;
  mutualExclusions?: [string, string][];
}) {
  return {
    budgetLimit: input.budgetLimit,
    riskToleranceLimit: input.riskToleranceLimit,
    taxDebtCap: input.taxDebtCap ?? Number.MAX_SAFE_INTEGER,
    sectorAllocationCaps: input.sectorAllocationCaps,
    mutualExclusions: input.mutualExclusions,
  };
}

function portfolioResult(
  result: Awaited<ReturnType<typeof PortfolioSolver.evaluateAndOptimize>>,
) {
  return {
    selectedTargetIds: result.optimization.selectedTargetIds,
    totalCostSpent: result.totalCost,
    totalSynergyAchieved: result.totalSynergy,
    status: result.optimization.status,
    evaluatedProfiles: result.evaluatedProfiles,
  };
}

function toSolverTarget(target: PortfolioToolTarget) {
  return {
    id: target.id,
    name: target.name,
    synergyValue: target.synergyValue,
    acquisitionCost: target.acquisitionCost,
    ebitda: target.ebitda ?? 0,
    revenue: target.revenue ?? 0,
    totalAssets: target.totalAssets ?? 1,
    totalLiabilities: target.totalLiabilities ?? 0,
    operatingCashFlow: target.operatingCashFlow ?? 0,
    historicalVolatility: target.historicalVolatility ?? target.kycRiskIndex,
    businessSector: target.businessSector ?? "General",
    taxDebtsAmount: target.taxDebtsAmount ?? 0,
  };
}

export const optimizeTermSheetTool = createTool({
  id: "optimize-term-sheet-tool",
  description:
    "Executes a bilateral negotiation genetic algorithm to find the best Term Sheet clauses (Equity, Cash, Earn-out, and Escrow).",
  inputSchema: z.object({
    valuationMin: z.number().default(10_000_000),
    valuationMax: z.number().default(50_000_000),
    preferences: z.object({
      cash: z.number().default(0.4),
      equity: z.number().default(0.3),
      earnOut: z.number().default(0.2),
      escrow: z.number().default(0.1),
    }).optional(),
    populationSize: z.number().optional(),
    generations: z.number().optional(),
  }),
  outputSchema: z.unknown(),
  execute: async (input) => {
    const { optimizeDeal } = await import(
      "../../engines/optimization/genetic.ts"
    );
    const result = optimizeDeal({
      valuationMin: input.valuationMin,
      valuationMax: input.valuationMax,
      preferences: input.preferences ??
        { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
    }, {
      populationSize: input.populationSize ?? 100,
      generations: input.generations ?? 50,
    });
    return { success: true, result };
  },
});

export const generatePdfTermSheetTool = createTool({
  id: "generate-pdf-term-sheet-tool",
  description:
    "Generates the final physical PDF document of the Term Sheet and writes it to the file system.",
  inputSchema: z.object({
    filePath: z.string().describe(
      "Destination file path (e.g., ./term_sheets/deal_1.pdf).",
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
  outputSchema: z.unknown(),
  execute: async (input) => {
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
      message: "PDF generated successfully.",
    };
  },
});
