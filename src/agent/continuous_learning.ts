// src/agent/continuous_learning.ts
import { DatabaseMemoryService } from "../core/db/memory_service.ts";
import { TransformersEngine } from "../engines/prediction/transformers.ts";

export interface HumanFeedback {
  dealId: string;
  variableName: "valuation" | "cashPercentage" | "nonCompeteMonths" | "earnOutTargetYears";
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
  public static async recordCorrection(feedback: Omit<HumanFeedback, "timestamp" | "embedding">): Promise<void> {
    const timestamp = new Date().toISOString();
    let embedding: number[] | undefined;

    // AC#1: Generate real embeddings using TransformersEngine
    try {
      embedding = await TransformersEngine.generateEmbedding(feedback.reason);
    } catch (err: any) {
      console.warn("[Continuous Learning] Failed to generate embedding for correction reason:", err.message);
    }

    const entry: HumanFeedback = {
      ...feedback,
      timestamp,
      embedding,
    };

    // AC#5: Compliance Conflict Check
    const normalizedReason = feedback.reason.toLowerCase();
    const isConflict = 
      normalizedReason.includes("omitir split payment") || 
      normalizedReason.includes("lc 214/2025") || 
      (normalizedReason.includes("split payment") && normalizedReason.includes("omitir")) ||
      normalizedReason.includes("omitir provisão de contingências") || 
      normalizedReason.includes("omitir contingência") || 
      normalizedReason.includes("sem provisão") || 
      (normalizedReason.includes("contingência") && normalizedReason.includes("omitir"));

    if (isConflict) {
      console.warn(`\n⚠️  [COMPLIANCE_CONFLICT] A preferência/correção fornecida pelo broker entra em conflito com regras fiduciárias e de conformidade legais.`);
    }

    // AC#2: Persist in PostgreSQL via DatabaseMemoryService
    const db = DatabaseMemoryService.getInstance();
    const key = `feedback:${feedback.dealId}:${feedback.variableName}:${timestamp}`;

    try {
      // Usamos saveUserPreferences mapeando o key exclusivo ao user_id do registro
      await db.saveUserPreferences(key, entry as any, embedding);
      console.log(`[Continuous Learning] Correction recorded and persisted in DB for Deal ${feedback.dealId}.`);
    } catch (err: any) {
      console.error("[Continuous Learning] Failed to persist feedback to database, using in-memory cache:", err.message);
      this.feedbackCache.push(entry);
    }
  }

  /**
   * Retrieves all corrections from PostgreSQL via DatabaseMemoryService.
   * Falls back to in-memory cache if the database is offline/unavailable.
   */
  public static async getFeedbackHistory(dealId?: string): Promise<HumanFeedback[]> {
    const db = DatabaseMemoryService.getInstance();
    try {
      // Busca no Postgres todos os registros que começam com 'feedback:'
      // Se dealId for especificado, filtramos por 'feedback:[dealId]:%'
      const pattern = dealId ? `feedback:${dealId}:%` : "feedback:%";
      
      const sql = `
        SELECT preferences 
        FROM user_preferences 
        WHERE user_id LIKE $1;
      `;
      const res = await db.executeRawQuery<{ preferences: any }>(sql, [pattern]);
      
      return res.map(row => {
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
      console.warn("[Continuous Learning] Failed to fetch feedback history from DB, falling back to cache:", err.message);
      
      if (dealId) {
        return this.feedbackCache.filter(h => h.dealId === dealId);
      }
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
