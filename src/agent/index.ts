// src/agent/index.ts
// Ponto de entrada unificado do ecossistema agêntico de M&A Low-Touch Middleware.
// Todos os agentes executam exclusivamente com Gemini 2.5 Flash via @ai-sdk/google.
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
      Deno.env.get("GOOGLE_API_KEY");

    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY não configurada no ambiente. Não há fallback ou mocks ativos.");
    }

    const response = await brokerOrchestratorAgent.generate(prompt);
    return response.text || String(response);
  }
}
