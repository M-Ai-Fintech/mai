// Public agent entrypoint for governed definitions, proposals, and tools.
// Legacy execution remains a fail-closed compatibility surface only.

export * from "./governed.ts";
export {
  createLegacyAgentAdapter,
  LEGACY_RAW_AGENT_EXECUTION_DISABLED,
} from "./legacy_agent_adapter.ts";
export type { LegacyAgentAdapter } from "./legacy_agent_adapter.ts";

import type { JsonObject } from "../shared/json.ts";
import {
  createLegacyAgentAdapter,
  LEGACY_RAW_AGENT_EXECUTION_DISABLED,
} from "./legacy_agent_adapter.ts";

const LEGACY_AGENT_EXECUTION_REASON = LEGACY_RAW_AGENT_EXECUTION_DISABLED;
const LEGACY_CORRECTION_REASON = "LEGACY_CONTINUOUS_LEARNING_DISABLED";
const MEMORY_UNAVAILABLE_REASON = "MEMORY_UNAVAILABLE";

export class ComplianceConflictError extends Error {
  constructor(message: string, public preferenceData: JsonObject) {
    super(message);
    this.name = "ComplianceConflictError";
  }
}

interface LegacyCorrectionResult {
  readonly success: false;
  readonly conflict: true;
  readonly status: "unsupported";
  readonly reason: typeof LEGACY_CORRECTION_REASON;
  readonly conflictReason: string;
}

interface UnavailableOrchestratorContext {
  readonly preferences: readonly unknown[];
  readonly domainKnowledge: readonly unknown[];
  readonly status: "unavailable";
  readonly reason: typeof MEMORY_UNAVAILABLE_REASON;
}

/**
 * Compatibility adapter for callers that still construct the former broker
 * service. It never reads or mutates legacy memory.
 */
export class BrokerOrchestratorService {
  constructor(_legacyMemoryService?: unknown) {}

  processUserCorrection(
    _userId: string,
    _correctionType: "domain_knowledge" | "user_preference",
    _categoryOrKey: string,
    _data: Record<string, unknown>,
    _feedbackText?: string,
  ): Promise<LegacyCorrectionResult> {
    return Promise.resolve({
      success: false,
      conflict: true,
      status: "unsupported",
      reason: LEGACY_CORRECTION_REASON,
      conflictReason:
        "Legacy correction persistence is disabled; use an authorized human command.",
    });
  }

  getOrchestratorContext(
    _userId: string,
    _domainCategory: string,
    _queryEmbedding?: number[],
  ): Promise<UnavailableOrchestratorContext> {
    return Promise.resolve({
      preferences: [],
      domainKnowledge: [],
      status: "unavailable",
      reason: MEMORY_UNAVAILABLE_REASON,
    });
  }
}

/**
 * Compatibility adapter for the removed raw Mastra execution path.
 *
 * @example await AgentOrchestrator.executeAgentQuery("deal-1", "summarize")
 */
export class AgentOrchestrator {
  public static executeAgentQuery(
    _dealId: string,
    _query: string,
    _context = "",
    _bypassConflict = false,
  ): Promise<string> {
    return Promise.resolve(JSON.stringify({
      status: "unavailable",
      reason: LEGACY_AGENT_EXECUTION_REASON,
      capability: "legacy.raw-agent-execution",
      governedSurface: "src/agent/governed.ts",
    }));
  }
}

export const brokerOrchestratorAgent = createLegacyAgentAdapter(
  "BrokerOrchestratorAgent",
);
export const sourcingAndKYBAgent = createLegacyAgentAdapter(
  "SourcingAndKYBAgent",
);
export const generalDueDiligenceAgent = createLegacyAgentAdapter(
  "GeneralDueDiligenceAgent",
);
export const financialRiskAgent = createLegacyAgentAdapter(
  "FinancialRiskAgent",
);
export const legalDueDiligenceAgent = createLegacyAgentAdapter(
  "LegalDueDiligenceAgent",
);
export const dealMatchingAgent = createLegacyAgentAdapter("DealMatchingAgent");
export const negotiationAgent = createLegacyAgentAdapter("NegotiationAgent");
export const legalClosingAgent = createLegacyAgentAdapter("LegalClosingAgent");

/**
 * Retains prompt construction for clients migrating to governed proposals;
 * this helper performs no model or provider work.
 */
export function buildBrokerPrompt(
  dealId: string,
  query: string,
  trustedContext: string,
): string {
  return `
## Deal Context [${dealId}]
${trustedContext || "No caller-supplied context available at the moment."}

## Broker Instruction
${query}
`;
}
