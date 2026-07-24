import { CompanyFinancialProfile, MLEngine } from "../engines/prediction/ml.ts";
import { LaTeXGenerator } from "../engines/document-generator/latex.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { verifyRegistryTool } from "../agent/actions.ts";
import { Table } from "@cliffy/table";
import { Spinner } from "https://deno.land/std@0.224.0/cli/spinner.ts";
import { DatabaseMemoryService } from "../core/db/DatabaseMemoryService.ts";
import { TermSheetOptimizer } from "../engines/optimization/matching/index.ts";
import { PortfolioSolver } from "../engines/optimization/kyc/index.ts";
import { TargetRawInput } from "../engines/optimization/types.ts";
import {
  CoverageConstraint,
  KycConstraint,
  LeverageConstraint,
  optimizeWithConstraints,
} from "../engines/optimization/index.ts";
import { ClientSiloedRAG } from "../agent/rag_layer.ts";
import { AgentOrchestrator } from "../agent/index.ts";
import { AIProvider } from "../agent/ai_provider.ts";
import { t } from "../i18n/index.ts";

export class CLICommands {
  /**
   * Helper to print styled section headers.
   */
  private static printHeader(title: string) {
    console.log("\n" + "=".repeat(60));
    console.log(` ${title.toUpperCase()}`);
    console.log("=".repeat(60));
  }

