// src/agent/agents/broker-orchestrator/index.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import * as tools from "./tools/index.ts";
import { DatabaseMemoryService } from "../../../core/db/memory_service.ts";

type CorrectionType =
  | "domain_knowledge"
  | "user_preference";

interface OrchestratorContext {
  preferences: unknown;
  domainKnowledge: unknown;
  status: "available" | "unavailable";
  reason?: "MEMORY_UNAVAILABLE";
}

interface BrokerMemoryStore {
  searchSimilarPreferences(
    embedding: number[],
    limit: number,
  ): Promise<unknown>;
  searchSimilarKnowledge(embedding: number[], limit: number): Promise<unknown>;
  getUserPreferences(userId: string): Promise<unknown>;
  getDomainKnowledge(category: string): Promise<unknown>;
}

interface LegacyCorrectionResult {
  success: false;
  conflict: boolean;
  status: "unsupported";
  reason: "LEGACY_CONTINUOUS_LEARNING_DISABLED";
  conflictReason?: string;
}

const instructions = Deno.readTextFileSync(
  new URL("./instructions.md", import.meta.url),
);

export const BrokerOrchestratorAgent = new Agent({
  id: "broker-orchestrator-agent",
  name: "BrokerOrchestratorAgent",
  model: google("gemini-3.5-flash"),
  instructions: instructions,
  tools: tools,
});

export const brokerOrchestratorAgent = BrokerOrchestratorAgent;

export class BrokerOrchestratorService {
  private readonly memoryService: BrokerMemoryStore;

  constructor(
    memoryService: BrokerMemoryStore = DatabaseMemoryService.getInstance(),
  ) {
    this.memoryService = memoryService;
  }

  /**
   * Retains the legacy API while preventing feedback from mutating
   * authoritative preferences or domain knowledge.
   */
  public processUserCorrection(
    _userId: string,
    correctionType: CorrectionType,
    _categoryOrKey: string,
    _data: Record<string, unknown>,
    _feedbackText?: string,
  ): Promise<LegacyCorrectionResult> {
    if (
      correctionType !== "domain_knowledge" &&
      correctionType !== "user_preference"
    ) {
      return Promise.reject(
        new Error(
          `Invalid memory correction category: "${
            String(correctionType)
          }". Only "domain_knowledge" and "user_preference" are supported.`,
        ),
      );
    }
    const conflictReason = correctionConflictReason(
      _feedbackText ?? JSON.stringify(_data),
    );
    return Promise.resolve({
      success: false,
      conflict: Boolean(conflictReason),
      status: "unsupported",
      reason: "LEGACY_CONTINUOUS_LEARNING_DISABLED",
      ...(conflictReason ? { conflictReason } : {}),
    });
  }

  /**
   * Reads the broker context required by an agent before execution without
   * deriving authority from legacy feedback.
   */
  public async getOrchestratorContext(
    userId: string,
    domainCategory: string,
    queryEmbedding?: number[],
  ): Promise<OrchestratorContext> {
    return queryEmbedding
      ? await this.semanticContext(queryEmbedding)
      : await this.categoryContext(userId, domainCategory);
  }

  private async semanticContext(
    embedding: number[],
  ): Promise<OrchestratorContext> {
    try {
      const [preferences, domainKnowledge] = await Promise.all([
        this.memoryService.searchSimilarPreferences(embedding, 3),
        this.memoryService.searchSimilarKnowledge(embedding, 3),
      ]);
      return { preferences, domainKnowledge, status: "available" };
    } catch (error: unknown) {
      console.warn(
        "[BrokerOrchestratorService] Failed to search DB; memory context is unavailable.",
        error,
      );
      return unavailableContext();
    }
  }

  private async categoryContext(
    userId: string,
    domainCategory: string,
  ): Promise<OrchestratorContext> {
    try {
      const [preferences, domainKnowledge] = await Promise.all([
        this.memoryService.getUserPreferences(userId),
        this.memoryService.getDomainKnowledge(domainCategory),
      ]);
      return { preferences, domainKnowledge, status: "available" };
    } catch (error: unknown) {
      console.warn(
        "[BrokerOrchestratorService] Failed to get preferences from DB; memory context is unavailable.",
        error,
      );
      return unavailableContext();
    }
  }
}

function correctionConflictReason(text: string): string {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("omitir split payment") ||
    normalized.includes("lc 214/2025") ||
    includesBoth(normalized, "split payment", "omitir")
  ) {
    return "Fiduciary Rule Conflict: LC 214/2025 requires mandatory retention and split payment processing.";
  }
  if (
    normalized.includes("omit contingency provision") ||
    normalized.includes("omit contingency") ||
    normalized.includes("no provision") ||
    includesBoth(normalized, "contingency", "omitir")
  ) {
    return "Fiduciary Rule Conflict: Accounting norms require provisioning for probable contingencies.";
  }
  return "";
}

function includesBoth(text: string, left: string, right: string): boolean {
  return text.includes(left) && text.includes(right);
}

function unavailableContext(): OrchestratorContext {
  return {
    preferences: [],
    domainKnowledge: [],
    status: "unavailable",
    reason: "MEMORY_UNAVAILABLE",
  };
}
