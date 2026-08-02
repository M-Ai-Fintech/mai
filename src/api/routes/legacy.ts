import { z } from "zod";
import { verifyRegistryTool } from "../../agent/actions.ts";
import { DealRepository } from "../../core/db/DealRepository.ts";
import { PDFGenerator } from "../../engines/document-generator/pdf.ts";
import { PortfolioSolver } from "../../engines/optimization/kyc/index.ts";
import { optimizeLegacyNegotiation } from "../../engines/optimization/negotiation/compatibility.ts";
import {
  CompanyFinancialProfile,
  MLEngine,
} from "../../engines/prediction/ml.ts";

const predictionInput = z.object({
  name: z.string(),
  sector: z.string(),
  ebitda: z.number(),
  revenue: z.number(),
  assets: z.number(),
  liabilities: z.number(),
  cashflow: z.number(),
  volatility: z.number(),
});

const portfolioInput = z.object({
  budget: z.number(),
  riskTolerance: z.number(),
});

const negotiationInput = z.object({
  valuationMin: z.number().optional(),
  valuationMax: z.number().optional(),
  preferences: z.object({
    cash: z.number(),
    equity: z.number(),
    earnOut: z.number(),
    escrow: z.number(),
  }).optional(),
  kyc: z.object({
    kycBlocked: z.boolean(),
    sanctionMatch: z.boolean(),
    pepExposure: z.boolean(),
  }).optional(),
  financial: z.object({
    ebitda: z.number(),
    debt: z.number(),
    interestExpense: z.number(),
  }).optional(),
  maxLeverage: z.number().optional(),
  minCoverage: z.number().optional(),
  geneticConfig: z.object({
    populationSize: z.number(),
    generations: z.number(),
    seed: z.number().int().min(0).max(4294967295).optional(),
  }).optional(),
});

const documentInput = z.object({
  output: z.string().optional(),
  buyer: z.string(),
  seller: z.string(),
  target: z.string(),
  valuation: z.number(),
});

type LegacyRoute = (
  request: Request,
  repository: DealRepository,
  headers: Headers,
) => Promise<Response>;

const legacyRoutes: Record<string, LegacyRoute> = {
  "/api/kyb": handleKyb,
  "/api/predict": handlePrediction,
  "/api/portfolio": handlePortfolio,
  "/api/negotiate": handleNegotiation,
  "/api/document": handleDocument,
};

export async function handleLegacyRoute(
  request: Request,
  repository: DealRepository,
  headers: Headers,
): Promise<Response | null> {
  if (request.method !== "POST") return null;
  const route = legacyRoutes[new URL(request.url).pathname];
  return route ? await route(request, repository, headers) : null;
}

async function handleKyb(
  request: Request,
  _repository: DealRepository,
  headers: Headers,
): Promise<Response> {
  const { cnpj } = z.object({ cnpj: z.string() }).parse(await request.json());
  const result = await verifyRegistryTool.execute!(
    { cnpj },
    {} as Parameters<NonNullable<typeof verifyRegistryTool.execute>>[1],
  );
  return jsonResponse(result.data, headers);
}

async function handlePrediction(
  request: Request,
  repository: DealRepository,
  headers: Headers,
): Promise<Response> {
  const input = predictionInput.parse(await request.json());
  const profile: CompanyFinancialProfile = {
    name: input.name,
    businessSector: input.sector,
    ebitda: input.ebitda,
    revenue: input.revenue,
    totalAssets: input.assets,
    totalLiabilities: input.liabilities,
    operatingCashFlow: input.cashflow,
    historicalVolatility: input.volatility,
  };
  const report = await MLEngine.analyzeProfile(profile);
  await persistKnowledge(repository, "Prediction", { profile, report });
  return jsonResponse(report, headers);
}

