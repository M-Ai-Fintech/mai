import { DatabaseMemoryService } from "../core/db/DatabaseMemoryService.ts";
import { PortfolioSolver } from "../engines/optimization/kyc/index.ts";
import {
  PortfolioResult,
  TargetRawInput,
} from "../engines/optimization/types.ts";
import { t, tList } from "../i18n/index.ts";
import {
  describeCommandError,
  printSectionHeader,
  renderOutputTable,
  TableCell,
} from "./command-output.ts";
import { createCommandProgress } from "./command-progress.ts";

interface PipelineBusinessRow {
  id: string | null;
  name: string;
  sector: string | null;
  valuation: string | number | null;
  cost: string | number | null;
}

const PIPELINE_QUERY = `
  SELECT
    b.id::text as id,
    b.name,
    b.sector,
    b.cnpj,
    t.target_valuation as valuation,
    fs.total_valuation as cost
  FROM business b
  LEFT JOIN transaction_business_role tbr
    ON b.id = tbr.business_id AND tbr.role_name = 'TARGET'
  LEFT JOIN transaction t ON tbr.transaction_id = t.id
  LEFT JOIN financial_structure fs ON t.id = fs.transaction_id
`;

const FALLBACK_TARGETS: TargetRawInput[] = [
  {
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
  },
  {
    id: "T2",
    name: "Beta Logistics LLC",
    synergyValue: 70,
    acquisitionCost: 30,
    ebitda: 2800000,
    revenue: 10000000,
    totalAssets: 12000000,
    totalLiabilities: 7000000,
    operatingCashFlow: 1800000,
    historicalVolatility: 0.10,
    businessSector: "Logistics",
    taxDebtsAmount: 0,
  },
  {
    id: "T3",
    name: "Gama Energia S.A.",
    synergyValue: 95,
    acquisitionCost: 55,
    ebitda: 5000000,
    revenue: 18000000,
    totalAssets: 25000000,
    totalLiabilities: 18000000,
    operatingCashFlow: 4000000,
    historicalVolatility: 0.18,
    businessSector: "Infraestrutura",
    taxDebtsAmount: 0,
  },
  {
    id: "T4",
    name: "Delta Distributor",
    synergyValue: 40,
    acquisitionCost: 15,
    ebitda: 1200000,
    revenue: 5000000,
    totalAssets: 6000000,
    totalLiabilities: 4500000,
    operatingCashFlow: 600000,
    historicalVolatility: 0.22,
    businessSector: "Commerce",
    taxDebtsAmount: 0,
  },
];

/**
 * Selects an acquisition portfolio within the requested budget and risk limit.
 *
 * @example await optimizeAcquisitionPortfolio(90, 0.3);
 */
export async function optimizeAcquisitionPortfolio(
  budget: number,
  riskTolerance: number,
): Promise<void> {
  printSectionHeader(t("cli.headers.optimizePortfolio"));
  const pipelineTargets = await resolvePipelineTargets();
  printPortfolioInputs(pipelineTargets.length, budget, riskTolerance);
  await runPortfolioOptimization(pipelineTargets, budget, riskTolerance);
}

async function runPortfolioOptimization(
  pipelineTargets: TargetRawInput[],
  budget: number,
  riskTolerance: number,
): Promise<void> {
  const progress = createCommandProgress(t("cli.spinners.matching"));
  progress.start();
  try {
    const result = await evaluatePortfolio(
      pipelineTargets,
      budget,
      riskTolerance,
    );
    progress.stop();
    renderPortfolioResult(result, pipelineTargets, budget);
  } catch (error) {
    reportPortfolioError(progress, error);
    throw error;
  }
}

function reportPortfolioError(
  progress: ReturnType<typeof createCommandProgress>,
  error: unknown,
): void {
  progress.stop();
  console.error(t("cli.messages.portfolioError"), describeCommandError(error));
}

async function resolvePipelineTargets(): Promise<TargetRawInput[]> {
  try {
    const database = DatabaseMemoryService.getInstance();
    const rows = await database.executeRawQuery<PipelineBusinessRow>(
      PIPELINE_QUERY,
    );
    if (rows.length === 0) return FALLBACK_TARGETS;
    console.log(t("cli.messages.dbLoaded", { count: rows.length }));
    return rows.map(toPipelineTarget);
  } catch {
    console.warn(t("cli.messages.dbOfflineWarning"));
    return FALLBACK_TARGETS;
  }
}

