// src/agent/continuous_learning.ts
import { DatabaseMemoryService } from "../core/db/memory_service.ts";
import { TransformersEngine } from "../engines/prediction/transformers.ts";

export interface HumanFeedback {
  dealId: string;
  variableName:
    | "valuation"
    | "cashPercentage"
    | "nonCompeteMonths"
    | "earnOutTargetYears";
  originalValue: number;
  correctedValue: number;
  reason: string;
  timestamp: string;
  embedding?: number[];
}

export class ContinuousLearningEngine {
  private static feedbackCache: HumanFeedback[] = [];

  /**
   * Records a manual adjustment made by the specialist.
   * Generates embedding for the feedback's reason and persists it in PostgreSQL
   * via DatabaseMemoryService under the key 'feedback:[dealId]:[variableName]:[timestamp]'.
   */
  public static async recordCorrection(
    feedback: Omit<HumanFeedback, "timestamp" | "embedding">,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    let embedding: number[] | undefined;

    // AC#1: Generate real embeddings using TransformersEngine
    try {
      embedding = await TransformersEngine.generateEmbedding(feedback.reason);
    } catch (err: any) {
      console.warn(
        "[Continuous Learning] Failed to generate embedding for correction reason:",
        err.message,
      );
    }

    const entry: HumanFeedback = {
      ...feedback,
      timestamp,
      embedding,
    };

    // AC#5: Compliance Conflict Check
    const normalizedReason = feedback.reason.toLowerCase();
    const isConflict = normalizedReason.includes("omit split payment") ||
      normalizedReason.includes("lc 214/2025") ||
      (normalizedReason.includes("split payment") &&
        normalizedReason.includes("omit")) ||
      normalizedReason.includes("omit contingency provision") ||
      normalizedReason.includes("omit contingency") ||
      normalizedReason.includes("without provision") ||
      (normalizedReason.includes("contingency") &&
        normalizedReason.includes("omit"));

    if (isConflict) {
      console.warn(
        `\n⚠️  [COMPLIANCE_CONFLICT] The preference/correction provided by the broker conflicts with fiduciary rules and legal compliance.`,
      );
    }

    // AC#2: Persist in PostgreSQL via DatabaseMemoryService
    const db = DatabaseMemoryService.getInstance();
    const key =
      `feedback:${feedback.dealId}:${feedback.variableName}:${timestamp}`;

    try {
      // We use saveUserPreferences mapping the exclusive key to the record's user_id
      await db.saveUserPreferences(key, entry as any, embedding);
      console.log(
        `[Continuous Learning] Correction recorded and persisted in DB for Deal ${feedback.dealId}.`,
      );
    } catch (err: any) {
      console.error(
        "[Continuous Learning] Failed to persist feedback to database, using in-memory cache:",
        err.message,
      );
      this.feedbackCache.push(entry);
    }
  }

  /**
   * Retrieves all corrections from PostgreSQL via DatabaseMemoryService.
   * Falls back to in-memory cache if the database is offline/unavailable.
   */
  public static async getFeedbackHistory(
    dealId?: string,
  ): Promise<HumanFeedback[]> {
    const db = DatabaseMemoryService.getInstance();
    try {
      // Search Postgres for all records starting with 'feedback:'
      // If dealId is specified, we filter by 'feedback:[dealId]:%'
      const pattern = dealId ? `feedback:${dealId}:%` : "feedback:%";

      const sql = `
        SELECT preferences 
        FROM user_preferences 
        WHERE user_id LIKE $1;
      `;
      const res = await db.executeRawQuery<{ preferences: any }>(sql, [
        pattern,
      ]);

      return res.map((row) => {
        const pref = row.preferences;
        return {
          dealId: pref.dealId,
          variableName: pref.variableName,
          originalValue: Number(pref.originalValue),
          correctedValue: Number(pref.correctedValue),
          reason: pref.reason,
          timestamp: pref.timestamp,
          embedding: pref.embedding,
        } as HumanFeedback;
      });
    } catch (err: any) {
      console.warn(
        "[Continuous Learning] Failed to fetch feedback history from DB, falling back to cache:",
        err.message,
      );

      if (dealId) {
        return this.feedbackCache.filter((h) => h.dealId === dealId);
      }
      return this.feedbackCache;
    }
  }

  /**
   * Generates dynamic system prompt guidelines based on historical feedback corrections.
   */
  public static async generateInContextLearningPrompt(
    dealId: string,
  ): Promise<string> {
    const historicalCorrections = await this.getFeedbackHistory(dealId);
    if (historicalCorrections.length === 0) {
      return "";
    }

    let promptSegment =
      "\n### CONTINUOUS LEARNING (Guidelines based on specialist corrections):\n";
    promptSegment +=
      "The M&A specialist made previous adjustments that should shape your recommendations:\n";

    historicalCorrections.forEach((c, idx) => {
      promptSegment += `${
        idx + 1
      }. In Deal '${c.dealId}', for the parameter '${c.variableName}': changed from ${c.originalValue} to ${c.correctedValue}. Justification: "${c.reason}"\n`;
    });

    promptSegment +=
      "Consider these preferences in future formulations and avoid repeating similar deviations.\n";
    return promptSegment;
  }
}
