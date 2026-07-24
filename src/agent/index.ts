// src/agent/index.ts
// Unified entry point for the M&A Low-Touch Middleware agentic ecosystem.
// All agents run exclusively with Gemini 3.1 Pro via @ai-sdk/google.
// The expected environment variable is GOOGLE_GENERATIVE_AI_API_KEY.

import { AIProvider } from "./ai_provider.ts";

import { Agent } from "@mastra/core/agent";

// Initializes the AI provider configuration (ensuring that if there is no key there will be no runtime crash)
const aiConfig = AIProvider.getApiKey();
if (aiConfig.isFallback) {
  // Sets a temporary fake key so the Google library doesn't throw an exception during local file initialization
  Deno.env.set("GOOGLE_GENERATIVE_AI_API_KEY", "mock-key-for-dry-run");

  // Monkeypatch Agent.prototype.generate to prevent real API calls without keys
  Agent.prototype.generate = async function (
    this: any,
    prompt: string,
    _options?: any,
  ) {
    console.warn(
      `[MOCK - ${
        this.name || this.id || "Agent"
      }] Operation intercepted in dry-run mode.`,
    );
    return {
      text: `[DRY-RUN/MOCK - ${
        this.name || this.id || "Agent"
      }] Simulated response because no Google AI Studio/Gemini key was configured. Prompt sent: "${
        prompt.substring(0, 100).replace(/\n/g, " ")
      }..."`,
    } as any;
  };
} else if (aiConfig.key) {
  // Ensures the SDK reads the correct key
  Deno.env.set("GOOGLE_GENERATIVE_AI_API_KEY", aiConfig.key);
}

import {
  BrokerOrchestratorAgent,
  BrokerOrchestratorService,
} from "./agents/broker-orchestrator/index.ts";
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
  dealMatchingAgent,
  financialRiskAgent,
  generalDueDiligenceAgent,
  legalClosingAgent,
  legalDueDiligenceAgent,
  negotiationAgent,
  sourcingAndKYBAgent,
};

// ---------------------------------------------------------------------------
// AgentOrchestrator
// Class responsible for executing queries on the BrokerOrchestratorAgent.
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
      const dynamicContext = await orchestratorService.getOrchestratorContext(
        "default_user",
        "general",
        queryEmbedding,
      );

      // Compliance check on retrieved preferences
      if (!bypassConflict && dynamicContext.preferences) {
        const preferencesList = Array.isArray(dynamicContext.preferences)
          ? dynamicContext.preferences
          : [dynamicContext.preferences];

        for (const pref of preferencesList) {
          if (!pref) continue;
          const prefData =
            (pref && typeof pref === "object" && "preferences" in pref)
              ? pref.preferences as Record<string, any>
              : pref as Record<string, any>;

          const prefStr = JSON.stringify(prefData).toLowerCase();
          const hasSemanticConflict = prefStr.includes("omit split payment") ||
            prefStr.includes("omit provis") ||
            prefStr.includes("omit conting") ||
            (prefData && prefData.requiresHitlApproval &&
              !prefData.hitlApproved);

          if (hasSemanticConflict) {
            const reason = prefData.conflictReason ||
              (prefData.reason &&
                  prefData.reason.toLowerCase().includes("conflict")
                ? prefData.reason
                : undefined) ||
              "Fiduciary Rule Conflict: Conflict with fiduciary compliance rule (LC 214/2025 or contingency provision).";
            throw new ComplianceConflictError(reason, prefData);
          }
        }
      }

      dynamicPreferences = JSON.stringify(dynamicContext.preferences, null, 2);
      dynamicKnowledge = JSON.stringify(
        dynamicContext.domainKnowledge,
        null,
        2,
      );
    } catch (err) {
      if (err instanceof ComplianceConflictError) {
        throw err;
      }
      console.warn(
        "Failed to retrieve dynamic context for prompt injection:",
        err,
      );
    }

    const prompt = `
## Deal Context [${dealId}]
${context || "No RAG context available at the moment."}

## User Preferences (Continuous Learning)
${dynamicPreferences || "No recorded preferences."}

## Legal/Tax Domain Knowledge
${dynamicKnowledge || "No recorded domain knowledge."}

## Broker Instruction
${query}
`;

    // Recheck fallback to avoid API calls with a placeholder key.
    if (aiConfig.isFallback) {
      console.warn(
        "[MOCK] Operation intercepted: Broker Orchestrator response simulation.",
      );
      return `[DRY-RUN/MOCK] The call to the Gemini model was intercepted because no API key (GEMINI_API_KEY) is configured. Original prompt sent with ${prompt.length} characters.`;
    }

    const response = await brokerOrchestratorAgent.generate(prompt);
    return response.text || String(response);
  }
}
