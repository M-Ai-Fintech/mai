import pg from "pg";

const { Pool } = pg;

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

export interface CompanyCultureMemoryRecord {
  readonly id: string;
  readonly businessId: string;
  readonly cultureData: Record<string, unknown>;
  readonly embedding?: number[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0.0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class DatabaseMemoryService {
  private static instance: DatabaseMemoryService | null = null;
  protected isDbAvailable: boolean | null = null;
  protected pool: pg.Pool;

  public static getInstance(): DatabaseMemoryService {
    if (!DatabaseMemoryService.instance) {
      DatabaseMemoryService.instance = new DatabaseMemoryService();
    }
    return DatabaseMemoryService.instance;
  }

  constructor(
    connectionString = Deno.env.get("DATABASE_URL") ||
      "postgres://postgres:postgres@localhost:5432/mai",
  ) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    });
    this.pool.on("error", (err) => {
      console.error(
        "Unexpected error on idle client in DatabaseMemoryService:",
        err.message,
      );
    });
  }

  /**
   * Conecta ao banco de dados e verifica a conectividade.
   * Não lança erro caso o banco esteja inacessível.
   */
  async connect(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      console.log("Database connected successfully.");
      client.release();
      this.isDbAvailable = true;
      return true;
    } catch (error) {
      console.error(
        "Failed to connect to the database:",
        error instanceof Error ? error.message : String(error),
      );
      this.isDbAvailable = false;
      return false;
    }
  }

  /**
   * Executa uma query SQL com suporte a parâmetros parametrizados.
   */
  async query(text: string, params?: any[], retries = 3): Promise<any> {
    if (this.isDbAvailable === false) {
      throw new Error("Database connection is unavailable (cached offline state).");
    }
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const result = await this.pool.query(text, params);
        this.isDbAvailable = true;
        return result;
      } catch (error: any) {
        // Códigos de erro transientes comuns do Postgres e falhas de rede (Node.js/pg)
        const isTransient = [
          "08000",
          "08003",
          "08006",
          "57P01",
          "ECONNRESET",
          "ECONNREFUSED",
        ].includes(error.code);
        if (error.code === "ECONNREFUSED") {
          this.isDbAvailable = false;
        }
        if (!isTransient || attempt === retries) {
          throw error;
        }
        attempt++;
        const delay = Math.min(
          1000 * Math.pow(2, attempt) + Math.random() * 1000,
          10000,
        );
        console.warn(
          `Query failed (code: ${error.code}), retrying in ${
            Math.round(delay)
          }ms... (Attempt ${attempt}/${retries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Encerra o pool de conexões com o banco.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Obtém as preferências consolidadas de um usuário ou broker no banco de dados.
   */
  public async getUserPreferences(
    userId: string,
  ): Promise<Record<string, unknown>> {
    const sql = `
      SELECT preferences 
      FROM user_preferences 
      WHERE user_id = $1;
    `;
    const res = await this.query(sql, [userId]);
    if (res.rows.length > 0) {
      return res.rows[0].preferences;
    }

    // Retorna preferências padrão se nenhum registro for encontrado
    return {
      defaultValuationMethod: "DCF",
      riskAppetite: "Moderate",
      preferredJurisdiction: "Brazil",
    };
  }

  /**
   * Salva ou atualiza as preferências do usuário no banco de dados.
   * Suporta o armazenamento de embeddings reais.
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
   * Consulta o conhecimento de domínio geral cadastrado por categoria.
   */
  /**
   * Consulta utilizando o operador de contenção GIN (@>) em JSONB.
   */
  public async searchDomainKnowledgeByJson(
    filter: Record<string, unknown>,
  ): Promise<DomainKnowledgeRecord[]> {
    const sql = `
      SELECT id, category, knowledge, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM domain_knowledge 
      WHERE knowledge @> $1::jsonb;
    `;
    const res = await this.query(sql, [JSON.stringify(filter)]);
    return res.rows as DomainKnowledgeRecord[];
  }

  /**
   * Consulta o conhecimento de domínio geral cadastrado por categoria.
   */
  public async getDomainKnowledge(
    category: string,
  ): Promise<DomainKnowledgeRecord[]> {
    const sql = `
      SELECT id, category, knowledge, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM domain_knowledge 
      WHERE category = $1;
    `;
    const res = await this.query(sql, [category]);
    return res.rows as DomainKnowledgeRecord[];
  }

  /**
   * Grava novo conhecimento de domínio associado a uma categoria específica.
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
   * Consulta a memória da cultura organizacional de uma empresa alvo (business_id).
   */
  public async getCompanyCultureMemory(
    businessId: string,
  ): Promise<CompanyCultureMemoryRecord[]> {
    const sql = `
      SELECT id, business_id AS "businessId", culture_data AS "cultureData", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM company_culture_memory 
      WHERE business_id = $1;
    `;
    const res = await this.query(sql, [businessId]);
    return res.rows as CompanyCultureMemoryRecord[];
  }

  /**
   * Grava dados de análise cultural sobre uma empresa.
   */
  public async saveCompanyCultureMemory(
    businessId: string,
    cultureData: Record<string, unknown>,
    embedding?: number[],
  ): Promise<boolean> {
    const sql = `
      INSERT INTO company_culture_memory (business_id, culture_data, embedding)
      VALUES ($1, $2, $3);
    `;
    await this.query(sql, [
      businessId,
      JSON.stringify(cultureData),
      embedding ? JSON.stringify(embedding) : null,
    ]);
    return true;
  }

  /**
   * Consulta vetorial real (pg_vector) utilizando a distância de cosseno (<=>).
   * Localiza conhecimentos de domínio e padrões de negociação próximos ao embedding fornecido.
   * Possui fallback em memória para similaridade se pgvector/Postgres falhar.
   */
  public async searchSimilarKnowledge(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<
    Array<
      {
        id: string;
        category: string;
        knowledge: Record<string, unknown>;
        similarity: number;
      }
    >
  > {
    try {
      const sql = `
        SELECT id, category, knowledge, 1 - (embedding <=> $1::vector) AS similarity
        FROM domain_knowledge
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2;
      `;
      const res = await this.query(sql, [
        JSON.stringify(queryEmbedding),
        limit,
      ]);
      return res.rows;
    } catch (error) {
      console.warn(
        "[DatabaseMemoryService] pgvector query failed, running in-memory similarity fallback:",
        error instanceof Error ? error.message : String(error),
      );

      const allKnowledgeSql = `
        SELECT id, category, knowledge, embedding
        FROM domain_knowledge
        WHERE embedding IS NOT NULL;
      `;
      const res = await this.query(allKnowledgeSql);
      const allRows = res.rows as Array<
        {
          id: string;
          category: string;
          knowledge: Record<string, any>;
          embedding: number[] | string;
        }
      >;

      const similarityList = allRows.map((row) => {
        let emb = row.embedding;
        if (typeof emb === "string") {
          if (emb.startsWith("[")) emb = JSON.parse(emb);
          else emb = emb.replace(/[{}]/g, "").split(",").map(Number);
        }
        const sim = cosineSimilarity(queryEmbedding, emb as number[]);
        return {
          id: row.id,
          category: row.category,
          knowledge: row.knowledge,
          similarity: sim,
        };
      });

      similarityList.sort((a, b) => b.similarity - a.similarity);
      return similarityList.slice(0, limit);
    }
  }

  /**
   * Consulta vetorial real (pg_vector) utilizando a distância de cosseno (<=>) em user_preferences.
   */
  public async searchSimilarPreferences(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<
    Array<
      {
        id: string;
        userId: string;
        preferences: Record<string, unknown>;
        similarity: number;
      }
    >
  > {
    try {
      const sql = `
        SELECT id, user_id AS "userId", preferences, 1 - (embedding <=> $1::vector) AS similarity
        FROM user_preferences
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2;
      `;
      const res = await this.query(sql, [
        JSON.stringify(queryEmbedding),
        limit,
      ]);
      return res.rows;
    } catch (error) {
      console.warn(
        "[DatabaseMemoryService] pgvector preferences search failed, running fallback:",
        error instanceof Error ? error.message : String(error),
      );

      const sql = `
        SELECT id, user_id AS "userId", preferences, embedding
        FROM user_preferences
        WHERE embedding IS NOT NULL;
      `;
      const res = await this.query(sql);
      const rows = res.rows as any[];
      const similarityList = rows.map((row) => {
        let emb = row.embedding;
        if (typeof emb === "string") {
          if (emb.startsWith("[")) emb = JSON.parse(emb);
          else emb = emb.replace(/[{}]/g, "").split(",").map(Number);
        }
        return {
          id: row.id,
          userId: row.userId,
          preferences: row.preferences,
          similarity: cosineSimilarity(queryEmbedding, emb as number[]),
        };
      });
      similarityList.sort((a, b) => b.similarity - a.similarity);
      return similarityList.slice(0, limit);
    }
  }

  /**
   * Consulta vetorial real (pg_vector) utilizando a distância de cosseno (<=>) em company_culture_memory.
   */
  public async searchSimilarCultureMemory(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<
    Array<
      {
        id: string;
        businessId: string;
        cultureData: Record<string, unknown>;
        similarity: number;
      }
    >
  > {
    try {
      const sql = `
        SELECT id, business_id AS "businessId", culture_data AS "cultureData", 1 - (embedding <=> $1::vector) AS similarity
        FROM company_culture_memory
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2;
      `;
      const res = await this.query(sql, [
        JSON.stringify(queryEmbedding),
        limit,
      ]);
      return res.rows;
    } catch (error) {
      console.warn(
        "[DatabaseMemoryService] pgvector culture search failed, running fallback:",
        error instanceof Error ? error.message : String(error),
      );

      const sql = `
        SELECT id, business_id AS "businessId", culture_data AS "cultureData", embedding
        FROM company_culture_memory
        WHERE embedding IS NOT NULL;
      `;
      const res = await this.query(sql);
      const rows = res.rows as any[];
      const similarityList = rows.map((row) => {
        let emb = row.embedding;
        if (typeof emb === "string") {
          if (emb.startsWith("[")) emb = JSON.parse(emb);
          else emb = emb.replace(/[{}]/g, "").split(",").map(Number);
        }
        return {
          id: row.id,
          businessId: row.businessId,
          cultureData: row.cultureData,
          similarity: cosineSimilarity(queryEmbedding, emb as number[]),
        };
      });
      similarityList.sort((a, b) => b.similarity - a.similarity);
      return similarityList.slice(0, limit);
    }
  }

  /**
   * Executa uma consulta SQL genérica parametrizada no banco real.
   */
  public async executeRawQuery<T>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const res = await this.query(sql, params as any[]);
    return res.rows as T[];
  }

  /**
   * Salva um chunk de documento do VDR no banco de dados.
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
  ): Promise<
    Array<
      {
        documentName: string;
        chunkIndex: number;
        textChunk: string;
        similarity: number;
      }
    >
  > {
    try {
      const sql = `
        SELECT document_name AS "documentName", chunk_index AS "chunkIndex", text_chunk AS "textChunk", 1 - (embedding <=> $1::vector) AS similarity
        FROM vdr_document_chunks
        WHERE deal_id = $2 AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $3;
      `;
      const res = await this.query(sql, [
        JSON.stringify(queryEmbedding),
        dealId,
        limit,
      ]);
      return res.rows;
    } catch (error) {
      console.warn(
        "[DatabaseMemoryService] pgvector VDR search failed, running fallback:",
        error instanceof Error ? error.message : String(error),
      );

      const sql = `
        SELECT document_name, chunk_index, text_chunk, embedding
        FROM vdr_document_chunks
        WHERE deal_id = $1 AND embedding IS NOT NULL;
      `;
      const res = await this.query(sql, [dealId]);
      const rows = res.rows as any[];
      const similarityList = rows.map((row) => {
        let emb = row.embedding;
        if (typeof emb === "string") {
          if (emb.startsWith("[")) emb = JSON.parse(emb);
          else emb = emb.replace(/[{}]/g, "").split(",").map(Number);
        }
        return {
          documentName: row.document_name,
          chunkIndex: row.chunk_index,
          textChunk: row.text_chunk,
          similarity: cosineSimilarity(queryEmbedding, emb as number[]),
        };
      });
      similarityList.sort((a, b) => b.similarity - a.similarity);
      return similarityList.slice(0, limit);
    }
  }

  /**
   * Salva um checkpoint de fluxo de um agente
   */
  public async saveFlowCheckpoint(
    transactionId: string,
    agentId: string,
    topic: string,
    state: Record<string, unknown>
  ): Promise<boolean> {
    const sql = `
      INSERT INTO flow_checkpoints (transaction_id, agent_id, topic, state)
      VALUES ($1, $2, $3, $4);
    `;
    await this.query(sql, [transactionId, agentId, topic, JSON.stringify(state)]);
    return true;
  }

  /**
   * Busca o último checkpoint de um agente em uma transação
   */
  public async getLatestFlowCheckpoint(
    transactionId: string,
    agentId: string
  ): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT state
      FROM flow_checkpoints
      WHERE transaction_id = $1 AND agent_id = $2
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const res = await this.query(sql, [transactionId, agentId]);
    if (res.rows && res.rows.length > 0) {
      return res.rows[0].state;
    }
    return null;
  }

}