async function handlePortfolio(
  request: Request,
  repository: DealRepository,
  headers: Headers,
): Promise<Response> {
  const input = portfolioInput.parse(await request.json());
  const targets = fallbackPortfolioTargets();
  const result = await PortfolioSolver.evaluateAndOptimize(targets, {
    budgetLimit: input.budget,
    riskToleranceLimit: input.riskTolerance,
    taxDebtCap: 999999999,
    mutualExclusions: [],
  });
  await persistKnowledge(repository, "PortfolioOptimization", {
    input: { ...input, targets },
    result,
  });
  return jsonResponse(result, headers);
}

function fallbackPortfolioTargets(): Parameters<
  typeof PortfolioSolver.evaluateAndOptimize
>[0] {
  return [{
    id: "T1",
    name: "Alpha Tech S.A.",
    synergyValue: 85,
    acquisitionCost: 40,
    ebitda: 3500000,
    revenue: 12000000,
    totalAssets: 15000000,
    totalLiabilities: 8000000,
    operatingCashFlow: 2500000,
    historicalVolatility: 0.14,
    businessSector: "Tecnologia",
    taxDebtsAmount: 0,
  }];
}

async function handleNegotiation(
  request: Request,
  _repository: DealRepository,
  headers: Headers,
): Promise<Response> {
  const input = negotiationInput.parse(await optionalJson(request));
  const result = optimizeLegacyNegotiation(negotiationOptions(input));
  return result.status === "delegated"
    ? jsonResponse(result.alternatives, headers)
    : jsonResponse({
      status: result.status,
      alternatives: result.alternatives,
      violations: result.violations,
      compatibility: result.compatibility,
      error: result.error,
    }, headers);
}

function negotiationOptions(
  input: z.infer<typeof negotiationInput>,
): Parameters<typeof optimizeLegacyNegotiation>[0] {
  const defaults: string[] = [];
  if (input.valuationMin === undefined) {
    defaults.push("valuationMin=80 compatibility default");
  }
  if (input.valuationMax === undefined) {
    defaults.push("valuationMax=120 compatibility default");
  }
  if (input.preferences === undefined) {
    defaults.push("balanced preferences compatibility default");
  }
  if (input.kyc === undefined) {
    defaults.push("clean KYC flags compatibility default");
  }
  if (input.geneticConfig === undefined) {
    defaults.push(
      "populationSize=100 and generations=40 compatibility defaults",
    );
  }
  return {
    profile: negotiationProfile(input),
    kyc: input.kyc ??
      { kycBlocked: false, sanctionMatch: false, pepExposure: false },
    financial: input.financial,
    maxLeverage: input.maxLeverage,
    minCoverage: input.minCoverage,
    geneticConfig: input.geneticConfig,
    compatibilityDefaults: defaults,
    enforceFinancialConstraints: true,
  };
}

function negotiationProfile(input: z.infer<typeof negotiationInput>) {
  return {
    valuationMin: input.valuationMin ?? 80,
    valuationMax: input.valuationMax ?? 120,
    preferences: input.preferences ??
      { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
  };
}

async function handleDocument(
  request: Request,
  _repository: DealRepository,
  headers: Headers,
): Promise<Response> {
  const input = documentInput.parse(await request.json());
  const output = input.output ?? "./term_sheets/api_output.pdf";
  await PDFGenerator.writeTermSheetPDF(output, termSheetInput(input));
  return jsonResponse({ status: "success", file: output }, headers);
}

function termSheetInput(input: z.infer<typeof documentInput>) {
  return {
    buyerName: input.buyer,
    sellerName: input.seller,
    targetName: input.target,
    valuationAmount: input.valuation,
    proposal: {
      cashPercentage: 0.6,
      buyerEquityShare: 0.8,
      earnOutTargetYears: 2,
      nonCompeteMonths: 24,
    },
  };
}

async function persistKnowledge(
  repository: DealRepository,
  category: string,
  knowledge: Record<string, unknown>,
): Promise<void> {
  try {
    await repository.saveDomainKnowledge(category, knowledge);
  } catch (error: unknown) {
    console.error(
      `Failed to persist "${category}" knowledge; expected database availability:`,
      error,
    );
  }
}

async function optionalJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function jsonResponse(body: unknown, headers: Headers): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  return Response.json(body, { headers: responseHeaders });
}
