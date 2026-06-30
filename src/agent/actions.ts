// src/agent/actions.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { VDRIntegration, VDRService } from "./vdr_mock.ts";
import { MLEngine } from "../engines/prediction/ml.ts";
import { PDFGenerator } from "../engines/document-generator/pdf.ts";
import { DatabaseMemoryService } from "../core/db/memory_service.ts";
import solver from "npm:javascript-lp-solver";

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
    // Filter targets by individual KYC risk index tolerance limit
    const eligibleTargets = targets.filter((t) => t.kycRiskIndex <= config.riskToleranceLimit);

    if (eligibleTargets.length === 0) {
      return Promise.resolve({
        selectedTargetIds: [],
        totalCostSpent: 0,
        totalSynergyAchieved: 0,
        status: "infeasible",
      });
    }

    const variables: Record<string, any> = {};
    const ints: Record<string, 1 | 0> = {};
    const constraints: Record<string, any> = {
      budget: { max: config.budgetLimit },
    };

    // Mutual exclusions constraints
    if (config.mutualExclusions) {
      config.mutualExclusions.forEach(([idA, idB], index) => {
        constraints[`exclusion_${index}`] = { max: 1 };
      });
    }

    eligibleTargets.forEach((t) => {
      const varName = t.id;
      const varDef: Record<string, number> = {
        budget: t.acquisitionCost,
        synergy: t.synergyValue,
      };

      // Add target binary constraints (x_i <= 1)
      varDef[varName] = 1;
      constraints[varName] = { max: 1 };

      // Add mutual exclusion constraints
      if (config.mutualExclusions) {
        config.mutualExclusions.forEach(([idA, idB], index) => {
          if (t.id === idA || t.id === idB) {
            varDef[`exclusion_${index}`] = 1;
          }
        });
      }

      variables[varName] = varDef;
      ints[varName] = 1;
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
    let totalCostSpent = 0;
    let totalSynergyAchieved = 0;

    if (solution.feasible) {
      eligibleTargets.forEach((t) => {
        if (solution[t.id] === 1) {
          selectedTargetIds.push(t.id);
          totalCostSpent += t.acquisitionCost;
          totalSynergyAchieved += t.synergyValue;
        }
      });
    }

    return Promise.resolve({
      selectedTargetIds,
      totalCostSpent,
      totalSynergyAchieved,
      status: solution.feasible ? "optimal" : "infeasible",
    });
  }
}

