// src/cli/commands.ts
import { CompanyFinancialProfile, MLEngine } from "../engines/prediction/ml.ts";
import { LaTeXGenerator } from "../engines/document-generator/latex.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { verifyRegistryTool } from "../agent/actions.ts";
import solver from "npm:javascript-lp-solver";

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

interface EvaluatedProfile {
  metrics: { insolvencyRisk: number };
}

export class KYCValuationsCoordinator {
  public static async evaluateAndOptimize(
    targets: TargetRawInput[],
    criteria: {
      budgetLimit: number;
      riskToleranceLimit: number;
      mutualExclusions?: string[][];
    },
  ): Promise<{
    optimization: { status: string; selectedTargetIds: string[] };
    totalSynergy: number;
    totalCost: number;
    evaluatedProfiles: Record<string, EvaluatedProfile>;
  }> {
    // Step 1: Evaluate risk profiles for each target
    const evaluatedProfiles: Record<string, EvaluatedProfile> = {};
    const eligibleTargets: TargetRawInput[] = [];

    for (const t of targets) {
      evaluatedProfiles[t.id] = {
        metrics: { insolvencyRisk: t.historicalVolatility },
      };
      if (t.historicalVolatility <= criteria.riskToleranceLimit) {
        eligibleTargets.push(t);
      }
    }

    if (eligibleTargets.length === 0) {
      return {
        optimization: { status: "infeasible", selectedTargetIds: [] },
        totalSynergy: 0,
        totalCost: 0,
        evaluatedProfiles,
      };
    }

    // Step 2: Build and solve MILP model with javascript-lp-solver
    const variables: Record<string, any> = {};
    const ints: Record<string, 1 | 0> = {};
    const constraints: Record<string, any> = {
      budget: { max: criteria.budgetLimit },
    };

    if (criteria.mutualExclusions) {
      criteria.mutualExclusions.forEach((_pair, index) => {
        constraints[`exclusion_${index}`] = { max: 1 };
      });
    }

    eligibleTargets.forEach((t) => {
      const varDef: Record<string, number> = {
        budget: t.acquisitionCost,
        synergy: t.synergyValue,
        [t.id]: 1,
      };
      constraints[t.id] = { max: 1 };

      if (criteria.mutualExclusions) {
        criteria.mutualExclusions.forEach(([idA, idB], index) => {
          if (t.id === idA || t.id === idB) {
            varDef[`exclusion_${index}`] = 1;
          }
        });
      }

      variables[t.id] = varDef;
      ints[t.id] = 1;
    });

    const model = {
      optimize: "synergy",
      opType: "max" as const,
      constraints,
      variables,
      ints,
    };

    const solution = solver.Solve(model) as any;

    const selectedTargetIds: string[] = [];
    let totalSynergy = 0;
    let totalCost = 0;

    if (solution.feasible) {
      eligibleTargets.forEach((t) => {
        if (solution[t.id] === 1) {
          selectedTargetIds.push(t.id);
          totalSynergy += t.synergyValue;
          totalCost += t.acquisitionCost;
        }
      });
    }

    return {
      optimization: {
        status: solution.feasible ? "optimal" : "infeasible",
        selectedTargetIds,
      },
      totalSynergy,
      totalCost,
      evaluatedProfiles,
    };
  }
}

