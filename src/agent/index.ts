// src/agent/index.ts
// Ponto de entrada unificado do ecossistema agêntico de M&A Low-Touch Middleware.
// Todos os agentes executam exclusivamente com Gemini 3.5 Flash via @ai-sdk/google.
// A variável de ambiente esperada é GOOGLE_GENERATIVE_AI_API_KEY.

import { brokerOrchestratorAgent, BrokerOrchestratorService } from "./agents/orchestrator.ts";
import { sourcingAndKYBAgent } from "./agents/kyb_sourcing.ts";
import {
  generalDueDiligenceAgent,
  financialRiskAgent,
  legalDueDiligenceAgent,
} from "./agents/due_diligence.ts";
import { dealMatchingAgent } from "./agents/deal_matching.ts";
import { negotiationAgent } from "./agents/negotiation.ts";
import { legalClosingAgent } from "./agents/legal_closing.ts";

export {
  brokerOrchestratorAgent,
  BrokerOrchestratorService,
  sourcingAndKYBAgent,
  generalDueDiligenceAgent,
  financialRiskAgent,
  legalDueDiligenceAgent,
  dealMatchingAgent,
  negotiationAgent,
  legalClosingAgent,
};

// ---------------------------------------------------------------------------
// AgentOrchestrator
// Classe responsável por executar queries no BrokerOrchestratorAgent e retornar
// respostas para o CLI de chat. Em desenvolvimento (sem GOOGLE_GENERATIVE_AI_API_KEY
// configurada), utiliza um mock inteligente baseado no teor da query para que o fluxo
// da interface possa ser desenvolvido e testado sem custos de API.
// ---------------------------------------------------------------------------
export class AgentOrchestrator {
  public static async executeAgentQuery(
    dealId: string,
    query: string,
    context = "",
  ): Promise<string> {
    const prompt = `
## Contexto do Deal [${dealId}]
${context || "Nenhum contexto de VDR disponível no momento."}

## Instrução do Broker
${query}
`;

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY") ||
      Deno.env.get("GOOGLE_API_KEY");

    if (!apiKey) {
      // Mock de desenvolvimento — simula respostas ricas do ecossistema de agentes
      return AgentOrchestrator.mockResponse(dealId, query);
    }

    try {
      const response = await brokerOrchestratorAgent.generate(prompt);
      return response.text || String(response);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return `[BrokerOrchestratorAgent] Erro ao comunicar com o Gemini: ${errMsg}\n\nVerifique se GOOGLE_GENERATIVE_AI_API_KEY está configurada corretamente.`;
    }
  }