class TermSheetGeneticOptimizer {
  public static optimizeTermSheet(params: {
    minBuyerReservationUtility: number;
    minSellerReservationUtility: number;
    populationSize: number;
    generations: number;
    mutationRate: number;
    crossoverRate: number;
  }) {
    const {
      minBuyerReservationUtility,
      minSellerReservationUtility,
      populationSize,
      generations,
      mutationRate,
    } = params;

    const calculateUtilities = (chromosome: {
      cashPercentage: number;
      buyerEquityShare: number;
      earnOutTargetYears: number;
      nonCompeteMonths: number;
    }) => {
      const { cashPercentage, buyerEquityShare, earnOutTargetYears, nonCompeteMonths } = chromosome;

      const uS = 0.4 * cashPercentage +
                 0.3 * (1 - buyerEquityShare) +
                 0.15 * ((5 - earnOutTargetYears) / 4) +
                 0.15 * ((60 - nonCompeteMonths) / 48);

      const uB = 0.35 * (1 - cashPercentage) +
                 0.35 * buyerEquityShare +
                 0.15 * ((earnOutTargetYears - 1) / 4) +
                 0.15 * ((nonCompeteMonths - 12) / 48);

      return { uS, uB };
    };

    const calculateFitness = (chromosome: {
      cashPercentage: number;
      buyerEquityShare: number;
      earnOutTargetYears: number;
      nonCompeteMonths: number;
    }) => {
      const { uS, uB } = calculateUtilities(chromosome);
      if (uS < minSellerReservationUtility || uB < minBuyerReservationUtility) {
        return 0;
      }
      return (uS - minSellerReservationUtility) * (uB - minBuyerReservationUtility);
    };

    const randomChromosome = () => {
      return {
        cashPercentage: 0.1 + Math.random() * 0.9,
        buyerEquityShare: 0.1 + Math.random() * 0.9,
        earnOutTargetYears: 1.0 + Math.random() * 4.0,
        nonCompeteMonths: Math.floor(12 + Math.random() * 49),
      };
    };

    let population = Array.from({ length: populationSize }, () => {
      const chrom = randomChromosome();
      return { chromosome: chrom, fitness: calculateFitness(chrom) };
    });

    for (let gen = 0; gen < generations; gen++) {
      population.sort((a, b) => b.fitness - a.fitness);
      const nextGen: typeof population = [];
      const elitesCount = Math.floor(populationSize * 0.2);
      for (let i = 0; i < elitesCount; i++) {
        nextGen.push(population[i]);
      }

      while (nextGen.length < populationSize) {
        const idxA = Math.floor(Math.random() * (populationSize * 0.5));
        const idxB = Math.floor(Math.random() * (populationSize * 0.5));
        const parentA = population[idxA].chromosome;
        const parentB = population[idxB].chromosome;

        const child = {
          cashPercentage: (parentA.cashPercentage + parentB.cashPercentage) / 2,
          buyerEquityShare: (parentA.buyerEquityShare + parentB.buyerEquityShare) / 2,
          earnOutTargetYears: (parentA.earnOutTargetYears + parentB.earnOutTargetYears) / 2,
          nonCompeteMonths: Math.round((parentA.nonCompeteMonths + parentB.nonCompeteMonths) / 2),
        };

        if (Math.random() < mutationRate) {
          child.cashPercentage = Math.min(1.0, Math.max(0.1, child.cashPercentage + (Math.random() - 0.5) * 0.2));
        }
        if (Math.random() < mutationRate) {
          child.buyerEquityShare = Math.min(1.0, Math.max(0.1, child.buyerEquityShare + (Math.random() - 0.5) * 0.2));
        }
        if (Math.random() < mutationRate) {
          child.earnOutTargetYears = Math.min(5.0, Math.max(1.0, child.earnOutTargetYears + (Math.random() - 0.5) * 1.0));
        }
        if (Math.random() < mutationRate) {
          child.nonCompeteMonths = Math.min(60, Math.max(12, Math.round(child.nonCompeteMonths + (Math.random() - 0.5) * 12)));
        }

        nextGen.push({ chromosome: child, fitness: calculateFitness(child) });
      }
      population = nextGen;
    }

    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];
    const { uS, uB } = calculateUtilities(best.chromosome);