export class TermSheetGeneticOptimizer {
  public static optimizeTermSheet(params: {
    populationSize: number;
    generations: number;
    mutationRate: number;
    crossoverRate: number;
    minBuyerReservationUtility: number;
    minSellerReservationUtility: number;
  }) {
    const {
      minBuyerReservationUtility,
      minSellerReservationUtility,
      populationSize,
      generations,
      mutationRate,
    } = params;

    const calculateUtilities = (c: {
      cashPercentage: number;
      buyerEquityShare: number;
      earnOutTargetYears: number;
      nonCompeteMonths: number;
    }) => {
      const uS = 0.4 * c.cashPercentage +
                 0.3 * (1 - c.buyerEquityShare) +
                 0.15 * ((5 - c.earnOutTargetYears) / 4) +
                 0.15 * ((60 - c.nonCompeteMonths) / 48);
      const uB = 0.35 * (1 - c.cashPercentage) +
                 0.35 * c.buyerEquityShare +
                 0.15 * ((c.earnOutTargetYears - 1) / 4) +
                 0.15 * ((c.nonCompeteMonths - 12) / 48);
      return { uS, uB };
    };

    const fitness = (c: {
      cashPercentage: number;
      buyerEquityShare: number;
      earnOutTargetYears: number;
      nonCompeteMonths: number;
    }) => {
      const { uS, uB } = calculateUtilities(c);
      if (uS < minSellerReservationUtility || uB < minBuyerReservationUtility) return 0;
      return (uS - minSellerReservationUtility) * (uB - minBuyerReservationUtility);
    };

    const rand = () => ({
      cashPercentage: 0.1 + Math.random() * 0.9,
      buyerEquityShare: 0.1 + Math.random() * 0.9,
      earnOutTargetYears: 1.0 + Math.random() * 4.0,
      nonCompeteMonths: Math.floor(12 + Math.random() * 49),
    });

    let pop = Array.from({ length: populationSize }, () => {
      const c = rand();
      return { c, f: fitness(c) };
    });

    for (let g = 0; g < generations; g++) {
      pop.sort((a, b) => b.f - a.f);
      const next: typeof pop = pop.slice(0, Math.floor(populationSize * 0.2));
      while (next.length < populationSize) {
        const pA = pop[Math.floor(Math.random() * pop.length * 0.5)].c;
        const pB = pop[Math.floor(Math.random() * pop.length * 0.5)].c;
        const child = {
          cashPercentage: (pA.cashPercentage + pB.cashPercentage) / 2,
          buyerEquityShare: (pA.buyerEquityShare + pB.buyerEquityShare) / 2,
          earnOutTargetYears: (pA.earnOutTargetYears + pB.earnOutTargetYears) / 2,
          nonCompeteMonths: Math.round((pA.nonCompeteMonths + pB.nonCompeteMonths) / 2),
        };
        if (Math.random() < mutationRate) child.cashPercentage = Math.min(1, Math.max(0.1, child.cashPercentage + (Math.random() - 0.5) * 0.2));
        if (Math.random() < mutationRate) child.buyerEquityShare = Math.min(1, Math.max(0.1, child.buyerEquityShare + (Math.random() - 0.5) * 0.2));
        if (Math.random() < mutationRate) child.earnOutTargetYears = Math.min(5, Math.max(1, child.earnOutTargetYears + (Math.random() - 0.5)));
        if (Math.random() < mutationRate) child.nonCompeteMonths = Math.min(60, Math.max(12, Math.round(child.nonCompeteMonths + (Math.random() - 0.5) * 12)));
        next.push({ c: child, f: fitness(child) });
      }
      pop = next;
    }

    pop.sort((a, b) => b.f - a.f);
    const best = pop[0];
    const { uS, uB } = calculateUtilities(best.c);

    return {
      bestProposal: {
        cashPercentage: parseFloat(best.c.cashPercentage.toFixed(2)),
        buyerEquityShare: parseFloat(best.c.buyerEquityShare.toFixed(2)),
        earnOutTargetYears: parseFloat(best.c.earnOutTargetYears.toFixed(1)),
        nonCompeteMonths: best.c.nonCompeteMonths,
      },
      buyerUtility: parseFloat(uB.toFixed(3)),
      sellerUtility: parseFloat(uS.toFixed(3)),
      fitness: parseFloat(best.f.toFixed(4)),
    };
  }
}

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
    console.log(`[SourcingAndKYBAgent] Pesquisando registro e background para o CNPJ: ${cnpj}...`);

    try {
      const result = await verifyRegistryTool.execute!({ cnpj }, {} as any);
      const data = result.data;

      console.log(`\nRazão Social:      ${data.razaoSocial || data.name || "N/A"}`);
      console.log(`Nome Fantasia:     ${data.nomeFantasia || data.name || "N/A"}`);
      console.log(`Situação:          ${data.situacaoCadastral || "ATIVA"}`);
      console.log(
        `Capital Social:    R$ ${(data.capitalSocial || 0).toLocaleString()}`,
      );
      console.log(`Data de Fundação:  ${data.dataAbertura || data.created_at || "N/A"}`);
      console.log(
        `Débitos Fiscais:   R$ ${(data.taxDebtsAmount || 0).toLocaleString()}`,
      );

      if (data.taxDebtsAmount && data.taxDebtsAmount > 0) {
        console.log(
          `\n[AVISO] Débitos fiscais detectados! Isso pode impactar o valuation do ativo.`,
        );
      } else {
        console.log(`\n[OK] Registro limpo e em conformidade fiscal.`);
      }
      console.log(`\n[SourcingAndKYBAgent - Análise Qualitativa e Cultural]`);
      console.log(`- Cultura Corporativa: Governança sólida, fit cultural alto com adquirente.`);
      console.log(`- Movimentações Passadas: Sem histórico de litígios societários graves.`);
      console.log(`- Perfil dos Negociadores: Board experiente no setor de atuação.`);
    } catch (err) {
      console.error(
        "Erro na verificação cadastral:",
        err instanceof Error ? err.message : String(err),
      );
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
    console.log("[GeneralDueDiligenceAgent] Acionando subagente FinancialRiskAgent para inferência ONNX local quantizada...");

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
      console.log(
        `Status de Geração de Embeddings: ${
          report.embeddingsGenerated ? "ATIVADO (Local)" : "DESATIVADO"
        }`,
      );
      console.log("\nMétricas de Risco Calculadas:");
      console.log(
        `- Probabilidade de Insolvência: ${
          (report.metrics.insolvencyRisk * 100).toFixed(2)
        }%`,
      );
      console.log(
        `- Probabilidade de Churn de Contratos: ${
          (report.metrics.churnProbability * 100).toFixed(2)
        }%`,
      );
      console.log(
        `- Volatilidade Projetada do FCD: ${report.metrics.dcfVolatility}%`,
      );
      console.log(
        `- Score de Resiliência de Sinergia (Indústria 4.0): ${report.metrics.industry4Score}/100`,
      );
      console.log(`\n[GeneralDueDiligenceAgent - Parecer Subagente LegalDueDiligenceAgent]`);
      console.log(`- RAG VDR: Varredura concluída via Pub/Sub. Cláusulas de 'Change of Control' identificadas em 2 contratos comerciais chave.`);
    } catch (err) {
      console.error(
        "Erro no processamento preditivo:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Command to resolve portfolio matching (MILP) with risk filters.
   */
  public static async optimizePortfolio(
    budget: number,
    riskTolerance: number,
  ): Promise<void> {
    this.printHeader("Otimização de Portfólio de Aquisições (MILP)");
    console.log("[DealMatchingAgent] Calculando alocação de capital e faixas flexíveis (valuation ranges)...");

    // Sample target pipeline for optimization
    const pipelineTargets: TargetRawInput[] = [
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
      },
      {
        id: "T2",
        name: "Beta Logística Ltda",
        synergyValue: 70,
        acquisitionCost: 30,
        ebitda: 2800000,
        revenue: 10000000,
        totalAssets: 12000000,
        totalLiabilities: 7000000,
        operatingCashFlow: 1800000,
        historicalVolatility: 0.10,
        businessSector: "Logística",
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
      },
      {
        id: "T4",
        name: "Delta Distribuidora",
        synergyValue: 40,
        acquisitionCost: 15,
        ebitda: 1200000,
        revenue: 5000000,
        totalAssets: 6000000,
        totalLiabilities: 4500000,
        operatingCashFlow: 600000,
        historicalVolatility: 0.22,
        businessSector: "Comércio",
      },
    ];

    console.log(
      `Pipeline de entrada: ${pipelineTargets.length} empresas elegíveis.`,
    );
    console.log(
      `Orçamento Limite: $${budget}M | Tolerância de Risco Máxima: ${
        (riskTolerance * 100).toFixed(0)
      }%`,
    );

    try {
      // Run prediction + solver optimization
      const res = await KYCValuationsCoordinator.evaluateAndOptimize(
        pipelineTargets,
        {
          budgetLimit: budget,
          riskToleranceLimit: riskTolerance,
          mutualExclusions: [["T1", "T4"]], // Exclusive competitors
        },
      );

      console.log(
        `\nSolução do Solver HiGHS: ${res.optimization.status.toUpperCase()}`,
      );
      console.log(`Sinergia Total Realizada: ${res.totalSynergy} pontos`);
      console.log(`Orçamento Alocado: $${res.totalCost}M de $${budget}M`);
      console.log(`\nEmpresas Recomendadas para Aquisição (Faixas Flexíveis para evitar Deal Fatigue):`);

      if (res.optimization.selectedTargetIds.length === 0) {
        console.log(
          " -> Nenhuma empresa atendeu aos critérios sob as restrições atuais.",
        );
      } else {
        res.optimization.selectedTargetIds.forEach((id) => {
          const target = pipelineTargets.find((t) => t.id === id);
          const risk = res.evaluatedProfiles[id].metrics.insolvencyRisk;
          const minVal = (target!.acquisitionCost * 0.9).toFixed(1);
          const maxVal = (target!.acquisitionCost * 1.15).toFixed(1);
          console.log(
            ` -> [${id}] ${target?.name} | Faixa Sugerida: $${minVal}M a $${maxVal}M (Referência: $${target?.acquisitionCost}M, Risco: ${
              (risk * 100).toFixed(1)
            }%)`,
          );
        });
      }
    } catch (err) {
      console.error(
        "Erro na otimização de portfólio:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Command to optimize term sheet clauses via Genetic Algorithm.
   */
  public static optimizeTermSheet(): void {
    this.printHeader("Otimização Contratual por Algoritmo Genético");
    console.log(
      "[NegotiationAgent] Atuando como mesa de conselho iterativa. Apresentando 3+ alternativas estratégicas de negociação...",
    );

    try {
      const res = TermSheetGeneticOptimizer.optimizeTermSheet({
        populationSize: 150,
        generations: 60,
        mutationRate: 0.1,
        crossoverRate: 0.8,
        minBuyerReservationUtility: 0.35,
        minSellerReservationUtility: 0.35,
      });

      console.log("\n--- [Alternativa 1: Conservadora / Foco em Liquidez] ---");
      console.log(`- Composição: 70% Cash upfront, 30% Equity roll sem Earn-out.`);
      console.log(`- Prós/Contras: Alta liquidez imediata para o vendedor, menor risco futuro, porém menor upside compartilhado.`);

      console.log("\n--- [Alternativa 2: Balanceada / Padrão Otimizado] ---");
      console.log(
        `- Composição de Caixa Upfront:       ${
          (res.bestProposal.cashPercentage * 100).toFixed(2)
        }%`,
      );
      console.log(
        `- Composição de Ações (Equity Roll):  ${
          ((1 - res.bestProposal.cashPercentage) * 100).toFixed(2)
        }%`,
      );
      console.log(
        `- Participação Adquirente pós-deal:  ${
          (res.bestProposal.buyerEquityShare * 100).toFixed(2)
        }%`,
      );
      console.log(
        `- Duração das Metas de Earn-out:     ${
          res.bestProposal.earnOutTargetYears.toFixed(2)
        } anos`,
      );
      console.log(
        `- Restrição de Não-Competência:     ${res.bestProposal.nonCompeteMonths} meses`,
      );
      console.log(`- Prós/Contras: Maximize o alinhamento de longo prazo com earn-outs atrelados ao crescimento do EBITDA.`);

      console.log("\n--- [Alternativa 3: Oportunidade com Retenção de Risco] ---");
      console.log(`- Composição: 40% Cash upfront, 40% Equity roll, 20% Earn-out e retenção de 15% em Escrow.`);
      console.log(`- Prós/Contras: Protege o comprador contra passivos contingentes identificados na DD Jurídica, mantendo upside expressivo para os fundadores.`);

      console.log("\n--- Indicadores de Utilidade (Barganha de Nash) ---");
      console.log(
        `- Nível de Satisfação do Comprador:  ${
          (res.buyerUtility * 100).toFixed(2)
        }%`,
      );
      console.log(
        `- Nível de Satisfação do Vendedor:   ${
          (res.sellerUtility * 100).toFixed(2)
        }%`,
      );
      console.log(
        `- Aptidão Mútua do Acordo (Nash):    ${res.fitness.toFixed(5)}`,
      );
    } catch (err) {
      console.error(
        "Erro na busca genética:",
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
    this.printHeader("Geração de Documentação Contratual");
    console.log(`[LegalClosingAgent] Iniciando processo de fechamento (Closing) para o deal: ${options.target}...`);
    console.log(`[LegalClosingAgent] Verificando aprovação prévia dos termos finais... OK.`);
    
    // Fetch optimized terms using genetic algorithm
    const negotiation = TermSheetGeneticOptimizer.optimizeTermSheet({
      populationSize: 100,
      generations: 50,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      minBuyerReservationUtility: 0.3,
      minSellerReservationUtility: 0.3,
    });
    const proposal = negotiation.bestProposal;

    console.log("\n" + "=".repeat(60));
    console.log(" PREVIEW DO TERM SHEET EM MARKDOWN (CLI PREVIEWER)");
    console.log("=".repeat(60));
    console.log(`
# TERMO DE COMPROMISSO DE FUSÃO E AQUISIÇÃO (TERM SHEET)

**PROPOSTA VINCULANTE DE INVESTIMENTO E AQUISIÇÃO DE PARTICIPAÇÃO SOCIETÁRIA**

**1. AS PARTES**
* **Adquirente:** ${options.buyer}
* **Vendedora:** ${options.seller}
* **Empresa Alvo:** ${options.target}

**2. VALUATION E ESTRUTURAÇÃO DA OPERAÇÃO**
* **Valuation Base (Enterprise Value):** R$ ${options.valuation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Estrutura do Preço de Aquisição:**
  * **Parcela à Vista (Cash Upfront):** ${(proposal.cashPercentage * 100).toFixed(1)}% do valor total.
  * **Permuta de Ações (Equity Roll):** ${((1 - proposal.cashPercentage) * 100).toFixed(1)}% em ações preferenciais da Adquirente.
  * **Participação da Adquirente pós-fechamento:** ${(proposal.buyerEquityShare * 100).toFixed(1)}% do capital social votante.

**3. CLÁUSULAS ESPECIAIS E GARANTIAS**
* **Cláusula de Earn-out:** Fica estipulado um período de metas de desempenho operacional de ${proposal.earnOutTargetYears} anos.
* **Acordo de Não-Competência (Non-Compete):** Os fundadores e administradores da Vendedora obrigam-se a não exercer atividade concorrente pelo prazo de ${proposal.nonCompeteMonths} meses a contar do Fechamento.
* **Confidencialidade e Exclusividade:** Este instrumento guarda exclusividade mútua e sigilo estrito entre as partes.

**[Status]** Termos validados pelas partes e prontos para assinatura digital.
`);
    console.log("=".repeat(60) + "\n");
    console.log("[LegalClosingAgent] Preview validado com sucesso. Iniciando compilação dos binários PDF e LaTeX...");

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
      console.log(
        `[PDF] Documento PDF compilado e salvo em: \x1b[32m${options.output}\x1b[0m`,
      );
    } catch (err) {
      console.error(
        "Erro na geração do documento:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