  /**
   * Command to check corporate registry details (KYB).
   */
  public static async checkRegistry(cnpj: string): Promise<void> {
    this.printHeader(t("cli.headers.checkRegistry"));
    const spinner = new Spinner({
      message: t("cli.spinners.kyb", { cnpj }),
      color: "cyan",
    });
    spinner.start();

    try {
      const result = await verifyRegistryTool.execute!({ cnpj }, {} as any);
      const data = result.data;
      spinner.stop();

      new Table()
        .header(t("cli.tables.kybHeader"))
        .body([
          [
            t("cli.tables.kybFields.legalName"),
            data.legalName || data.name || t("cli.tables.notAvailable"),
          ],
          [
            t("cli.tables.kybFields.tradeName"),
            data.tradeName || data.name || t("cli.tables.notAvailable"),
          ],
          [
            t("cli.tables.kybFields.status"),
            data.registrationStatus || t("cli.tables.statusActive"),
          ],
          [
            t("cli.tables.kybFields.capital"),
            `R$ ${(data.shareCapital || 0).toLocaleString()}`,
          ],
          [
            t("cli.tables.kybFields.foundingDate"),
            data.foundingDate || data.created_at ||
            t("cli.tables.notAvailable"),
          ],
          [
            t("cli.tables.kybFields.taxDebts"),
            `R$ ${(data.taxDebtsAmount || 0).toLocaleString()}`,
          ],
        ])
        .padding(2)
        .border(true)
        .render();

      if (data.taxDebtsAmount && data.taxDebtsAmount > 0) {
        console.log(t("cli.messages.taxDebtsWarning"));
      } else {
        console.log(t("cli.messages.cleanRegistry"));
      }

      console.log(t("cli.messages.kybQualitative"));

      let cultureMemory: any[] = [];
      try {
        const db = DatabaseMemoryService.getInstance();
        const biz = await db.executeRawQuery<any>(
          `SELECT id FROM business WHERE cnpj = $1 LIMIT 1`,
          [cnpj],
        );
        if (biz.length > 0) {
          cultureMemory = await db.getCompanyCultureMemory(biz[0].id);
        }
      } catch (_) {
        // ignore
      }

      const aiConfig = AIProvider.getApiKey();
      if (cultureMemory.length > 0 && cultureMemory[0].cultureData) {
        const c = cultureMemory[0].cultureData;
        console.log(
          t("cli.messages.culture", {
            value: c.corporateCulture || c.culture ||
              t("cli.messages.defaultCultureGood"),
          }),
        );
        console.log(
          t("cli.messages.pastMovements", {
            value: c.pastMovements || c.history ||
              t("cli.messages.defaultMovementsGood"),
          }),
        );
        console.log(
          t("cli.messages.negotiators", {
            value: c.negotiatorProfile || c.negotiators ||
              t("cli.messages.defaultNegotiatorsGood"),
          }),
        );
      } else {
        if (!aiConfig.isFallback) {
          const query = t("cli.messages.cultureQuery", {
            name: data.legalName || "Target",
          });
          const reply = await AgentOrchestrator.executeAgentQuery(
            "kyb_temp",
            query,
          );
          console.log(reply);
        } else {
          const sector = data.sector || t("cli.messages.techSaaS");
          console.log(
            t("cli.messages.culture", {
              value: t("cli.messages.cultureFallback", { sector }),
            }),
          );
          console.log(
            t("cli.messages.pastMovements", {
              value: t("cli.messages.movementsFallback"),
            }),
          );
          console.log(
            t("cli.messages.negotiators", {
              value: t("cli.messages.negotiatorsFallback"),
            }),
          );
        }
      }
    } catch (err) {
      spinner.stop();
      console.error(
        t("cli.messages.kybError"),
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }

  /**
   * Command to run predictive financial risk analysis.
   */
  public static async analyzeRisk(options: {
    name: string;
    ebitda: number;
    revenue: number;
    assets: number;
    liabilities: number;
    cashflow: number;
    volatility: number;
    sector: string;
  }): Promise<void> {
    this.printHeader(t("cli.headers.analyzeRisk", { name: options.name }));
    const spinner = new Spinner({
      message: t("cli.spinners.risk"),
      color: "cyan",
    });
    spinner.start();

    const profile: CompanyFinancialProfile = {
      name: options.name,
      ebitda: options.ebitda,
      revenue: options.revenue,
      totalAssets: options.assets,
      totalLiabilities: options.liabilities,
      operatingCashFlow: options.cashflow,
      historicalVolatility: options.volatility,
      businessSector: options.sector,
    };

    try {
      const report = await MLEngine.analyzeProfile(profile);
      spinner.stop();
      console.log(
        t("cli.messages.riskClassification", { label: report.dcfRiskLabel }),
      );
      console.log(
        t("cli.messages.embeddingStatus", {
          status: report.embeddingsGenerated
            ? t("cli.messages.activated")
            : t("cli.messages.deactivated"),
        }),
      );
      console.log(t("cli.messages.calculatedRiskMetrics"));

      new Table()
        .header(t("cli.tables.riskHeader"))
        .body([
          [
            t("cli.tables.riskFields.insolvency"),
            `${(report.metrics.insolvencyRisk * 100).toFixed(2)}%`,
          ],
          [
            t("cli.tables.riskFields.churn"),
            `${(report.metrics.churnProbability * 100).toFixed(2)}%`,
          ],
          [
            t("cli.tables.riskFields.volatility"),
            `${report.metrics.dcfVolatility}%`,
          ],
          [
            t("cli.tables.riskFields.synergyScore"),
            `${report.metrics.industry4Score}/100`,
          ],
        ])
        .padding(2)
        .border(true)
        .render();

      console.log(t("cli.messages.legalDueDiligence"));

      const dealId = "deal_alpha";
      await ClientSiloedRAG.initializeSilo(dealId, `./vdr_rooms/${dealId}`);
      const queryResults = await ClientSiloedRAG.querySilo(
        dealId,
        "Change of Control",
        2,
      );

      console.log(t("cli.messages.ragScanComplete"));
      if (queryResults.length === 0) {
        console.log(t("cli.messages.noCriticalClauses"));
      } else {
        queryResults.forEach((r) => {
          console.log(
            t("cli.messages.docSnippet", {
              doc: r.document,
              text: r.text.substring(0, 110),
              score: (r.score * 100).toFixed(1),
            }),
          );
        });
      }
    } catch (err) {
      spinner.stop();
      console.error(
        t("cli.messages.riskError"),
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }

  /**
   * Command to resolve portfolio matching (MILP) with risk filters.
   */
  public static async optimizePortfolio(
    budget: number,
    riskTolerance: number,
  ): Promise<void> {
    this.printHeader(t("cli.headers.optimizePortfolio"));

    let pipelineTargets: TargetRawInput[] = [];
    let dbLoaded = false;

    try {
      const db = DatabaseMemoryService.getInstance();
      const sql = `
        SELECT 
          b.id::text as id,
          b.name,
          b.sector,
          b.cnpj,
          t.target_valuation as valuation,
          fs.total_valuation as cost
        FROM business b
        LEFT JOIN transaction_business_role tbr ON b.id = tbr.business_id AND tbr.role_name = 'TARGET'
        LEFT JOIN transaction t ON tbr.transaction_id = t.id
        LEFT JOIN financial_structure fs ON t.id = fs.transaction_id
      `;
      const rows = await db.executeRawQuery<any>(sql);
      if (rows && rows.length > 0) {
        pipelineTargets = rows.map((r: any, idx: number) => {
          const costVal = r.cost
            ? Number(r.cost) / 1000000
            : (r.valuation ? Number(r.valuation) / 1000000 : (30 + idx * 10));
          const synergy = Math.min(
            99,
            Math.max(30, (r.name.length * 3) + 20 + (idx * 5) % 30),
          );
          return {
            id: r.id || `T${idx + 1}`,
            name: r.name,
            synergyValue: synergy,
            acquisitionCost: costVal || 30,
            ebitda: 2000000 + (idx * 500000),
            revenue: 8000000 + (idx * 2000000),
            totalAssets: 12000000 + (idx * 3000000),
            totalLiabilities: 7000000 + (idx * 1500000),
            operatingCashFlow: 1500000 + (idx * 400000),
            historicalVolatility: 0.10 + (idx * 0.04) % 0.30,
            businessSector: r.sector || "Tecnologia",
            taxDebtsAmount: 0,
          };
        });
        dbLoaded = true;
        console.log(
          t("cli.messages.dbLoaded", { count: pipelineTargets.length }),
        );
      }
    } catch (_err) {
      console.warn(t("cli.messages.dbOfflineWarning"));
    }

    if (!dbLoaded || pipelineTargets.length === 0) {
      // Fallback pre-defined targets
      pipelineTargets = [
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
    }

    console.log(
      t("cli.messages.pipelineInput", { count: pipelineTargets.length }),
    );
    console.log(
      t("cli.messages.budgetTolerance", {
        budget,
        tolerance: (riskTolerance * 100).toFixed(0),
      }),
    );

    const spinner = new Spinner({
      message: t("cli.spinners.matching"),
      color: "cyan",
    });
    spinner.start();

    try {
      // Run prediction + solver optimization
      const res = await PortfolioSolver.evaluateAndOptimize(
        pipelineTargets,
        {
          budgetLimit: budget,
          riskToleranceLimit: riskTolerance,
          taxDebtCap: 999999999, // default no cap for CLI demo
          mutualExclusions: [["T1", "T4"]], // Exclusive competitors
        },
      );

      spinner.stop();
      console.log(
        t("cli.messages.solverSolution", {
          status: res.optimization.status.toUpperCase(),
        }),
      );
      console.log(
        t("cli.messages.totalSynergy", { synergy: res.totalSynergy }),
      );
      console.log(
        t("cli.messages.allocatedBudget", { cost: res.totalCost, budget }),
      );
      console.log(t("cli.messages.recommendedCompanies"));

      if (res.optimization.selectedTargetIds.length === 0) {
        console.log(t("cli.messages.noCompaniesMetCriteria"));
      } else {
        const table = new Table().header(t("cli.tables.portfolioHeader"))
          .padding(2).border(true);
        res.optimization.selectedTargetIds.forEach((id) => {
          const target = pipelineTargets.find((t) => t.id === id);
          const risk = res.evaluatedProfiles[id].metrics.insolvencyRisk;
          const minVal = (target!.acquisitionCost * 0.9).toFixed(1);
          const maxVal = (target!.acquisitionCost * 1.15).toFixed(1);
          table.push([
            id,
            target?.name || "",
            t("cli.messages.portfolioRange", { min: minVal, max: maxVal }),
            `$${target?.acquisitionCost}M`,
            `${(risk * 100).toFixed(1)}%`,
          ]);
        });
        table.render();
      }
    } catch (err) {
      spinner.stop();
      console.error(
        t("cli.messages.portfolioError"),
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }

  /**
   * Command to optimize term sheet clauses via Genetic Algorithm.
   */
  public static async optimizeTermSheet(): Promise<void> {
    this.printHeader(t("cli.headers.optimizeTermSheet"));
    console.log(t("cli.spinners.negotiation"));

    try {
      const constraints = [
        new KycConstraint(),
        new LeverageConstraint(4.0),
        new CoverageConstraint(2.5),
      ];
      const kyc = {
        kycBlocked: false,
        sanctionMatch: false,
        pepExposure: false,
      };
      const financial = { ebitda: 5.0, debt: 15.0, interestExpense: 1.0 };

      const resLiquidity = optimizeWithConstraints({
        profile: {
          valuationMin: 80,
          valuationMax: 120,
          preferences: { cash: 0.7, equity: 0.1, earnOut: 0.1, escrow: 0.1 },
        },
        kyc,
        financial,
        constraints,
        geneticConfig: { populationSize: 100, generations: 40 },
      });

      const resBalanced = optimizeWithConstraints({
        profile: {
          valuationMin: 80,
          valuationMax: 120,
          preferences: { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
        },
        kyc,
        financial,
        constraints,
        geneticConfig: { populationSize: 100, generations: 40 },
      });

      const resRetention = optimizeWithConstraints({
        profile: {
          valuationMin: 80,
          valuationMax: 120,
          preferences: { cash: 0.2, equity: 0.2, earnOut: 0.5, escrow: 0.1 },
        },
        kyc,
        financial,
        constraints,
        geneticConfig: { populationSize: 100, generations: 40 },
      });

      const bestLiquidity = resLiquidity[0];
      console.log(t("cli.messages.alt1Title"));
      if (bestLiquidity) {
        console.log(
          t("cli.messages.suggestedValuation", {
            val: bestLiquidity.valuation.toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.cashUpfront", {
            val: (bestLiquidity.cashPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.equityRoll", {
            val: (bestLiquidity.equityPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.earnOut", {
            val: (bestLiquidity.earnOutPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.escrowRetention", {
            val: (bestLiquidity.escrowPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.fitnessIndicator", {
            val: bestLiquidity.fitness.toFixed(5),
          }),
        );
      } else {
        console.log(t("cli.messages.noViableAlternative"));
      }

      const bestBalanced = resBalanced[0];
      console.log(t("cli.messages.alt2Title"));
      if (bestBalanced) {
        console.log(
          t("cli.messages.suggestedValuation", {
            val: bestBalanced.valuation.toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.cashUpfront", {
            val: (bestBalanced.cashPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.equityRoll", {
            val: (bestBalanced.equityPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.earnOut", {
            val: (bestBalanced.earnOutPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.escrowRetention", {
            val: (bestBalanced.escrowPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.fitnessIndicator", {
            val: bestBalanced.fitness.toFixed(5),
          }),
        );
      } else {
        console.log(t("cli.messages.noViableAlternative"));
      }

      const bestRetention = resRetention[0];
      console.log(t("cli.messages.alt3Title"));
      if (bestRetention) {
        console.log(
          t("cli.messages.suggestedValuation", {
            val: bestRetention.valuation.toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.cashUpfront", {
            val: (bestRetention.cashPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.equityRoll", {
            val: (bestRetention.equityPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.earnOut", {
            val: (bestRetention.earnOutPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.escrowRetention", {
            val: (bestRetention.escrowPercentage * 100).toFixed(2),
          }),
        );
        console.log(
          t("cli.messages.fitnessIndicator", {
            val: bestRetention.fitness.toFixed(5),
          }),
        );
      } else {
        console.log(t("cli.messages.noViableAlternative"));
      }
    } catch (err) {
      console.error(
        t("cli.messages.geneticSearchError"),
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Command to generate LaTeX and PDF documents of the Term Sheet.
   */
  public static async generateDocument(options: {
    buyer: string;
    seller: string;
    target: string;
    valuation: number;
    output: string;
  }): Promise<void> {
    this.printHeader(t("cli.headers.generateDocument"));
    console.log(t("cli.spinners.closingStart", { target: options.target }));
    console.log(t("cli.spinners.closingVerify"));

    const spinner = new Spinner({
      message: t("cli.spinners.closingOptimize"),
      color: "cyan",
    });
    spinner.start();

    // Fetch optimized terms using genetic algorithm
    const negotiation = await TermSheetOptimizer.run({
      populationSize: 100,
      generations: 50,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      minBuyerReservationUtility: 0.3,
      minSellerReservationUtility: 0.3,
    });
    const proposal = negotiation.bestProposal;
    spinner.stop();

    console.log(t("cli.messages.markdownPreviewHeader"));
    console.log(t("cli.messages.termSheetTemplate", {
      buyer: options.buyer,
      seller: options.seller,
      target: options.target,
      valuation: options.valuation.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      cash: (proposal.cashPercentage * 100).toFixed(1),
      equity: ((1 - proposal.cashPercentage) * 100).toFixed(1),
      buyerEquity: (proposal.buyerEquityShare * 100).toFixed(1),
      earnOutYears: proposal.earnOutTargetYears,
      nonCompeteMonths: proposal.nonCompeteMonths,
    }));
    console.log(t("cli.messages.previewFooter"));

    const spinnerComp = new Spinner({
      message: t("cli.spinners.closingCompile"),
      color: "cyan",
    });
    spinnerComp.start();

    try {
      // 1. Generate LaTeX code
      const latex = LaTeXGenerator.generateTermSheetLaTeX({
        buyerName: options.buyer,
        sellerName: options.seller,
        targetName: options.target,
        valuationAmount: options.valuation,
        proposal,
      });

      await Deno.mkdir("./term_sheets", { recursive: true });
      const texPath = options.output.replace(".pdf", ".tex");
      await Deno.writeTextFile(texPath, latex);
      spinnerComp.stop();
      console.log(t("cli.messages.latexGenerated", { path: texPath }));

      // 2. Generate PDF via pdf-lib
      await PDFGenerator.writeTermSheetPDF(options.output, {
        buyerName: options.buyer,
        sellerName: options.seller,
        targetName: options.target,
        valuationAmount: options.valuation,
        proposal,
      });
      console.log(t("cli.messages.pdfCompiled", { path: options.output }));
    } catch (err) {
      spinnerComp.stop();
      console.error(
        t("cli.messages.docGenError"),
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }
}