function toPipelineTarget(
  row: PipelineBusinessRow,
  index: number,
): TargetRawInput {
  return {
    id: row.id || `T${index + 1}`,
    name: row.name,
    synergyValue: calculateSyntheticSynergyScore(row.name, index),
    acquisitionCost: calculateAcquisitionCost(row, index),
    ebitda: 2000000 + index * 500000,
    revenue: 8000000 + index * 2000000,
    totalAssets: 12000000 + index * 3000000,
    totalLiabilities: 7000000 + index * 1500000,
    operatingCashFlow: 1500000 + index * 400000,
    historicalVolatility: 0.10 + (index * 0.04) % 0.30,
    businessSector: row.sector || "Tecnologia",
    taxDebtsAmount: 0,
  };
}

function calculateAcquisitionCost(
  row: PipelineBusinessRow,
  index: number,
): number {
  const sourceValue = row.cost ?? row.valuation;
  return sourceValue ? Number(sourceValue) / 1000000 : 30 + index * 10;
}

/**
 * Supplies a deterministic ranking fixture when the legacy pipeline lacks
 * financial cash-flow inputs; this is not MAI-144 financial synergy pricing.
 */
function calculateSyntheticSynergyScore(name: string, index: number): number {
  return Math.min(99, Math.max(30, name.length * 3 + 20 + (index * 5) % 30));
}

function printPortfolioInputs(
  targetCount: number,
  budget: number,
  riskTolerance: number,
): void {
  console.log(t("cli.messages.pipelineInput", { count: targetCount }));
  console.log(t("cli.messages.budgetTolerance", {
    budget,
    tolerance: (riskTolerance * 100).toFixed(0),
  }));
}

function evaluatePortfolio(
  targets: TargetRawInput[],
  budget: number,
  riskTolerance: number,
): Promise<PortfolioResult> {
  return PortfolioSolver.evaluateAndOptimize(targets, {
    budgetLimit: budget,
    riskToleranceLimit: riskTolerance,
    taxDebtCap: 999999999,
    mutualExclusions: [["T1", "T4"]],
  });
}

function renderPortfolioResult(
  result: PortfolioResult,
  targets: TargetRawInput[],
  budget: number,
): void {
  printPortfolioTotals(result, budget);
  if (result.optimization.selectedTargetIds.length === 0) {
    console.log(t("cli.messages.noCompaniesMetCriteria"));
    return;
  }
  renderOutputTable(
    [...tList("cli.tables.portfolioHeader")],
    selectedPortfolioRows(result, targets),
  );
}

function printPortfolioTotals(result: PortfolioResult, budget: number): void {
  console.log(t("cli.messages.solverSolution", {
    status: result.optimization.status.toUpperCase(),
  }));
  console.log(t("cli.messages.totalSynergy", { synergy: result.totalSynergy }));
  console.log(t("cli.messages.allocatedBudget", {
    cost: result.totalCost,
    budget,
  }));
  console.log(t("cli.messages.recommendedCompanies"));
}

function selectedPortfolioRows(
  result: PortfolioResult,
  targets: TargetRawInput[],
): TableCell[][] {
  return result.optimization.selectedTargetIds.map((targetId) => {
    const target = targets.find((candidate) => candidate.id === targetId);
    if (!target) {
      throw new Error(
        `Selected target "${targetId}" was absent from the expected pipeline target list.`,
      );
    }
    return selectedTargetRow(target, result);
  });
}

function selectedTargetRow(
  target: TargetRawInput,
  result: PortfolioResult,
): TableCell[] {
  const risk = result.evaluatedProfiles[target.id].metrics.insolvencyRisk;
  const minimumValue = (target.acquisitionCost * 0.9).toFixed(1);
  const maximumValue = (target.acquisitionCost * 1.15).toFixed(1);
  return [
    target.id,
    target.name,
    t("cli.messages.portfolioRange", {
      min: minimumValue,
      max: maximumValue,
    }),
    `$${target.acquisitionCost}M`,
    `${(risk * 100).toFixed(1)}%`,
  ];
}
