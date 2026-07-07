// src/agent/agents/broker-orchestrator/index.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import * as tools from "./tools/index.ts";
import { DatabaseMemoryService } from "../../../core/db/memory_service.ts";
import { TransformersEngine } from "../../../engines/prediction/transformers.ts";
import { ContinuousLearningEngine } from "../../continuous_learning.ts";

const instructions = Deno.readTextFileSync(
  new URL("./instructions.md", import.meta.url)
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
    this.memoryService = new DatabaseMemoryService();
  }

  /**
   * Intercepta uma correção do usuário e persiste de forma segregada no
   * Database Memory Service: Domain Knowledge vs. User Preferences.
   */
  public async processUserCorrection(
    userId: string,
    correctionType: "domain_knowledge" | "user_preference" | "company_culture",
    categoryOrKey: string,
    data: Record<string, unknown>,
    feedbackText?: string,
  ): Promise<{ success: boolean; conflict: boolean; conflictReason?: string }> {
    const textToEmbed = feedbackText || JSON.stringify(data);
    const embedding = await TransformersEngine.generateEmbedding(textToEmbed);
    let conflict = false;
    let conflictReason = "";

    if (correctionType === "user_preference") {
      // 1. Live keyword/semantic checks
      const normalizedText = textToEmbed.toLowerCase();
      if (
        normalizedText.includes("omitir split payment") || 
        normalizedText.includes("lc 214/2025") || 
        (normalizedText.includes("split payment") && normalizedText.includes("omitir"))
      ) {
        conflict = true;
        conflictReason = "Fiduciary Rule Conflict: LC 214/2025 requires mandatory retention and split payment processing.";
      } else if (
        normalizedText.includes("omitir provisão de contingências") || 
        normalizedText.includes("omitir contingência") || 
        normalizedText.includes("sem provisão") || 
        (normalizedText.includes("contingência") && normalizedText.includes("omitir"))
      ) {
        conflict = true;
        conflictReason = "Fiduciary Rule Conflict: Accounting norms require provisioning for probable contingencies.";
      }

      // 2. Vector search check against domain knowledge
      try {
        const conflicts = await this.memoryService.searchSimilarKnowledge(embedding, 1);
        if (conflicts.length > 0 && conflicts[0].similarity > 0.85) {
          conflict = true;
          conflictReason = `Conflito com regra fiduciária: ${conflicts[0].category}`;
        }
      } catch (err) {
        console.warn("[BrokerOrchestratorService] Vector similarity compliance check skipped (DB offline/empty).", err);
      }

      if (conflict) {
        console.warn(`\n⚠️  [COMPLIANCE_CONFLICT] A preferência do usuário conflita com as regras de conformidade. Requer aprovação HITL.`);
        data.requiresHitlApproval = true;
        data.conflictReason = conflictReason;
      }
      
      try {
        await this.memoryService.saveUserPreferences(userId, data, embedding);
      } catch (err) {
        console.warn("[BrokerOrchestratorService] Failed to save user preference to DB. Storing in ContinuousLearningEngine fallback.", err);
        await ContinuousLearningEngine.recordCorrection({
          dealId: (data.dealId as string) || "unknown",
          variableName: (data.variableName as any) || "valuation",
          originalValue: (data.originalValue as number) || 0,
          correctedValue: (data.correctedValue as number) || 0,
          reason: (data.reason as string) || String(data.conflictReason || feedbackText || ""),
        });
      }
    } else if (correctionType === "domain_knowledge") {
      try {
        await this.memoryService.saveDomainKnowledge(categoryOrKey, data, embedding);
      } catch (err) {
        console.warn("[BrokerOrchestratorService] Failed to save domain knowledge to DB.", err);
      }
    } else if (correctionType === "company_culture") {
      try {
        await this.memoryService.saveCompanyCultureMemory(categoryOrKey, data, embedding);
      } catch (err) {
        console.warn("[BrokerOrchestratorService] Failed to save company culture memory to DB.", err);
      }
    }
    return { success: true, conflict, conflictReason };
  }

  /**
   * Recupera o contexto completo do broker (preferências + conhecimento de domínio)
   * para ser injetado no prompt de qualquer agente antes da execução.
   */
  public async getOrchestratorContext(userId: string, domainCategory: string, queryEmbedding?: number[]) {
    let preferences: any = [];
    let domainKnowledge: any = [];

    if (queryEmbedding) {
      try {
        const [prefs, dk] = await Promise.all([
          this.memoryService.searchSimilarPreferences(queryEmbedding, 3),
          this.memoryService.searchSimilarKnowledge(queryEmbedding, 3),
        ]);
        preferences = prefs;
        domainKnowledge = dk;
      } catch (err) {
        console.warn("[BrokerOrchestratorService] Failed to search DB, using ContinuousLearningEngine fallback.", err);
        const history = await ContinuousLearningEngine.getFeedbackHistory();
        preferences = history.map(h => ({
          userId: "default_user",
          preferences: h,
          similarity: 1.0
        }));
      }
    } else {
      try {
        const [prefs, dk] = await Promise.all([
          this.memoryService.getUserPreferences(userId),
          this.memoryService.getDomainKnowledge(domainCategory),
        ]);
        preferences = prefs;
        domainKnowledge = dk;
      } catch (err) {
        console.warn("[BrokerOrchestratorService] Failed to get preferences from DB, using ContinuousLearningEngine fallback.", err);
        const history = await ContinuousLearningEngine.getFeedbackHistory();
        preferences = history.reduce((acc, h) => {
          acc[h.variableName] = h.correctedValue;
          return acc;
        }, {} as Record<string, any>);
      }
    }
    return { preferences, domainKnowledge };
  }
}
