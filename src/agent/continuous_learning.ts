// src/agent/continuous_learning.ts
import { DatabaseMemoryService } from "../core/db/memory_service.ts";
import { TransformersEngine } from "../engines/prediction/transformers.ts";
import { describeError } from "../shared/errors.ts";

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
    const embedding = await correctionEmbedding(feedback.reason);
    const entry: HumanFeedback = {
      ...feedback,
      timestamp,
      embedding,
    };
    warnAboutComplianceConflict(feedback.reason);
    await this.persistCorrection(entry);
  }

  /**
   * Retrieves all corrections from PostgreSQL via DatabaseMemoryService.
   * Falls back to in-memory cache if the database is offline/unavailable.
   */
  public static async getFeedbackHistory(
    dealId?: string,
  ): Promise<HumanFeedback[]> {
    try {
      return await queryFeedbackHistory(dealId);
    } catch (error: unknown) {
      console.warn(
        "[Continuous Learning] Failed to fetch feedback history from DB, falling back to cache:",
        describeError(error),
      );
      return dealId
        ? this.feedbackCache.filter((entry) => entry.dealId === dealId)
        : this.feedbackCache;
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

    return learningPrompt(historicalCorrections);
  }

  private static async persistCorrection(entry: HumanFeedback): Promise<void> {
    const key =
      `feedback:${entry.dealId}:${entry.variableName}:${entry.timestamp}`;
    try {
      await DatabaseMemoryService.getInstance().saveUserPreferences(
        key,
        { ...entry },
        entry.embedding,
      );
      console.log(
        `[Continuous Learning] Correction recorded and persisted in DB for Deal ${entry.dealId}.`,
      );
    } catch (error: unknown) {
      console.error(
        "[Continuous Learning] Failed to persist feedback to database, using in-memory cache:",
        describeError(error),
      );
      this.feedbackCache.push(entry);
    }
  }
}

async function correctionEmbedding(
  reason: string,
): Promise<number[] | undefined> {
  try {
    return await TransformersEngine.generateEmbedding(reason);
  } catch (error: unknown) {
    console.warn(
      "[Continuous Learning] Failed to generate embedding for correction reason:",
      describeError(error),
    );
    return undefined;
  }
}

function warnAboutComplianceConflict(reason: string): void {
  const normalized = reason.toLowerCase();
  const splitPayment = normalized.includes("omit split payment") ||
    normalized.includes("lc 214/2025") ||
    includesBoth(normalized, "split payment", "omit");
  const contingency = normalized.includes("omit contingency provision") ||
    normalized.includes("omit contingency") ||
    normalized.includes("without provision") ||
    includesBoth(normalized, "contingency", "omit");
  if (!splitPayment && !contingency) return;
  console.warn(
    "\n⚠️  [COMPLIANCE_CONFLICT] The preference/correction provided by the broker conflicts with fiduciary rules and legal compliance.",
  );
}

function includesBoth(text: string, left: string, right: string): boolean {
  return text.includes(left) && text.includes(right);
}

async function queryFeedbackHistory(
  dealId?: string,
): Promise<HumanFeedback[]> {
  const pattern = dealId ? `feedback:${dealId}:%` : "feedback:%";
  const sql = `
    SELECT preferences
    FROM user_preferences
    WHERE user_id LIKE $1;
  `;
  const rows = await DatabaseMemoryService.getInstance().executeRawQuery<
    { preferences: HumanFeedback }
  >(sql, [pattern]);
  return rows.map((row) => normalizedFeedback(row.preferences));
}

function normalizedFeedback(feedback: HumanFeedback): HumanFeedback {
  return {
    ...feedback,
    originalValue: Number(feedback.originalValue),
    correctedValue: Number(feedback.correctedValue),
  };
}

function learningPrompt(corrections: HumanFeedback[]): string {
  const heading =
    "\n### CONTINUOUS LEARNING (Guidelines based on specialist corrections):\n" +
    "The M&A specialist made previous adjustments that should shape your recommendations:\n";
  const entries = corrections.map((entry, index) =>
    `${
      index + 1
    }. In Deal '${entry.dealId}', for the parameter '${entry.variableName}': changed from ${entry.originalValue} to ${entry.correctedValue}. Justification: "${entry.reason}"\n`
  ).join("");
  return heading + entries +
    "Consider these preferences in future formulations and avoid repeating similar deviations.\n";
}
