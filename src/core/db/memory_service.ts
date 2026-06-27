// src/core/db/memory_service.ts

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
 * Adaptador de mock simulando a conexão com o banco de dados PostgreSQL.
 * Projetado para ser facilmente substituído por um pool real (ex: Deno Postgres ou Vertex AI DB adapter) na fase GCP Enterprise.
 */
class PostgresQueryAdapter {
  private inMemoryUserPreferences: Map<string, UserPreferencesRecord> = new Map();
  private inMemoryDomainKnowledge: Map<string, DomainKnowledgeRecord[]> = new Map();
  private inMemoryCompanyCulture: Map<string, CompanyCultureMemoryRecord[]> = new Map();

  constructor(private readonly connectionString: string) {}

  public async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    // Simula latência de rede / banco de dados
    await Promise.resolve();

    // Log simulado de execução SQL para propósitos de auditoria e depuração
    if (Deno.env.get("DEBUG_SQL") === "true") {
      console.log(`[PostgresQueryAdapter] Executando SQL em ${this.connectionString}:`, sql, params);
    }

    return [];
  }

  // Métodos auxiliares de armazenamento em memória para simular persistência consistente
  public setPreference(userId: string, record: UserPreferencesRecord): void {
    this.inMemoryUserPreferences.set(userId, record);
  }

  public getPreference(userId: string): UserPreferencesRecord | undefined {
    return this.inMemoryUserPreferences.get(userId);
  }

  public addDomainKnowledge(category: string, record: DomainKnowledgeRecord): void {
    const list = this.inMemoryDomainKnowledge.get(category) ?? [];
    list.push(record);
    this.inMemoryDomainKnowledge.set(category, list);
  }

  public getDomainKnowledge(category: string): DomainKnowledgeRecord[] {
    return this.inMemoryDomainKnowledge.get(category) ?? [];
  }

  public addCompanyCulture(businessId: string, record: CompanyCultureMemoryRecord): void {
    const list = this.inMemoryCompanyCulture.get(businessId) ?? [];
    list.push(record);
    this.inMemoryCompanyCulture.set(businessId, list);
  }

  public getCompanyCulture(businessId: string): CompanyCultureMemoryRecord[] {
    return this.inMemoryCompanyCulture.get(businessId) ?? [];
  }
}

/**
 * Serviço autônomo encarregado de ler e gravar as preferências do usuário,
 * conhecimento de domínio e cultura no banco de dados PostgreSQL.
 * Segrega o Domain Knowledge das User Preferences, mantendo total independência da tabela operacional phase_history.
 */
export class DatabaseMemoryService {
  private readonly db: PostgresQueryAdapter;

  constructor(connectionString = "postgres://ma_broker:secret@localhost:5432/ma_database") {
    this.db = new PostgresQueryAdapter(connectionString);
  }

  /**
   * Obtém as preferências consolidadas de um usuário ou broker.
   */
  public async getUserPreferences(userId: string): Promise<Record<string, unknown>> {
    const sql = `
      SELECT id, user_id, preferences, created_at, updated_at 
      FROM user_preferences 
      WHERE user_id = $1;
    `;
    await this.db.query(sql, [userId]);

    const cached = this.db.getPreference(userId);
    if (cached) {
      return cached.preferences;
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
   * Suporta o armazenamento opcional de embeddings para o futuro pg_vector.
   */
  public async saveUserPreferences(
    userId: string,
    preferences: Record<string, unknown>,
    embedding?: number[],
  ): Promise<boolean> {
    const sql = `
      INSERT INTO user_preferences (id, user_id, preferences, embedding, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE 
      SET preferences = EXCLUDED.preferences,
          embedding = EXCLUDED.embedding,
          updated_at = CURRENT_TIMESTAMP;
    `;
    await this.db.query(sql, [userId, JSON.stringify(preferences), embedding ?? null]);

    this.db.setPreference(userId, {
      id: crypto.randomUUID(),
      userId,
      preferences,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Consulta o conhecimento de domínio geral cadastrado por categoria.
   */
  public async getDomainKnowledge(category: string): Promise<DomainKnowledgeRecord[]> {
    const sql = `
      SELECT id, category, knowledge, created_at, updated_at 
      FROM domain_knowledge 
      WHERE category = $1;
    `;
    await this.db.query(sql, [category]);

    const records = this.db.getDomainKnowledge(category);
    if (records.length > 0) {
      return records;
    }

    // Dados base simulados de Domain Knowledge de M&A
    return [
      {
        id: crypto.randomUUID(),
        category,
        knowledge: {
          clauses: ["Change of Control", "Drag-along", "Tag-along", "Non-compete"],
          standardMultipliers: { ebitdaMin: 5, ebitdaMax: 12 },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
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
      INSERT INTO domain_knowledge (id, category, knowledge, embedding, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `;
    await this.db.query(sql, [category, JSON.stringify(knowledge), embedding ?? null]);

    this.db.addDomainKnowledge(category, {
      id: crypto.randomUUID(),
      category,
      knowledge,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Consulta a memória da cultura organizacional de uma empresa alvo (business_id).
   */
  public async getCompanyCultureMemory(businessId: string): Promise<CompanyCultureMemoryRecord[]> {
    const sql = `
      SELECT id, business_id, culture_data, created_at, updated_at 
      FROM company_culture_memory 
      WHERE business_id = $1;
    `;
    await this.db.query(sql, [businessId]);

    const records = this.db.getCompanyCulture(businessId);
    if (records.length > 0) {
      return records;
    }

    // Retorno simulado base
    return [
      {
        id: crypto.randomUUID(),
        businessId,
        cultureData: {
          managementStyle: "Hierarchical",
          negotiationFlexibility: "High",
          integrationChallenges: ["Legacy IT systems", "Traditional corporate governance"],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
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
      INSERT INTO company_culture_memory (id, business_id, culture_data, embedding, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `;
    await this.db.query(sql, [businessId, JSON.stringify(cultureData), embedding ?? null]);

    this.db.addCompanyCulture(businessId, {
      id: crypto.randomUUID(),
      businessId,
      cultureData,
      embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Simulação da futura consulta vetorial (pg_vector) utilizando a distância de cosseno (<=>).
   * Irá localizar conhecimentos de domínio e padrões de negociação próximos ao embedding fornecido.
   */
  public async searchSimilarKnowledge(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<Array<{ id: string; category: string; knowledge: Record<string, unknown>; similarity: number }>> {
    // Exemplo da estrutura da query com pg_vector
    const sql = `
      SELECT id, category, knowledge, 1 - (embedding <=> $1) AS similarity
      FROM domain_knowledge
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1
      LIMIT $2;
    `;
    await this.db.query(sql, [queryEmbedding, limit]);

    // Simulação do resultado de busca vetorial
    return [
      {
        id: crypto.randomUUID(),
        category: "Valuation & Earn-out",
        knowledge: {
          recommendation: "Estruturar earn-outs vinculados ao EBITDA futuro para mitigar fadiga de negociação.",
        },
        similarity: 0.942,
      },
    ];
  }
}
