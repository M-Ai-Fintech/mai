import { DatabaseConnection } from "./DatabaseConnection.ts";
import { EmbeddedRow, rankBySimilarity } from "./similarity.ts";
import {
  knowledgeSearch,
  preferenceSearch,
  SimilaritySearchConfig,
  vdrSearch,
} from "./memory_search.ts";

export interface UserPreferencesRecord {
  readonly id: string;
  readonly userId: string;
  readonly preferences: Record<string, unknown>;
  readonly embedding?: number[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DomainKnowledgeRecord {
  readonly id: string;
  readonly category: string;
  readonly knowledge: Record<string, unknown>;
  readonly embedding?: number[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SimilarKnowledge {
  id: string;
  category: string;
  knowledge: Record<string, unknown>;
  similarity: number;
}

export interface SimilarPreference {
  id: string;
  userId: string;
  preferences: Record<string, unknown>;
  similarity: number;
}

export interface SimilarVdrChunk {
  documentName: string;
  chunkIndex: number;
  textChunk: string;
  similarity: number;
}

const DEFAULT_USER_PREFERENCES: Record<string, unknown> = {
  defaultValuationMethod: "DCF",
  riskAppetite: "Moderate",
  preferredJurisdiction: "Brazil",
};

export class DatabaseMemoryService extends DatabaseConnection {
  private static instance: DatabaseMemoryService | null = null;

  public static getInstance(): DatabaseMemoryService {
    if (!DatabaseMemoryService.instance) {
      DatabaseMemoryService.instance = new DatabaseMemoryService();
    }
    return DatabaseMemoryService.instance;
  }

  /**
   * Gets the consolidated preferences for a user or broker.
   */
  public async getUserPreferences(
    userId: string,
  ): Promise<Record<string, unknown>> {
    const sql = `
      SELECT preferences 
      FROM user_preferences 
      WHERE user_id = $1;
    `;
    const res = await this.query<{ preferences: Record<string, unknown> }>(
      sql,
      [userId],
    );
    return res.rows[0]?.preferences ?? { ...DEFAULT_USER_PREFERENCES };
  }

  /**
   * Saves or updates user preferences.
   */
  public async saveUserPreferences(
    userId: string,
    preferences: Record<string, unknown>,
    embedding?: number[],
  ): Promise<boolean> {
    const sql = `
      INSERT INTO user_preferences (user_id, preferences, embedding, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE 
      SET preferences = EXCLUDED.preferences,
          embedding = EXCLUDED.embedding,
          updated_at = CURRENT_TIMESTAMP;
    `;
    await this.query(sql, [
      userId,
      JSON.stringify(preferences),
      embedding ? JSON.stringify(embedding) : null,
    ]);
    return true;
  }

  /**
   * Queries JSONB using the GIN containment operator (@>).
   */
  public async searchDomainKnowledgeByJson(
    filter: Record<string, unknown>,
  ): Promise<DomainKnowledgeRecord[]> {
    const sql = `
      SELECT id, category, knowledge, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM domain_knowledge 
      WHERE knowledge @> $1::jsonb;
    `;
    const res = await this.query<DomainKnowledgeRecord>(sql, [
      JSON.stringify(filter),
    ]);
    return res.rows;
  }

  /**
   * Queries general domain knowledge by category.
   */
  public async getDomainKnowledge(
    category: string,
  ): Promise<DomainKnowledgeRecord[]> {
    const sql = `
      SELECT id, category, knowledge, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM domain_knowledge 
      WHERE category = $1;
    `;
    const res = await this.query<DomainKnowledgeRecord>(sql, [category]);
    return res.rows;
  }

  /**
   * Stores new domain knowledge for a specific category.
   */
  public async saveDomainKnowledge(
    category: string,
    knowledge: Record<string, unknown>,
    embedding?: number[],
  ): Promise<boolean> {
    const sql = `
      INSERT INTO domain_knowledge (category, knowledge, embedding)
      VALUES ($1, $2, $3);
    `;
    await this.query(sql, [
      category,
      JSON.stringify(knowledge),
      embedding ? JSON.stringify(embedding) : null,
    ]);
    return true;
  }

  /**
   * Runs a real pgvector query using cosine distance (<=>).
   * Finds domain knowledge and negotiation patterns near the supplied embedding.
   * Falls back to in-memory similarity if pgvector/Postgres fails.
   */
  public async searchSimilarKnowledge(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<SimilarKnowledge[]> {
    return await this.searchEmbeddings(knowledgeSearch(queryEmbedding, limit));
  }

  /**
   * Runs a real pgvector cosine-distance query on user_preferences.
   */
  public async searchSimilarPreferences(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<SimilarPreference[]> {
    return await this.searchEmbeddings(preferenceSearch(queryEmbedding, limit));
  }

  /**
   * Executes a generic parameterized SQL query against the real database.
   */
  public async executeRawQuery<T>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const res = await this.query<T>(sql, params);
    return res.rows;
  }

  /**
   * Saves a VDR document chunk to the database.
   */
  public async saveVdrDocumentChunk(
    dealId: string,
    documentName: string,
    chunkIndex: number,
    textChunk: string,
    embedding: number[],
  ): Promise<boolean> {
    const sql = `
      INSERT INTO vdr_document_chunks (deal_id, document_name, chunk_index, text_chunk, embedding)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await this.query(sql, [
      dealId,
      documentName,
      chunkIndex,
      textChunk,
      JSON.stringify(embedding),
    ]);
    return true;
  }

  /**
   * Busca chunks similares de um VDR para RAG.
   */
  public async searchVdrDocumentChunks(
    dealId: string,
    queryEmbedding: number[],
    limit = 5,
  ): Promise<SimilarVdrChunk[]> {
    return await this.searchEmbeddings(
      vdrSearch(dealId, queryEmbedding, limit),
    );
  }

  /**
   * Salva um checkpoint de fluxo de um agente
   */
  public async saveFlowCheckpoint(
    dealId: string,
    agentId: string,
    topic: string,
    state: Record<string, unknown>,
  ): Promise<boolean> {
    const sql = `
      INSERT INTO flow_checkpoints (transaction_id, agent_id, topic, state)
      VALUES ($1, $2, $3, $4);
    `;
    await this.query(sql, [
      dealId,
      agentId,
      topic,
      JSON.stringify(state),
    ]);
    return true;
  }

  /**
   * Gets an agent's latest checkpoint for a deal.
   */
  public async getLatestFlowCheckpoint(
    dealId: string,
    agentId: string,
  ): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT state
      FROM flow_checkpoints
      WHERE transaction_id = $1 AND agent_id = $2
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const res = await this.query<{ state: Record<string, unknown> }>(sql, [
      dealId,
      agentId,
    ]);
    if (res.rows.length > 0) {
      return res.rows[0].state;
    }
    return null;
  }

  private async searchEmbeddings<TRow extends EmbeddedRow, TResult>(
    config: SimilaritySearchConfig<TRow, TResult>,
  ): Promise<TResult[]> {
    try {
      const result = await this.query<TResult>(
        config.nativeSql,
        config.nativeParams,
      );
      return result.rows;
    } catch (error: unknown) {
      console.warn(`${config.warning}; running in-memory fallback:`, error);
      return await this.fallbackEmbeddings(config);
    }
  }

  private async fallbackEmbeddings<TRow extends EmbeddedRow, TResult>(
    config: SimilaritySearchConfig<TRow, TResult>,
  ): Promise<TResult[]> {
    const result = await this.query<TRow>(
      config.fallbackSql,
      config.fallbackParams,
    );
    return rankBySimilarity(
      result.rows,
      config.queryEmbedding,
      config.limit,
      config.map,
    );
  }
}
