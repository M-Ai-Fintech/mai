// src/agent/index.ts
// Ponto de entrada unificado do ecossistema agêntico de M&A Low-Touch Middleware.
// Todos os agentes executam exclusivamente com Gemini 3.1 Pro via @ai-sdk/google.
// A variável de ambiente esperada é GOOGLE_GENERATIVE_AI_API_KEY.

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

    const apiKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY") ||
      Deno.env.get("GOOGLE_API_KEY") ||
      Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY ou GEMINI_API_KEY não configurada no ambiente. Não há fallback ou mocks ativos.");
    }

    const response = await brokerOrchestratorAgent.generate(prompt);
    return response.text || String(response);
  }
}
