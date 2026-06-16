// src/agent/Mastra.ts
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import * as tools from "./actions.ts";
import { ContinuousLearningEngine } from "./continuous_learning.ts";

// System instructions for the M&A Broker Agent
const BASE_INSTRUCTIONS = `
Você é o "M&A Broker Agent", um agente de IA especializado em fusões e aquisições (middle-market e lower-middle-market).
Seu objetivo é ajudar assessores, investidores de Private Equity e diretores corporativos a desintermediar o ciclo de M&A.

Suas capacidades incluem:
1. Verificar a idoneidade cadastral de empresas (KYB) através do CNPJ.
2. Analisar demonstrativos financeiros (DREs, Balanços) gerando scores preditivos de risco.
3. Otimizar a alocação de capital e resolver o "deal matching" por programação linear mista (MILP).
4. Otimizar as cláusulas comerciais e de governança de Term Sheets por meio de algoritmos genéticos.
5. Consolidar as propostas e gerar os documentos físicos contratuais em PDF.

DIRETRIZ DE SEGURANÇA: Mantenha os silos de dados de cada cliente/deal estritamente isolados. Nunca misture informações de deals distintos.
DIRETRIZ MATEMÁTICA: Você NÃO executa cálculos matemáticos finais diretamente. Use sempre a ferramenta adequada (MILP para portfólio, Algoritmo Genético para cláusulas).
`;

// Instantiating the Mastra Agent.
// If OPENAI_API_KEY is not present, we fallback to a mock execution layer in our CLI chat.
const openaiKey = Deno.env.get("OPENAI_API_KEY");
const geminiKey = Deno.env.get("GEMINI_API_KEY");

let selectedModel = "openai/gpt-4o";
if (!openaiKey && geminiKey) {
  selectedModel = "google/gemini-1.5-pro";
}

export const brokerAgent = new Agent({
  id: "ma-broker-agent",
  name: "M&A Broker Agent",
  instructions: BASE_INSTRUCTIONS,
  model: {
    provider: openaiKey ? "OPENAI" : (geminiKey ? "GOOGLE" : "MOCK"),
    name: selectedModel.split("/")[1] || "mock-model",
  },
  tools: {
    verifyRegistryTool: tools.verifyRegistryTool,
    analyzeCompanyRisksTool: tools.analyzeCompanyRisksTool,
    optimizePortfolioTool: tools.optimizePortfolioTool,
    optimizeTermSheetTool: tools.optimizeTermSheetTool,
    generatePdfTermSheetTool: tools.generatePdfTermSheetTool,
  },
});

export const mastra = new Mastra({
  agents: { brokerAgent },
});

export class AgentOrchestrator {
  /**
   * Generates a response from the M&A broker agent, including RAG content and In-Context Learning overrides.
   */
  public static async executeAgentQuery(
    dealId: string,
    userInput: string,
    ragContext = ""
  ): Promise<string> {
    const learningPrompt = await ContinuousLearningEngine.generateInContextLearningPrompt(dealId);
    const systemPrompt = `${BASE_INSTRUCTIONS}\n${learningPrompt}\n### CONTEXTO DE DOCUMENTOS VDR (RAG):\n${
      ragContext || "Nenhum documento VDR relevante recuperado."
    }`;

    // If no real API keys are present, execute offline mock rule-based agent routing
    if (!openaiKey && !geminiKey) {
      return await this.simulateAgentExecution(userInput, dealId, systemPrompt);
    }

    try {
      // Execute using Mastra's agent interface
      const result = await brokerAgent.generate(
        `${userInput}\n\n[System Context Override: ${systemPrompt}]`
      );
      return result.text;
    } catch (err) {
      console.warn("Mastra LLM call failed, falling back to deterministic simulation:", err);
      return await this.simulateAgentExecution(userInput, dealId, systemPrompt);
    }
  }

