import { CompanyFinancialProfile, MLEngine } from "../engines/prediction/ml.ts";
import { ClientSiloedRAG } from "../agent/rag_layer.ts";
import { t, tList } from "../i18n/index.ts";
import {
  describeCommandError,
  printSectionHeader,
  renderOutputTable,
} from "./command-output.ts";
import { createCommandProgress } from "./command-progress.ts";

export interface FinancialRiskOptions {
  name: string;
  ebitda: number;
  revenue: number;
  assets: number;
  liabilities: number;
  cashflow: number;
  volatility: number;
  sector: string;
}

type FinancialRiskReport = Awaited<ReturnType<typeof MLEngine.analyzeProfile>>;

/**
 * Runs financial-risk analysis and prints the related VDR evidence.
 *
 * @example await analyzeFinancialRisk({ name: "Target", ebitda: 1, revenue: 2, assets: 3, liabilities: 1, cashflow: 1, volatility: 0.1, sector: "Tech" });
 */
export async function analyzeFinancialRisk(
  options: FinancialRiskOptions,
): Promise<void> {
  printSectionHeader(t("cli.headers.analyzeRisk", { name: options.name }));
  const progress = createCommandProgress(t("cli.spinners.risk"));
  progress.start();
  try {
    const report = await MLEngine.analyzeProfile(toFinancialProfile(options));
    progress.stop();
    renderRiskReport(report);
    await printLegalDueDiligence();
  } catch (error) {
    progress.stop();
    console.error(t("cli.messages.riskError"), describeCommandError(error));
    throw error;
  }
}

function toFinancialProfile(
  options: FinancialRiskOptions,
): CompanyFinancialProfile {
  return {
    name: options.name,
    ebitda: options.ebitda,
    revenue: options.revenue,
    totalAssets: options.assets,
    totalLiabilities: options.liabilities,
    operatingCashFlow: options.cashflow,
    historicalVolatility: options.volatility,
    businessSector: options.sector,
  };
}

function renderRiskReport(report: FinancialRiskReport): void {
  console.log(
    t("cli.messages.riskClassification", { label: report.dcfRiskLabel }),
  );
  const embeddingStatus = report.embeddingsGenerated
    ? t("cli.messages.activated")
    : t("cli.messages.deactivated");
  console.log(t("cli.messages.embeddingStatus", { status: embeddingStatus }));
  console.log(t("cli.messages.calculatedRiskMetrics"));
  renderRiskMetrics(report);
}

function renderRiskMetrics(report: FinancialRiskReport): void {
  renderOutputTable([...tList("cli.tables.riskHeader")], [
    [
      t("cli.tables.riskFields.insolvency"),
      `${(report.metrics.insolvencyRisk * 100).toFixed(2)}%`,
    ],
    [t("cli.tables.riskFields.zScore"), report.metrics.zScore],
  ]);
}

async function printLegalDueDiligence(): Promise<void> {
  console.log(t("cli.messages.legalDueDiligence"));
  const dealId = "deal_alpha";
  await ClientSiloedRAG.initializeSilo(dealId, `./vdr_rooms/${dealId}`);
  const clauses = await ClientSiloedRAG.querySilo(
    dealId,
    "Change of Control",
    2,
  );
  console.log(t("cli.messages.ragScanComplete"));
  if (clauses.length === 0) {
    console.log(t("cli.messages.noCriticalClauses"));
    return;
  }
  clauses.forEach(printClauseSnippet);
}

function printClauseSnippet(
  clause: Awaited<ReturnType<typeof ClientSiloedRAG.querySilo>>[number],
): void {
  console.log(t("cli.messages.docSnippet", {
    doc: clause.document,
    text: clause.text.substring(0, 110),
    score: (clause.score * 100).toFixed(1),
  }));
}
