// src/agent/continuous_learning.ts

export interface HumanFeedback {
  dealId: string;
  variableName: "valuation" | "cashPercentage" | "nonCompeteMonths" | "earnOutTargetYears";
  originalValue: number;
  correctedValue: number;
  reason: string;
  timestamp: string;
}

export class ContinuousLearningEngine {
  private static feedbackStoragePath = "./data/human_feedback.json";
  private static feedbackCache: HumanFeedback[] = [];

  /**
   * Records a manual adjustment made by the specialist.
   */
  public static async recordCorrection(feedback: Omit<HumanFeedback, "timestamp">): Promise<void> {
    const entry: HumanFeedback = {
      ...feedback,
      timestamp: new Date().toISOString(),
    };

    this.feedbackCache.push(entry);
    
    try {
      await Deno.mkdir("./data", { recursive: true });
      let existing: HumanFeedback[] = [];
      try {
        const text = await Deno.readTextFile(this.feedbackStoragePath);
        existing = JSON.parse(text);
      } catch (_e) {
        // File does not exist yet
      }
      existing.push(entry);
      await Deno.writeTextFile(this.feedbackStoragePath, JSON.stringify(existing, null, 2));
      console.log(`[Continuous Learning] Correction recorded for Deal ${feedback.dealId}.`);
    } catch (err) {
      console.error("Failed to persist continuous learning feedback:", err);
    }
  }

  /**
   * Retrieves all corrections.
   */
  public static async getFeedbackHistory(dealId?: string): Promise<HumanFeedback[]> {
    try {
      const text = await Deno.readTextFile(this.feedbackStoragePath);
      const history: HumanFeedback[] = JSON.parse(text);
      if (dealId) {
        return history.filter(h => h.dealId === dealId);
      }
      return history;
    } catch (_e) {
      return this.feedbackCache;
    }
  }

  /**
   * Generates dynamic system prompt guidelines based on historical feedback corrections.
   */
  public static async generateInContextLearningPrompt(dealId: string): Promise<string> {
    const historicalCorrections = await this.getFeedbackHistory(dealId);
    if (historicalCorrections.length === 0) {
      return "";
    }

    let promptSegment = "\n### APRENDIZADO CONTÍNUO (Diretrizes baseadas em correções do especialista):\n";
    promptSegment += "O especialista de M&A realizou ajustes anteriores que devem moldar suas recomendações:\n";
    
    historicalCorrections.forEach((c, idx) => {
      promptSegment += `${idx + 1}. No Deal '${c.dealId}', para o parâmetro '${c.variableName}': alterou de ${c.originalValue} para ${c.correctedValue}. Justificativa: "${c.reason}"\n`;
    });
    
    promptSegment += "Considere estas preferências nas próximas formulações e evite repetir desvios análogos.\n";
    return promptSegment;
  }
}