  /**
   * Deterministic rule-based LLM simulator to run the agent completely offline.
   * Parses keywords and invokes tools, mimicking the agentic reasoning loop.
   */
  private static async simulateAgentExecution(
    input: string,
    dealId: string,
    systemPrompt: string
  ): Promise<string> {
    const text = input.toLowerCase();

    // 1. Check registry / KYB keyword
    if (text.includes("cnpj") || text.includes("receita") || text.includes("kyb") || text.includes("cadastro")) {
      const cnpjMatch = input.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{14}/);
      const cnpj = cnpjMatch ? cnpjMatch[0] : "12345678000199";
      
      const res = await tools.verifyRegistryTool.execute({ cnpj });
      return `[MOCK AGENT REASONING - OFFLINE MODE]
Identifiquei uma solicitação de verificação cadastral para o CNPJ ${cnpj}.
Chamei a ferramenta 'verify-registry-tool'.

**Resultado do Cadastro (Receita Federal / SERPRO):**
- Razão Social: ${res.data.legalName}
- Situação Cadastral: ${res.data.status}
- Capital Social: R$ ${res.data.shareCapital.toLocaleString()}
- Data de Fundação: ${res.data.incorporationDate}
- Débitos Fiscais: R$ ${res.data.taxDebtsAmount.toLocaleString()}

${res.data.taxDebtsAmount > 0 
  ? "⚠️ Alerta: Identificados débitos fiscais pendentes. Isso representa um passivo a ser considerado na due diligence."
  : "✅ Nenhuma pendência fiscal inicial encontrada."}`;
    }

    // 2. Check risk prediction keyword
    if (text.includes("risco") || text.includes("preve") || text.includes("saude") || text.includes("insolvencia")) {
      const mockFinancials = {
        name: "Target Corp Ltda",
        ebitda: 4500000,
        revenue: 15000000,
        totalAssets: 20000000,
        totalLiabilities: 12000000,
        operatingCashFlow: 3200000,
        historicalVolatility: 0.12,
        businessSector: "Tecnologia / SaaS",
      };
      
      const res = await tools.analyzeCompanyRisksTool.execute(mockFinancials);
      const rep = res.report;
      
      return `[MOCK AGENT REASONING - OFFLINE MODE]
Identifiquei uma requisição de análise preditiva financeira da empresa-alvo.
Chamei a ferramenta 'analyze-company-risks-tool' rodando modelo ONNX local quantizado.

**Relatório de IA Preditiva (Analogia Indústria 4.0):**
- Risco de Insolvência Preditivo: ${(rep.metrics.insolvencyRisk * 100).toFixed(2)}%
- Probabilidade de Churn de Contratos: ${(rep.metrics.churnProbability * 100).toFixed(2)}%
- Volatilidade Projetada do FCD (DCF): ${rep.metrics.dcfVolatility}%
- Score de Resiliência de Sinergia (Indústria 4.0): ${rep.metrics.industry4Score}/100
- Classificação de Risco de Fluxo de Caixa: **${rep.dcfRiskLabel}**

*Parecer Técnico:* A saúde geral do ativo é de nível **${rep.dcfRiskLabel}**. A volatilidade do fluxo de caixa e o endividamento indicam riscos moderados que exigirão earn-outs estendidos.`;
    }

    // 3. Check portfolio optimization keyword
    if (text.includes("portfol") || text.includes("aloc") || text.includes("milp") || text.includes("matching")) {
      const mockTargets = [
        { id: "T1", name: "Alfa Logistica", synergyValue: 85, acquisitionCost: 40, kycRiskIndex: 0.15 },
        { id: "T2", name: "Beta Software", synergyValue: 95, acquisitionCost: 50, kycRiskIndex: 0.20 },
        { id: "T3", name: "Gama Farma", synergyValue: 60, acquisitionCost: 30, kycRiskIndex: 0.45 },
        { id: "T4", name: "Delta Metalurgica", synergyValue: 40, acquisitionCost: 20, kycRiskIndex: 0.10 },
      ];
      
      const res = await tools.optimizePortfolioTool.execute({
        targets: mockTargets,
        budgetLimit: 90,
        riskToleranceLimit: 0.30,
        mutualExclusions: [["T1", "T4"]],
      });
      
      const opt = res.result;
      
      return `[MOCK AGENT REASONING - OFFLINE MODE]
Identifiquei uma solicitação de otimização de portfólio de aquisições (deal matching).
Formulei o problema de Programação Inteira Mista (MILP) e chamei a ferramenta 'optimize-portfolio-tool' rodando solver HiGHS WASM.

**Fórmula de Otimização Executada:**
- Maximização de Sinergia subject to Capital <= 90 e Risco KYC <= 0.3
- Concorrência/Exclusão Mútua: Alfa Logística (T1) + Delta Metalúrgica (T4) <= 1

**Resultados do Solver HiGHS:**
- Status da Solução: **${opt.status}**
- Sinergia Total Realizada: **${opt.totalSynergy} pontos**
- Orçamento Gasto: **$${opt.totalCostSpent}M** (Limite de $90M)
- Empresas Alvos Selecionadas: ${opt.selectedTargetIds.join(", ")}
  *(Selecionados T1 e T2. T3 foi excluído pelo alto risco de compliance e T4 pela restrição de concorrência com T1)*`;
    }