  /**
   * Mock inteligente de desenvolvimento.
   * Simula respostas dos 7 agentes baseadas no teor da query.
   * Usado apenas quando GOOGLE_GENERATIVE_AI_API_KEY não está configurada.
   */
  private static mockResponse(dealId: string, query: string): string {
    const q = query.toLowerCase();

    if (q.includes("kyb") || q.includes("sourcing") || q.includes("cnpj") || q.includes("cultura") || q.includes("background")) {
      return `**[SourcingAndKYBAgent — Mock de Desenvolvimento]**\n\n## Dossiê KYB: Empresa Alvo (Deal ${dealId})\n\n### 1. Situação Cadastral\n- Situação: **ATIVA**\n- Capital Social: R$ 2.500.000\n- Fundação: 12/03/2018\n- Débitos Fiscais: R$ 0 | Status: ✅ Limpa\n\n### 2. Histórico de Mercado\n- 2022: Captação Série A de R$ 8M com fundo de PE regional\n- 2023: Tentativa de aquisição por concorrente — abortada por impasse de valuation\n\n### 3. Perfil dos Negociadores\n| Nome | Papel | Track Record | Risk Score |\n|------|-------|--------------|------------|\n| João Silva | CEO/Fundador | 1 exit anterior (R$ 12M) | Baixo |\n| Maria Souza | CFO | 8 anos em Big4 | Baixo |\n\n### 5. Score Geral\n**Resultado: ✅ APROVADO**\nEmpresa com histórico limpo e fundadores com track record verificado. Fit cultural alto com adquirente baseado em governança orientada a dados.`;
    }

    if (q.includes("due diligence") || q.includes("auditoria") || q.includes("risco financeiro") || q.includes("change of control")) {
      return `**[GeneralDueDiligenceAgent — Mock de Desenvolvimento]**\n\n## Relatório de Due Diligence: Deal ${dealId}\n\n**Recomendação:** 🟡 **AVANÇAR COM CONDICIONANTES**\n\n### 1. Due Diligence Financeira (FinancialRiskAgent)\n- EBITDA Normalizado: R$ 4.500.000 (ajuste de R$ 300K em honorários de sócios)\n- Score ONNX (insolvência): **0.14** → Baixo\n- Dívida Líquida/EBITDA: **1.8x** → Conservador ✅\n\n### 2. Due Diligence Jurídica (LegalDueDiligenceAgent)\n⚠️ **2 contratos com cláusula de Change of Control identificados:**\n- Contrato de fornecimento com Empresa X (R$ 3.2M/ano): notificação prévia de 60 dias → **Gestível**\n- Acordo de parceria com Empresa Y: aprovação prévia da matriz → **Ação necessária antes do closing**\n\n### 4. Condicionantes\n1. Obter waiver de Change of Control da Empresa Y antes da assinatura do SPA\n2. Escrow de R$ 1.5M por 18 meses para contingências trabalhistas estimadas`;
    }

    if (q.includes("matching") || q.includes("portfolio") || q.includes("valuation range") || q.includes("alocação")) {
      return `**[DealMatchingAgent — Mock de Desenvolvimento]**\n\n## Relatório de Portfolio Matching\n\n### 🥇 Tier 1 — Prioridade\n\n**Empresa Alvo (${dealId})**\n- **Faixa de Valuation:** R$ 36M – R$ 54M (referência: R$ 45M)\n- **Metodologia:** EV/EBITDA 8x–12x sobre EBITDA normalizado de R$ 4.5M | DCF: R$ 43M\n- **Sinergia Projetada:** R$ 8M em 24 meses (cross-sell + G&A consolidation)\n- **Risk Score:** Baixo\n\n**Por que faixa flexível:** O histórico de tentativa anterior de aquisição sugere que o fundador tem âncora de valuation em R$ 50M. Iniciar com R$ 45M dá margem para movimento sem colapso.`;
    }

    if (q.includes("negociação") || q.includes("proposta") || q.includes("alternativa") || q.includes("term sheet") || q.includes("earn-out") || q.includes("estrutura")) {
      return `**[NegotiationAgent — Mock de Desenvolvimento]**\n\n## Mesa de Conselho: Estruturação do Deal ${dealId}\n\n### Diagnóstico\n- Gap de valuation: R$ 5M (broker propõe R$ 45M, vendedor ancora em R$ 50M)\n- BATNA do vendedor: sem oferta alternativa ativa, mas demonstra paciência\n\n---\n\n### Alternativa A — Conservadora\n**70% Cash (R$ 31.5M) + 30% Equity Roll (R$ 13.5M)** | EV implícito: R$ 45M\n✅ Comprador: menor earn-out risk | ✅ Vendedor: liquidez imediata | ⚠️ Risco: vendedor pode recusar por ancorar em R$ 50M\n\n### Alternativa B — Balanceada ⭐ Recomendada\n**60% Cash (R$ 27M) + 20% Equity (R$ 9M) + 20% Earn-out** | EV implícito: R$ 45M + R$ 5M condicional\n**Fitness Score (Nash): 0.847** | Utilidade Comprador: 73% | Utilidade Vendedor: 71%\n\n### Alternativa C — Oportunista\n**50% Cash + 30% Equity + 20% Earn-out + R$ 3M Escrow** | EV implícito: R$ 48M condicional\n✅ Maximiza upside para ambas as partes | ⚠️ Maior complexidade contratual`;
    }

    if (q.includes("closing") || q.includes("contrato final") || q.includes("pdf") || q.includes("fechamento") || q.includes("assinatura")) {
      return `**[LegalClosingAgent — Mock de Desenvolvimento]**\n\nVerifiquei os pré-requisitos de closing. Todos os elementos econômicos e jurídicos estão definidos.\n\nExibindo preview do Term Sheet para validação antes da emissão dos binários.\n\n*(Em ambiente de produção com GOOGLE_GENERATIVE_AI_API_KEY configurada, o preview completo será gerado pelo agente e o PDF emitido via \`generatePdfTermSheetTool\`)*`;
    }

    return `**[BrokerOrchestratorAgent — Mock de Desenvolvimento]**\n\nContexto carregado para o deal **${dealId}**.\n\nEstou pronto para coordenar o ecossistema. Para iniciar, especifique qual análise deseja conduzir:\n\n- **"kyb [CNPJ]"** → Qualificação e KYB da empresa-alvo\n- **"due diligence"** → Auditoria financeira e jurídica completa\n- **"matching"** → Análise de portfólio e valuation range\n- **"negociação"** → Estruturação de alternativas e term sheet\n- **"closing"** → Formalização contratual e geração de documentos\n\n*Modo desenvolvimento: configure GOOGLE_GENERATIVE_AI_API_KEY para ativar o Gemini 3.5 Flash.*`;
  }
}
