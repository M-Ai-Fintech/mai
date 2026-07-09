// src/agent/index.ts
// Ponto de entrada unificado do ecossistema agêntico de M&A Low-Touch Middleware.
// Todos os agentes executam exclusivamente com Gemini 3.1 Pro via @ai-sdk/google.
// A variável de ambiente esperada é GOOGLE_GENERATIVE_AI_API_KEY.

import { AIProvider } from "./ai_provider.ts";

import { Agent } from "@mastra/core/agent";

// Inicializa a configuração do provedor de IA (garantindo que se não houver chave não haverá crash em tempo de execução)
const aiConfig = AIProvider.getApiKey();
if (aiConfig.isFallback) {
  // Define uma chave falsa temporária para que a biblioteca do Google não lance exceção durante a inicialização dos arquivos locais
  Deno.env.set("GOOGLE_GENERATIVE_AI_API_KEY", "mock-key-for-dry-run");

  // Monkeypatch Agent.prototype.generate para evitar chamadas de API reais sem chaves
  Agent.prototype.generate = async function (this: any, prompt: string, _options?: any) {
    console.warn(`[MOCK - ${this.name || this.id || 'Agent'}] Operação interceptada em modo dry-run.`);
    return {
      text: `[DRY-RUN/MOCK - ${this.name || this.id || 'Agent'}] Resposta simulada pois nenhuma chave do Google AI Studio/Gemini foi configurada. Prompt enviado: "${prompt.substring(0, 100).replace(/\n/g, " ")}..."`,
    } as any;
  };
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
import { TransformersEngine } from "../engines/prediction/transformers.ts";

export class ComplianceConflictError extends Error {
  constructor(message: string, public preferenceData: any) {
    super(message);
    this.name = "ComplianceConflictError";
  }
}

export class AgentOrchestrator {
  public static async executeAgentQuery(
    dealId: string,
    query: string,
    context = "",
    bypassConflict = false,
  ): Promise<string> {
    const orchestratorService = new BrokerOrchestratorService();
    let dynamicPreferences = "";
    let dynamicKnowledge = "";

    try {
      const queryEmbedding = await TransformersEngine.generateEmbedding(query);
      const dynamicContext = await orchestratorService.getOrchestratorContext("default_user", "general", queryEmbedding);
      
      // Compliance check on retrieved preferences
      if (!bypassConflict && dynamicContext.preferences) {
        const preferencesList = Array.isArray(dynamicContext.preferences)
          ? dynamicContext.preferences
          : [dynamicContext.preferences];
          
        for (const pref of preferencesList) {
          if (!pref) continue;
          const prefData = (pref && typeof pref === "object" && "preferences" in pref) 
            ? pref.preferences as Record<string, any>
            : pref as Record<string, any>;
            
          const prefStr = JSON.stringify(prefData).toLowerCase();
          const hasSemanticConflict = 
            prefStr.includes("omitir split payment") || 
            prefStr.includes("omitir provis") || 
            prefStr.includes("omitir conting") ||
            (prefData && prefData.requiresHitlApproval && !prefData.hitlApproved);
            
          if (hasSemanticConflict) {
            const reason = prefData.conflictReason || 
              (prefData.reason && prefData.reason.toLowerCase().includes("conflict") ? prefData.reason : undefined) || 
              "Fiduciary Rule Conflict: Conflito com regra fiduciária de conformidade (LC 214/2025 ou provisão de contingências).";
            throw new ComplianceConflictError(reason, prefData);
          }
        }
      }

      dynamicPreferences = JSON.stringify(dynamicContext.preferences, null, 2);
      dynamicKnowledge = JSON.stringify(dynamicContext.domainKnowledge, null, 2);
    } catch (err) {
      if (err instanceof ComplianceConflictError) {
        throw err;
      }
      console.warn("Failed to retrieve dynamic context for prompt injection:", err);
    }

    const prompt = `
## Contexto do Deal [${dealId}]
${context || "Nenhum contexto de RAG disponível no momento."}

## Preferências do Usuário (Continuous Learning)
${dynamicPreferences || "Nenhuma preferência registrada."}

## Conhecimento de Domínio Legal/Tributário
${dynamicKnowledge || "Nenhum conhecimento de domínio registrado."}

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