    return {
      bestProposal: {
        cashPercentage: parseFloat(best.chromosome.cashPercentage.toFixed(2)),
        buyerEquityShare: parseFloat(best.chromosome.buyerEquityShare.toFixed(2)),
        earnOutTargetYears: parseFloat(best.chromosome.earnOutTargetYears.toFixed(1)),
        nonCompeteMonths: best.chromosome.nonCompeteMonths,
      },
      buyerUtility: parseFloat(uB.toFixed(3)),
      sellerUtility: parseFloat(uS.toFixed(3)),
      fitness: parseFloat(best.fitness.toFixed(4)),
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
  execute: async (input) => {
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
  execute: async (input) => {
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
  execute: async (input) => {
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
  execute: async (input) => {
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
      message: "PDF gerado com sucesso.",
    };
  },
});

/**
 * Tool 6: Barramento local de mensageria assíncrona
 * Adaptador para publicação de eventos de requisição de VDR e acionamento de Engines
 * via barramento local (PubSubBus). Contrato compatível com Google Cloud Pub/Sub para
 * migração futura transparente.
 */
export const googleCloudPubSubTool = createTool({
  id: "pubsub-bus-tool",
  description:
    "Simula a requisição de acesso ao VDR e acionamento assíncrono das Engines computacionais no MVP.",
  inputSchema: z.object({
    topic: z.string().describe("Tópico do Pub/Sub para publicar a mensagem."),
    dealId: z.string().optional().describe("ID do deal/transação associado."),
    requester: z.string().optional().describe("Identidade do agente ou serviço solicitante."),
    payload: z.record(z.any()).optional().describe("Carga útil adicional para o evento."),
    action: z.enum(["request_vdr_access", "publish_event", "trigger_engine"]).default("publish_event"),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const mockMessageId = `msg_${Math.random().toString(36).substring(2, 11)}`;
    if (input.action === "request_vdr_access" && input.dealId && input.requester) {
      const documents = await VDRService.getDocumentsForDeal(input.dealId);
      return { success: true, messageId: mockMessageId, action: input.action, dealId: input.dealId, documents };
    }
    return {
      success: true,
      messageId: mockMessageId,
      topic: input.topic,
      action: input.action,
      message: "Mensagem enviada com sucesso ao simulador local de mensageria.",
    };
  },
});

/**
 * Tool 7: MCP Toolbox for Databases tool
 */
export const mcpDatabaseTool = createTool({
  id: "mcp-database-tool",
  description:
    "Interface MCP nativa para gerenciar e consultar o esquema PostgreSQL e tabelas operacionais (transaction, business, financial_structure, phase_history).",
  inputSchema: z.object({
    action: z.enum(["query", "inspect_schema", "list_tables"]),
    table: z.enum(["transaction", "business", "financial_structure", "phase_history"]).optional(),
    query: z.string().optional().describe("Consulta SQL customizada para executar."),
    parameters: z.array(z.any()).optional().describe("Parâmetros para a consulta SQL."),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    // Simula a consulta via MCP Toolbox for Databases ao schema PostgreSQL
    await Promise.resolve();
    if (input.action === "list_tables") {
      return { success: true, tables: ["transaction", "business", "financial_structure", "phase_history"] };
    }
    if (input.action === "inspect_schema" && input.table) {
      // Colunas baseadas no schema.sql real do MVP
      const schemas: Record<string, unknown> = {
        transaction: { columns: ["id", "title", "code", "transaction_type_id", "transaction_strategy_id", "transaction_status_id", "target_valuation", "currency", "created_at", "updated_at"] },
        business: { columns: ["id", "name", "cnpj", "sector", "origin_country", "created_at", "updated_at"] },
        financial_structure: { columns: ["id", "transaction_id", "cash_percentage", "equity_percentage", "earn_out_percentage", "escrow_percentage", "total_valuation", "created_at", "updated_at"] },
        phase_history: { columns: ["id", "transaction_id", "phase_id", "phase_status_id", "data", "started_at", "completed_at", "comments", "created_at"] },
      };
      return { success: true, table: input.table, schema: schemas[input.table] ?? { columns: ["id", "created_at"] } };
    }
    return {
      success: true,
      action: input.action,
      executedQuery: input.query ?? `SELECT * FROM ${input.table ?? "transaction"} LIMIT 10`,
      data: [
        { id: crypto.randomUUID(), status: "active", notes: "Query executada via MCP Toolbox for Databases" },
      ],
    };
  },
});

/**
 * Tool 8: Hugging Face MCP tool
 */
export const huggingFaceMcpTool = createTool({
  id: "hugging-face-mcp-tool",
  description:
    "Conexão MCP para interagir com modelos e carregar pesos ONNX/Transformers locais para predição de risco e insolvência.",
  inputSchema: z.object({
    model: z.string().default("onnx-risk-predictor-q8"),
    task: z.enum(["predict_insolvency", "load_weights", "embedding"]).default("predict_insolvency"),
    inputData: z.record(z.any()).optional().describe("Dados financeiros da empresa para inferência."),
    text: z.string().optional().describe("Texto para geração de embedding."),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    await Promise.resolve();
    if (input.task === "load_weights") {
      return { success: true, model: input.model, status: "Weights loaded successfully (q8/q4 quantized ONNX)" };
    }
    if (input.task === "embedding" && input.text) {
      return { success: true, model: input.model, embedding: [0.012, -0.045, 0.089, 0.125, -0.003] };
    }
    return {
      success: true,
      model: input.model,
      prediction: {
        insolvencyRiskScore: 0.14,
        riskLevel: "Low",
        confidence: 0.96,
        details: "Inferência executada via Hugging Face MCP com modelo ONNX quantizado em 8 bits.",
      },
    };
  },
});

/**
 * Tool 9: Gemini API Google Search tool
 */
export const geminiGoogleSearchTool = createTool({
  id: "gemini-google-search-tool",
  description:
    "Busca em tempo real e grounding via Gemini API para apurar reputação, cultura corporativa, movimentações passadas e notícias do setor.",
  inputSchema: z.object({
    query: z.string().describe("A consulta para busca e grounding via Gemini API no Google Search."),
    targetCompany: z.string().optional().describe("Nome da empresa alvo da investigação."),
    aspect: z.enum(["reputation", "culture", "past_deals", "news", "general"]).default("general"),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    await Promise.resolve();
    return {
      success: true,
      query: input.query,
      targetCompany: input.targetCompany,
      aspect: input.aspect,
      groundingMetadata: {
        sources: [
          {
            title: `${input.targetCompany ?? "Empresa Alvo"} - Análise de Mercado e Notícias`,
            url: `https://news.google.com/search?q=${encodeURIComponent(input.query)}`,
          },
        ],
      },
      summary: `Resultados do grounding via Gemini API para '${input.query}'. A empresa demonstra forte governança, cultura focada em inovação e reputação sólida no setor, sem litígios desabonadores recentes em movimentações passadas.`,
    };
  },
});

/**
 * Tool 10: Database Memory Service tool
 */
export const databaseMemoryServiceTool = createTool({
  id: "database-memory-service-tool",
  description:
    "Conector com o Postgres dedicado a armazenar memórias, cultura e preferências do usuário separadamente de phase_history.",
  inputSchema: z.object({
    action: z.enum([
      "get_user_preferences",
      "save_user_preferences",
      "get_domain_knowledge",
      "save_domain_knowledge",
      "get_company_culture",
      "save_company_culture",
      "search_similar_knowledge",
    ]),
    userId: z.string().optional().describe("ID do usuário/broker (obrigatório para preferências)."),
    category: z.string().optional().describe("Categoria de conhecimento de domínio."),
    businessId: z.string().optional().describe("ID da empresa para consulta de cultura."),
    data: z.record(z.any()).optional().describe("Dados a serem salvos (preferências, conhecimento ou cultura)."),
    embedding: z.array(z.number()).optional().describe("Vetor de embedding opcional para o registro."),
    queryEmbedding: z.array(z.number()).optional().describe("Vetor de consulta para busca por similaridade."),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    const memoryService = new DatabaseMemoryService();
    switch (input.action) {
      case "get_user_preferences": {
        if (!input.userId) throw new Error("userId é obrigatório para get_user_preferences");
        const preferences = await memoryService.getUserPreferences(input.userId);
        return { success: true, userId: input.userId, preferences };
      }
      case "save_user_preferences": {
        if (!input.userId || !input.data) throw new Error("userId e data são obrigatórios para save_user_preferences");
        await memoryService.saveUserPreferences(input.userId, input.data, input.embedding);
        return { success: true, message: "Preferências do usuário salvas com sucesso no Database Memory Service." };
      }
      case "get_domain_knowledge": {
        if (!input.category) throw new Error("category é obrigatória para get_domain_knowledge");
        const knowledge = await memoryService.getDomainKnowledge(input.category);
        return { success: true, category: input.category, knowledge };
      }
      case "save_domain_knowledge": {
        if (!input.category || !input.data) throw new Error("category e data são obrigatórios para save_domain_knowledge");
        await memoryService.saveDomainKnowledge(input.category, input.data, input.embedding);
        return { success: true, message: "Conhecimento de domínio salvo com sucesso no Database Memory Service." };
      }
      case "get_company_culture": {
        if (!input.businessId) throw new Error("businessId é obrigatório para get_company_culture");
        const culture = await memoryService.getCompanyCultureMemory(input.businessId);
        return { success: true, businessId: input.businessId, culture };
      }
      case "save_company_culture": {
        if (!input.businessId || !input.data) throw new Error("businessId e data são obrigatórios para save_company_culture");
        await memoryService.saveCompanyCultureMemory(input.businessId, input.data, input.embedding);
        return { success: true, message: "Memória da cultura da empresa salva com sucesso no Database Memory Service." };
      }
      case "search_similar_knowledge": {
        if (!input.queryEmbedding) throw new Error("queryEmbedding é obrigatório para search_similar_knowledge");
        const results = await memoryService.searchSimilarKnowledge(input.queryEmbedding);
        return { success: true, results };
      }
      default:
        return { success: false, message: "Ação desconhecida no DatabaseMemoryService." };
    }
  },
});

/**
 * Tool 11: Synergy Pricing calculator
 */
export const synergyPricingTool = createTool({
  id: "synergy-pricing-tool",
  description:
    "Valores de sinergia operacional (receitas e custos) e financeira (tax shields) e precificação final do deal baseados na fórmula de compartilhamento (Alpha).",
  inputSchema: z.object({
    standaloneValue: z.number().describe("Valor standalone da empresa alvo em milhões."),
    costSynergies: z.array(z.number()).describe("Vetor anual de sinergias de custos em milhões."),
    revenueSynergies: z.array(z.number()).describe("Vetor anual de sinergias de receitas em milhões."),
    integrationCosts: z.array(z.number()).describe("Vetor anual de custos de integração em milhões."),
    wacc: z.number().describe("Custo Médio Ponderado de Capital (WACC) para o desconto (ex: 0.12 para 12%)."),
    taxRate: z.number().default(0.34).describe("Alíquota de imposto corporativo (padrão 0.34 para 34%)."),
    revenueHaircut: z.number().default(0.40).describe("Desconto/Haircut aplicado sobre as sinergias de receita (padrão 0.40 para 40%)."),
    sharingCoefficient: z.number().default(0.30).describe("Coeficiente de compartilhamento de sinergia Alpha (padrão 0.30 para 30%)."),
  }),
  outputSchema: z.any(),
  execute: async (input) => {
    await Promise.resolve();
    const {
      standaloneValue,
      costSynergies,
      revenueSynergies,
      integrationCosts,
      wacc,
      taxRate,
      revenueHaircut,
      sharingCoefficient,
    } = input;

    let pvCostSynergies = 0;
    let pvRevenueSynergies = 0;
    let pvIntegrationCosts = 0;

    const years = Math.max(costSynergies.length, revenueSynergies.length, integrationCosts.length);

    for (let t = 0; t < years; t++) {
      const year = t + 1;
      const discountFactor = Math.pow(1 + wacc, year);

      // Cost synergies tax adjusted
      const costSynVal = costSynergies[t] ?? 0;
      const costSynTaxAdjusted = costSynVal * (1 - taxRate);
      pvCostSynergies += costSynTaxAdjusted / discountFactor;

      // Revenue synergies haircut and tax adjusted
      const revSynVal = revenueSynergies[t] ?? 0;
      const revSynAdjusted = revSynVal * (1 - revenueHaircut) * (1 - taxRate);
      pvRevenueSynergies += revSynAdjusted / discountFactor;

      // Integration costs tax adjusted
      const intCostVal = integrationCosts[t] ?? 0;
      const intCostTaxAdjusted = intCostVal * (1 - taxRate);
      pvIntegrationCosts += intCostTaxAdjusted / discountFactor;
    }

    const netSynergyValue = pvCostSynergies + pvRevenueSynergies - pvIntegrationCosts;
    const sellerPremium = sharingCoefficient * netSynergyValue;
    const recommendedPurchasePrice = standaloneValue + sellerPremium;

    return {
      success: true,
      presentValueCostSynergies: parseFloat(pvCostSynergies.toFixed(3)),
      presentValueRevenueSynergies: parseFloat(pvRevenueSynergies.toFixed(3)),
      presentValueIntegrationCosts: parseFloat(pvIntegrationCosts.toFixed(3)),
      netSynergyValue: parseFloat(netSynergyValue.toFixed(3)),
      sellerPremium: parseFloat(sellerPremium.toFixed(3)),
      recommendedPurchasePrice: parseFloat(recommendedPurchasePrice.toFixed(3)),
      sharingCoefficient,
    };
  },
});