    // 4. Check term sheet optimization keyword
    if (text.includes("contrat") || text.includes("term") || text.includes("genetic") || text.includes("negocia")) {
      const res = await tools.optimizeTermSheetTool.execute({
        minBuyerReservationUtility: 0.35,
        minSellerReservationUtility: 0.35,
      });
      
      const opt = res.result;
      
      return `[MOCK AGENT REASONING - OFFLINE MODE]
Identifiquei uma solicitação de estruturação/otimização de cláusulas de Term Sheet.
Executei o motor de algoritmo genético chamando a ferramenta 'optimize-term-sheet-tool'.

**Acordo Otimizado Encontrado (Aptidão de Nash):**
- Proporção em Dinheiro (Cash): ${(opt.bestProposal.cashPercentage * 100).toFixed(1)}%
- Participação do Comprador pós-fechamento (Equity): ${(opt.bestProposal.buyerEquityShare * 100).toFixed(1)}%
- Período de Medição de Earn-out: ${opt.bestProposal.earnOutTargetYears.toFixed(1)} anos
- Prazo de Não-Competição (Non-compete): ${opt.bestProposal.nonCompeteMonths} meses

**Métricas da Otimização:**
- Utilidade de Equilíbrio do Comprador: ${(opt.buyerUtility * 100).toFixed(1)}% (Mínimo: 35%)
- Utilidade de Equilíbrio do Vendedor: ${(opt.sellerUtility * 100).toFixed(1)}% (Mínimo: 35%)
- Pontuação de Aptidão Conjunta: ${opt.fitness.toFixed(4)}`;
    }

    // 5. Check PDF generation keyword
    if (text.includes("pdf") || text.includes("gerar doc") || text.includes("salvar")) {
      const mockProps = {
        cashPercentage: 0.55,
        buyerEquityShare: 0.70,
        earnOutTargetYears: 3.5,
        nonCompeteMonths: 36,
      };
      
      const filePath = `./term_sheets/term_sheet_${dealId}.pdf`;
      const res = await tools.generatePdfTermSheetTool.execute({
        filePath,
        buyerName: "Alpha Investments S.A.",
        sellerName: "Fundadores da Target Ltda",
        targetName: "Target Ltda",
        valuationAmount: 12000000,
        proposal: mockProps,
      });
      
      return `[MOCK AGENT REASONING - OFFLINE MODE]
Identifiquei um comando para gerar e salvar o documento PDF oficial.
Chamei a ferramenta 'generate-pdf-term-sheet-tool'.

**Status da Emissão do Documento:**
- Caminho do Arquivo: \`${res.filePath}\`
- Status: **COMPLETO**
- Bibliotecas Utilizadas: \`pdf-lib\` (compilação direta)

O PDF do Term Sheet contendo os termos otimizados de valoração e cláusulas não vinculativas foi gerado com sucesso.`;
    }

    // 6. Generic response
    return `[MOCK AGENT REASONING - OFFLINE MODE]
Olá, sou o seu M&A Broker Agent.
Recebi sua mensagem. Como estamos operando sem chaves de API externas, processarei suas solicitações localmente e offline.

Você pode me comandar para:
- **Verificar CNPJ:** ex: "verificar CNPJ 12.345.678/0001-99" (KYB cadastral)
- **Análise de Risco:** ex: "prever riscos financeiros da empresa-alvo" (ONNX preditivo)
- **Otimização de Portfólio:** ex: "rodar matching de portfólio MILP via WASM" (Solver HiGHS)
- **Otimização de Term Sheet:** ex: "rodar algoritmo genético de negociação contratual" (Genetic search)
- **Geração de PDF:** ex: "gerar documento PDF do Term Sheet" (pdf-lib)

*System Prompt Context:* \`\`\`
${systemPrompt.slice(0, 150)}...
\`\`\``;
  }
}
