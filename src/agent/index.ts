// src/agent/index.ts
// Unified entry point for the M&A Low-Touch Middleware agentic ecosystem.
// All agents run exclusively with Gemini 3.1 Pro via @ai-sdk/google.
// The expected environment variable is GOOGLE_GENERATIVE_AI_API_KEY.

import { AIProvider } from "./ai_provider.ts";

import { Agent } from "@mastra/core/agent";
import { JsonObject } from "../shared/json.ts";

// Initializes the AI provider configuration (ensuring that if there is no key there will be no runtime crash)
const aiConfig = AIProvider.getApiKey();
if (aiConfig.isFallback) {
  // Sets a temporary fake key so the Google library doesn't throw an exception during local file initialization
  Deno.env.set("GOOGLE_GENERATIVE_AI_API_KEY", "mock-key-for-dry-run");

  // Monkeypatch Agent.prototype.generate to prevent real API calls without keys
  Agent.prototype.generate = function (prompt: string) {
    const promptText = String(prompt);
    console.warn(
      `[MOCK - ${
        this.name || this.id || "Agent"
      }] Operation intercepted in dry-run mode.`,
    );
    const response = {
      text: `[DRY-RUN/MOCK - ${
        this.name || this.id || "Agent"
      }] Simulated response because no Google AI Studio/Gemini key was configured. Prompt sent: "${
        promptText.substring(0, 100).replace(/\n/g, " ")
      }..."`,
    };
    return Promise.resolve(response) as ReturnType<Agent["generate"]>;
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
  constructor(message: string, public preferenceData: JsonObject) {
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
    const dynamicContext = await loadPromptContext(query, bypassConflict);
    const prompt = brokerPrompt(dealId, query, context, dynamicContext);
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

interface PromptContext {
  preferences: string;
  knowledge: string;
}

async function loadPromptContext(
  query: string,
  bypassConflict: boolean,
): Promise<PromptContext> {
  try {
    const embedding = await TransformersEngine.generateEmbedding(query);
    const context = await new BrokerOrchestratorService()
      .getOrchestratorContext("default_user", "general", embedding);
    if (!bypassConflict) assertCompliantPreferences(context.preferences);
    return {
      preferences: JSON.stringify(context.preferences, null, 2),
      knowledge: JSON.stringify(context.domainKnowledge, null, 2),
    };
  } catch (error: unknown) {
    if (error instanceof ComplianceConflictError) throw error;
    console.warn("Failed to retrieve dynamic prompt context:", error);
    return { preferences: "", knowledge: "" };
  }
}

function assertCompliantPreferences(preferences: unknown): void {
  const entries = Array.isArray(preferences) ? preferences : [preferences];
  for (const entry of entries) {
    if (!entry) continue;
    const preference = preferencePayload(entry);
    if (hasComplianceConflict(preference)) {
      throw new ComplianceConflictError(conflictReason(preference), preference);
    }
  }
}

function preferencePayload(entry: unknown): JsonObject {
  if (typeof entry !== "object" || entry === null) return {};
  if ("preferences" in entry && isJsonObject(entry.preferences)) {
    return entry.preferences;
  }
  return isJsonObject(entry) ? entry : {};
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasComplianceConflict(preference: JsonObject): boolean {
  const serialized = JSON.stringify(preference).toLowerCase();
  return serialized.includes("omit split payment") ||
    serialized.includes("omit provis") ||
    serialized.includes("omit conting") ||
    preference.requiresHitlApproval === true &&
      preference.hitlApproved !== true;
}

function conflictReason(preference: JsonObject): string {
  if (typeof preference.conflictReason === "string") {
    return preference.conflictReason;
  }
  if (
    typeof preference.reason === "string" &&
    preference.reason.toLowerCase().includes("conflict")
  ) return preference.reason;
  return "Fiduciary Rule Conflict: Conflict with fiduciary compliance rule (LC 214/2025 or contingency provision).";
}

function brokerPrompt(
  dealId: string,
  query: string,
  ragContext: string,
  dynamic: PromptContext,
): string {
  return `
## Deal Context [${dealId}]
${ragContext || "No RAG context available at the moment."}

## User Preferences (Continuous Learning)
${dynamic.preferences || "No recorded preferences."}

## Legal/Tax Domain Knowledge
${dynamic.knowledge || "No recorded domain knowledge."}

## Broker Instruction
${query}
`;
}
