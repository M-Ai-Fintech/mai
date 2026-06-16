// src/cli/commands.ts
import { VDRIntegration } from "../core/integrations/vdr.ts";
import { MLEngine, CompanyFinancialProfile } from "../engines/prediction/ML.ts";
import { KYCValuationsCoordinator, TargetRawInput } from "../engines/optimization/KYC_Valuations.ts";
import { TermSheetGeneticOptimizer } from "../engines/optimization/genetic_search.ts";
import { LaTeXGenerator } from "../engines/document-generator/LaTeX.ts";
import { PDFGenerator } from "../engines/document-generator/PDF.ts";

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
    this.printHeader("Verificação Cadastral de KYB (SERPRO/Receita)");
    console.log(`Pesquisando registro para o CNPJ: ${cnpj}...`);
    
    try {
      const data = await VDRIntegration.queryKYBRegistry(cnpj);
      console.log(`\nRazão Social:      ${data.legalName}`);
      console.log(`Nome Fantasia:     ${data.tradeName}`);
      console.log(`Situação:          ${data.status}`);
      console.log(`Capital Social:    R$ ${data.shareCapital.toLocaleString()}`);
      console.log(`Data de Fundação:  ${data.incorporationDate}`);
      console.log(`Débitos Fiscais:   R$ ${data.taxDebtsAmount.toLocaleString()}`);
      
      if (data.taxDebtsAmount > 0) {
        console.log(`\n[AVISO] Débitos fiscais detectados! Isso pode impactar o valuation do ativo.`);
      } else {
        console.log(`\n[OK] Registro limpo e em conformidade fiscal.`);
      }
    } catch (err: any) {
      console.error("Erro na verificação cadastral:", err.message);
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
    this.printHeader(`Análise Preditiva de Risco: ${options.name}`);
    console.log("Executando modelo ONNX quantizado localmente...");

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
      console.log(`\nClassificação do Risco de FCD: [${report.dcfRiskLabel}]`);
      console.log(`Status de Geração de Embeddings: ${report.embeddingsGenerated ? "ATIVADO (Local)" : "DESATIVADO"}`);
      console.log("\nMétricas de Risco Calculadas:");
      console.log(`- Probabilidade de Insolvência: ${(report.metrics.insolvencyRisk * 100).toFixed(2)}%`);
      console.log(`- Probabilidade de Churn de Contratos: ${(report.metrics.churnProbability * 100).toFixed(2)}%`);
      console.log(`- Volatilidade Projetada do FCD: ${report.metrics.dcfVolatility}%`);
      console.log(`- Score de Resiliência de Sinergia (Indústria 4.0): ${report.metrics.industry4Score}/100`);
    } catch (err: any) {
      console.error("Erro no processamento preditivo:", err.message);
    }
  }

  /**
   * Command to resolve portfolio matching (MILP) with risk filters.
   */
  public static async optimizePortfolio(budget: number, riskTolerance: number): Promise<void> {
    this.printHeader("Otimização de Portfólio de Aquisições (MILP)");
    console.log("Definindo restrições matemáticas e alocação de capital...");
    
    // Sample target pipeline for optimization
    const pipelineTargets: TargetRawInput[] = [
      { id: "T1", name: "Alpha Tech S.A.", synergyValue: 85, acquisitionCost: 40, ebitda: 3500000, revenue: 12000000, totalAssets: 15000000, totalLiabilities: 8000000, operatingCashFlow: 2500000, historicalVolatility: 0.14, businessSector: "Tecnologia" },
      { id: "T2", name: "Beta Logística Ltda", synergyValue: 70, acquisitionCost: 30, ebitda: 2800000, revenue: 10000000, totalAssets: 12000000, totalLiabilities: 7000000, operatingCashFlow: 1800000, historicalVolatility: 0.10, businessSector: "Logística" },
      { id: "T3", name: "Gama Energia S.A.", synergyValue: 95, acquisitionCost: 55, ebitda: 5000000, revenue: 18000000, totalAssets: 25000000, totalLiabilities: 18000000, operatingCashFlow: 4000000, historicalVolatility: 0.18, businessSector: "Infraestrutura" },
      { id: "T4", name: "Delta Distribuidora", synergyValue: 40, acquisitionCost: 15, ebitda: 1200000, revenue: 5000000, totalAssets: 6000000, totalLiabilities: 4500000, operatingCashFlow: 600000, historicalVolatility: 0.22, businessSector: "Comércio" },
    ];

    console.log(`Pipeline de entrada: ${pipelineTargets.length} empresas elegíveis.`);
    console.log(`Orçamento Limite: $${budget}M | Tolerância de Risco Máxima: ${(riskTolerance * 100).toFixed(0)}%`);

    try {
      // Run prediction + solver optimization
      const res = await KYCValuationsCoordinator.evaluateAndOptimize(pipelineTargets, {
        budgetLimit: budget,
        riskToleranceLimit: riskTolerance,
        mutualExclusions: [["T1", "T4"]], // Exclusive competitors
      });

      console.log(`\nSolução do Solver HiGHS: ${res.optimization.status.toUpperCase()}`);
      console.log(`Sinergia Total Realizada: ${res.totalSynergy} pontos`);
      console.log(`Orçamento Alocado: $${res.totalCost}M de $${budget}M`);
      console.log(`Empresas Recomendadas para Aquisição:`);
      
      if (res.optimization.selectedTargetIds.length === 0) {
        console.log(" -> Nenhuma empresa atendeu aos critérios sob as restrições atuais.");
      } else {
        res.optimization.selectedTargetIds.forEach(id => {
          const target = pipelineTargets.find(t => t.id === id);
          const risk = res.evaluatedProfiles[id].metrics.insolvencyRisk;
          console.log(` -> [${id}] ${target?.name} (Custo: $${target?.acquisitionCost}M, Risco Calculado: ${(risk * 100).toFixed(1)}%)`);
        });
      }
    } catch (err: any) {
      console.error("Erro na otimização de portfólio:", err.message);
    }
  }

  /**
   * Command to optimize term sheet clauses via Genetic Algorithm.
   */
  public static optimizeTermSheet(): void {
    this.printHeader("Otimização Contratual por Algoritmo Genético");
    console.log("Simulando rodadas de negociação de Nash para conciliar comprador e vendedor...");

    try {
      const res = TermSheetGeneticOptimizer.optimizeTermSheet({
        populationSize: 150,
        generations: 60,
        mutationRate: 0.1,
        crossoverRate: 0.8,
        minBuyerReservationUtility: 0.35,
        minSellerReservationUtility: 0.35,
      });

      console.log("\n--- Termos Finais Recomendados ---");
      console.log(`- Composição de Caixa Upfront:       ${(res.bestProposal.cashPercentage * 100).toFixed(2)}%`);
      console.log(`- Composição de Ações (Equity Roll):  ${((1 - res.bestProposal.cashPercentage) * 100).toFixed(2)}%`);
      console.log(`- Participação Adquirente pós-deal:  ${(res.bestProposal.buyerEquityShare * 100).toFixed(2)}%`);
      console.log(`- Duração das Metas de Earn-out:     ${res.bestProposal.earnOutTargetYears.toFixed(2)} anos`);
      console.log(`- Restrição de Não-Competência:     ${res.bestProposal.nonCompeteMonths} meses`);
      
      console.log("\n--- Indicadores de Utilidade (Barganha) ---");
      console.log(`- Nível de Satisfação do Comprador:  ${(res.buyerUtility * 100).toFixed(2)}%`);
      console.log(`- Nível de Satisfação do Vendedor:   ${(res.sellerUtility * 100).toFixed(2)}%`);
      console.log(`- Aptidão Mútua do Acordo (Nash):    ${res.fitness.toFixed(5)}`);
    } catch (err: any) {
      console.error("Erro na busca genética:", err.message);
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
    this.printHeader("Geração de Documentação Contratual");
    console.log(`Compilando Term Sheet para o deal de: ${options.target}...`);

    // Fetch optimized terms using genetic algorithm
    const negotiation = TermSheetGeneticOptimizer.optimizeTermSheet();
    const proposal = negotiation.bestProposal;

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
      console.log(`[LaTeX] Código-fonte gerado em: \x1b[32m${texPath}\x1b[0m`);

      // 2. Generate PDF via pdf-lib
      await PDFGenerator.writeTermSheetPDF(options.output, {
        buyerName: options.buyer,
        sellerName: options.seller,
        targetName: options.target,
        valuationAmount: options.valuation,
        proposal,
      });
      console.log(`[PDF] Documento PDF compilado e salvo em: \x1b[32m${options.output}\x1b[0m`);
    } catch (err: any) {
      console.error("Erro na geração do documento:", err.message);
    }
  }
}
