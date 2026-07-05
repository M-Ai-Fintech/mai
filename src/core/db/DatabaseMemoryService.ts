import pg from "pg";

const { Pool } = pg;

export class DatabaseMemoryService {
  private pool: pg.Pool;

  constructor() {
    const connectionString =
      Deno.env.get("DATABASE_URL") ||
      "postgres://postgres:postgres@localhost:5432/mai";

    this.pool = new Pool({
      connectionString,
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
      return true;
    } catch (error) {
      console.error(
        "Failed to connect to the database:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * Executa uma query SQL com suporte a parâmetros parametrizados.
   */
  async query(text: string, params?: any[]) {
    return await this.pool.query(text, params);
  }

  /**
   * Encerra o pool de conexões com o banco.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
