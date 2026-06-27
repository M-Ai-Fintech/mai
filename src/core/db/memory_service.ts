// src/core/db/memory_service.ts
import pg from "pg";

/**
 * Interface representando o formato das preferências do usuário no banco.
 */
export interface UserPreferencesRecord {
  readonly id: string;
  readonly userId: string;
  readonly preferences: Record<string, unknown>;
  readonly embedding?: number[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Interface representando o formato do conhecimento de domínio no banco.
 */
export interface DomainKnowledgeRecord {
  readonly id: string;
  readonly category: string;
  readonly knowledge: Record<string, unknown>;
  readonly embedding?: number[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Interface representando a memória da cultura organizacional no banco.
 */
export interface CompanyCultureMemoryRecord {
  readonly id: string;
  readonly businessId: string;
  readonly cultureData: Record<string, unknown>;
  readonly embedding?: number[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Adaptador de conexão real com o banco de dados PostgreSQL usando pool de conexões.
 */
class PostgresQueryAdapter {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
    });
  }

  /**
   * Executa uma consulta SQL parametrizada no pool do PostgreSQL.
   */
  public async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(sql, params);
      return res.rows as T[];
    } finally {
      client.release();
    }
  }

  /**
   * Fecha todas as conexões ativas no pool.
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Serviço autônomo encarregado de ler e gravar as preferências do usuário,
 * conhecimento de domínio e cultura diretamente no banco de dados PostgreSQL real.
 * Segrega o Domain Knowledge das User Preferences de forma estritamente relacional.
 */
export class DatabaseMemoryService {
  private readonly db: PostgresQueryAdapter;

  constructor(connectionString = Deno.env.get("DATABASE_URL") || "postgres://ma_broker:secret@localhost:5432/ma_database") {
    this.db = new PostgresQueryAdapter(connectionString);
  }

  /**
   * Obtém as preferências consolidadas de um usuário ou broker no banco de dados.
   */
  public async getUserPreferences(userId: string): Promise<Record<string, unknown>> {
    const sql = `
      SELECT preferences 
      FROM user_preferences 
      WHERE user_id = $1;
    `;
    const rows = await this.db.query<{ preferences: Record<string, unknown> }>(sql, [userId]);
    if (rows.length > 0) {
      return rows[0].preferences;
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
    await this.db.query(sql, [userId, JSON.stringify(preferences), embedding ?? null]);
    return true;
  }

  /**
   * Consulta o conhecimento de domínio geral cadastrado por categoria.
   */
  public async getDomainKnowledge(category: string): Promise<DomainKnowledgeRecord[]> {
    const sql = `
      SELECT id, category, knowledge, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM domain_knowledge 
      WHERE category = $1;
    `;
    return await this.db.query<DomainKnowledgeRecord>(sql, [category]);
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
    await this.db.query(sql, [category, JSON.stringify(knowledge), embedding ?? null]);
    return true;
  }

  /**
   * Consulta a memória da cultura organizacional de uma empresa alvo (business_id).
   */
  public async getCompanyCultureMemory(businessId: string): Promise<CompanyCultureMemoryRecord[]> {
    const sql = `
      SELECT id, business_id AS "businessId", culture_data AS "cultureData", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM company_culture_memory 
      WHERE business_id = $1;
    `;
    return await this.db.query<CompanyCultureMemoryRecord>(sql, [businessId]);
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
    await this.db.query(sql, [businessId, JSON.stringify(cultureData), embedding ?? null]);
    return true;
  }

  /**
   * Consulta vetorial real (pg_vector) utilizando a distância de cosseno (<=>).
   * Localiza conhecimentos de domínio e padrões de negociação próximos ao embedding fornecido.
   */
  public async searchSimilarKnowledge(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<Array<{ id: string; category: string; knowledge: Record<string, unknown>; similarity: number }>> {
    const sql = `
      SELECT id, category, knowledge, 1 - (embedding <=> $1) AS similarity
      FROM domain_knowledge
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1
      LIMIT $2;
    `;
    return await this.db.query(sql, [queryEmbedding, limit]);
  }
}
