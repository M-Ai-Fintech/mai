// src/agent/index.ts
// Ponto de entrada unificado do ecossistema agêntico de M&A Low-Touch Middleware.
// Todos os agentes executam exclusivamente com Gemini 3.1 Pro via @ai-sdk/google.
// A variável de ambiente esperada é GOOGLE_GENERATIVE_AI_API_KEY.

import { AIProvider } from "./ai_provider.ts";

// Inicializa a configuração do provedor de IA (garantindo que se não houver chave não haverá crash em tempo de execução)
const aiConfig = AIProvider.getApiKey();
if (aiConfig.isFallback) {
  // Define uma chave falsa temporária para que a biblioteca do Google não lance exceção durante a inicialização dos arquivos locais
  Deno.env.set("GOOGLE_GENERATIVE_AI_API_KEY", "mock-key-for-dry-run");
} else if (aiConfig.key) {
  // Garante que o SDK leia a chave certa
  Deno.env.set("GOOGLE_GENERATIVE_AI_API_KEY", aiConfig.key);
}

import { BrokerOrchestratorAgent, BrokerOrchestratorService } from "./agents/broker-orchestrator/index.ts";
import { SourcingAndKYBAgent } from "./agents/sourcing-kyb/index.ts";
import { GeneralDueDiligenceAgent } from "./agents/general-dd/index.ts";
import { FinancialRiskAgent } from "./agents/financial-risk/index.ts";
import { LegalDueDiligenceAgent } from "./agents/legal-dd/index.ts";
import { DealMatchingAgent } from "./agents/deal-matching/index.ts";
import { NegotiationAgent } from "./agents/negotiation/index.ts";
import { LegalClosingAgent } from "./agents/legal-closing/index.ts";

const brokerOrchestratorAgent = BrokerOrchestratorAgent;
const sourcingAndKYBAgent = SourcingAndKYBAgent;
const generalDueDiligenceAgent = GeneralDueDiligenceAgent;
const financialRiskAgent = FinancialRiskAgent;
const legalDueDiligenceAgent = LegalDueDiligenceAgent;
const dealMatchingAgent = DealMatchingAgent;
const negotiationAgent = NegotiationAgent;
const legalClosingAgent = LegalClosingAgent;

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
// Classe responsável por executar queries no BrokerOrchestratorAgent.
// ---------------------------------------------------------------------------
export class AgentOrchestrator {
  public static async executeAgentQuery(
    dealId: string,
    query: string,
    context = "",
  ): Promise<string> {
    const prompt = `
## Contexto do Deal [${dealId}]
${context || "Nenhum contexto de RAG disponível no momento."}

## Instrução do Broker
${query}
`;

    // Re-checa fallback para evitar chamadas à API com chave falsa
    if (aiConfig.isFallback) {
      console.warn("[MOCK] Operação interceptada: Simulação de resposta do Broker Orchestrator.");
      return `[DRY-RUN/MOCK] A chamada ao modelo Gemini foi interceptada pois não há chave de API (GEMINI_API_KEY) configurada. Prompt original enviado com ${prompt.length} caracteres.`;
    }

    const response = await brokerOrchestratorAgent.generate(prompt);
    return response.text || String(response);
  }
}

