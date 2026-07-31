// src/agent/agents/broker-orchestrator/index.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import * as tools from "./tools/index.ts";
import { DatabaseMemoryService } from "../../../core/db/memory_service.ts";
import { TransformersEngine } from "../../../engines/prediction/transformers.ts";
import { ContinuousLearningEngine } from "../../continuous_learning.ts";

type FeedbackVariable = Parameters<
  typeof ContinuousLearningEngine.recordCorrection
>[0]["variableName"];
type CorrectionType =
  | "domain_knowledge"
  | "user_preference";

interface OrchestratorContext {
  preferences: unknown;
  domainKnowledge: unknown;
}

interface CorrectionRequest {
  userId: string;
  type: CorrectionType;
  category: string;
  values: Record<string, unknown>;
  feedbackText?: string;
}

function isFeedbackVariable(value: unknown): value is FeedbackVariable {
  return typeof value === "string" &&
    ["valuation", "cashPercentage", "nonCompeteMonths", "earnOutTargetYears"]
      .includes(value);
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
  private memoryService: DatabaseMemoryService;

  constructor() {
    this.memoryService = DatabaseMemoryService.getInstance();
  }

  /**
   * Intercepts a user correction and persists it separately in the
   * Database Memory Service: Domain Knowledge vs. User Preferences.
   */
  public async processUserCorrection(
    userId: string,
    correctionType: CorrectionType,
    categoryOrKey: string,
    data: Record<string, unknown>,
    feedbackText?: string,
  ): Promise<{ success: boolean; conflict: boolean; conflictReason?: string }> {
    if (
      correctionType !== "domain_knowledge" &&
      correctionType !== "user_preference"
    ) {
      throw new Error(
        `Invalid memory correction category: "${
          String(correctionType)
        }". Only "domain_knowledge" and "user_preference" are supported.`,
      );
    }
    return await this.processCorrection({
      userId,
      type: correctionType,
      category: categoryOrKey,
      values: data,
      feedbackText,
    });
  }

  private async processCorrection(request: CorrectionRequest) {
    const text = request.feedbackText || JSON.stringify(request.values);
    const embedding = await TransformersEngine.generateEmbedding(text);
    if (request.type === "user_preference") {
      return await this.processPreferenceCorrection(
        request.userId,
        text,
        request.values,
        embedding,
        request.feedbackText,
      );
    }
    await this.saveOrganizationalMemory(
      request.type,
      request.category,
      request.values,
      embedding,
    );
    return { success: true, conflict: false, conflictReason: "" };
  }

  private async processPreferenceCorrection(
    userId: string,
    text: string,
    data: Record<string, unknown>,
    embedding: number[],
    feedbackText?: string,
  ) {
    const conflictReason = await this.userPreferenceConflict(text, embedding);
    markComplianceConflict(data, conflictReason);
    await this.saveUserPreference(userId, data, embedding, feedbackText);
    return { success: true, conflict: Boolean(conflictReason), conflictReason };
  }

  /**
   * Retrieves the complete broker context (preferences + domain knowledge)
   * to be injected into any agent's prompt before execution.
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

  private async userPreferenceConflict(
    text: string,
    embedding: number[],
  ): Promise<string> {
    const keywordConflict = keywordConflictReason(text);
    return await this.vectorConflictReason(embedding) || keywordConflict;
  }

  private async vectorConflictReason(embedding: number[]): Promise<string> {
    try {
      const conflicts = await this.memoryService.searchSimilarKnowledge(
        embedding,
        1,
      );
      return conflicts.length > 0 && conflicts[0].similarity > 0.85
        ? `Conflict with fiduciary rule: ${conflicts[0].category}`
        : "";
    } catch (error: unknown) {
      console.warn(
        "[BrokerOrchestratorService] Vector similarity compliance check skipped (DB offline/empty).",
        error,
      );
      return "";
    }
  }

  private async saveUserPreference(
    userId: string,
    data: Record<string, unknown>,
    embedding: number[],
    feedbackText?: string,
  ): Promise<void> {
    try {
      await this.memoryService.saveUserPreferences(userId, data, embedding);
    } catch (error: unknown) {
      console.warn(
        "[BrokerOrchestratorService] Failed to save user preference to DB. Storing in ContinuousLearningEngine fallback.",
        error,
      );
      await ContinuousLearningEngine.recordCorrection(
        feedbackFrom(data, feedbackText),
      );
    }
  }

  private async saveOrganizationalMemory(
    correctionType: "domain_knowledge",
    categoryOrKey: string,
    data: Record<string, unknown>,
    embedding: number[],
  ): Promise<void> {
    try {
      if (correctionType === "domain_knowledge") {
        await this.saveDomainKnowledge(categoryOrKey, data, embedding);
        return;
      }
    } catch (error: unknown) {
      console.warn(
        `[BrokerOrchestratorService] Failed to save ${correctionType} to DB.`,
        error,
      );
    }
  }

  private async saveDomainKnowledge(
    category: string,
    data: Record<string, unknown>,
    embedding: number[],
  ): Promise<void> {
    await this.memoryService.saveDomainKnowledge(category, data, embedding);
  }

  private async semanticContext(
    embedding: number[],
  ): Promise<OrchestratorContext> {
    try {
      const [preferences, domainKnowledge] = await Promise.all([
        this.memoryService.searchSimilarPreferences(embedding, 3),
        this.memoryService.searchSimilarKnowledge(embedding, 3),
      ]);
      return { preferences, domainKnowledge };
    } catch (error: unknown) {
      console.warn(
        "[BrokerOrchestratorService] Failed to search DB, using ContinuousLearningEngine fallback.",
        error,
      );
      return await semanticFallbackContext();
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
      return { preferences, domainKnowledge };
    } catch (error: unknown) {
      console.warn(
        "[BrokerOrchestratorService] Failed to get preferences from DB, using ContinuousLearningEngine fallback.",
        error,
      );
      return await categoryFallbackContext();
    }
  }
}

function keywordConflictReason(text: string): string {
  const normalized = text.toLowerCase();
  const splitPayment = normalized.includes("omitir split payment") ||
    normalized.includes("lc 214/2025") ||
    includesBoth(normalized, "split payment", "omitir");
  if (splitPayment) {
    return "Fiduciary Rule Conflict: LC 214/2025 requires mandatory retention and split payment processing.";
  }
  const contingency = normalized.includes("omit contingency provision") ||
    normalized.includes("omit contingency") ||
    normalized.includes("no provision") ||
    includesBoth(normalized, "contingency", "omitir");
  return contingency
    ? "Fiduciary Rule Conflict: Accounting norms require provisioning for probable contingencies."
    : "";
}

function includesBoth(text: string, left: string, right: string): boolean {
  return text.includes(left) && text.includes(right);
}

function markComplianceConflict(
  data: Record<string, unknown>,
  conflictReason: string,
): void {
  if (!conflictReason) return;
  console.warn(
    "\n⚠️ [COMPLIANCE_CONFLICT] User preference conflicts with compliance rules. HITL approval required.",
  );
  data.requiresHitlApproval = true;
  data.conflictReason = conflictReason;
}

function feedbackFrom(
  data: Record<string, unknown>,
  feedbackText?: string,
): Parameters<typeof ContinuousLearningEngine.recordCorrection>[0] {
  return {
    dealId: typeof data.dealId === "string" ? data.dealId : "unknown",
    variableName: isFeedbackVariable(data.variableName)
      ? data.variableName
      : "valuation",
    originalValue: typeof data.originalValue === "number"
      ? data.originalValue
      : 0,
    correctedValue: typeof data.correctedValue === "number"
      ? data.correctedValue
      : 0,
    reason: typeof data.reason === "string"
      ? data.reason
      : String(data.conflictReason || feedbackText || ""),
  };
}

async function semanticFallbackContext(): Promise<OrchestratorContext> {
  const history = await ContinuousLearningEngine.getFeedbackHistory();
  const preferences = history.map((entry) => ({
    userId: "default_user",
    preferences: entry,
    similarity: 1.0,
  }));
  return { preferences, domainKnowledge: [] };
}

async function categoryFallbackContext(): Promise<OrchestratorContext> {
  const history = await ContinuousLearningEngine.getFeedbackHistory();
  const preferences = history.reduce<Record<string, number>>(
    (result, entry) => {
      result[entry.variableName] = entry.correctedValue;
      return result;
    },
    {},
  );
  return { preferences, domainKnowledge: [] };
}
