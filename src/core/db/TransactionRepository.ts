import pg from "pg";
import { DatabaseMemoryService } from "./DatabaseMemoryService.ts";

export class TransactionRepository extends DatabaseMemoryService {
  private static repoInstance: TransactionRepository | null = null;

  public static getRepoInstance(): TransactionRepository {
    if (!TransactionRepository.repoInstance) {
      TransactionRepository.repoInstance = new TransactionRepository();
    }
    return TransactionRepository.repoInstance;
  }

  /**
   * Creates the business target, the transaction itself, and references them.
   * Also inserts an initial record in phase_history.
   */
  public async createDeal(
    title: string,
    code: string,
    typeName: string,
    strategyName: string,
    statusName: string,
    targetValuation: number
  ): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Resolve or insert transaction_type
      const typeRes = await client.query(
        `INSERT INTO transaction_type (name) 
         VALUES ($1) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [typeName]
      );
      const typeId = typeRes.rows[0].id;

      // 2. Resolve or insert transaction_strategy
      const strategyRes = await client.query(
        `INSERT INTO transaction_strategy (name) 
         VALUES ($1) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [strategyName]
      );
      const strategyId = strategyRes.rows[0].id;

      // 3. Resolve or insert transaction_status
      const statusRes = await client.query(
        `INSERT INTO transaction_status (name) 
         VALUES ($1) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [statusName]
      );
      const statusId = statusRes.rows[0].id;

      // 4. Create the business target
      const businessRes = await client.query(
        `INSERT INTO business (name) 
         VALUES ($1) 
         RETURNING id`,
        [title]
      );
      const businessId = businessRes.rows[0].id;

      // 5. Create the transaction itself
      const transactionRes = await client.query(
        `INSERT INTO transaction (
          title, code, transaction_type_id, transaction_strategy_id, transaction_status_id, target_valuation
         ) VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id`,
        [title, code, typeId, strategyId, statusId, targetValuation]
      );
      const transactionId = transactionRes.rows[0].id;

      // 6. Reference them in transaction_business_role (role_name = 'TARGET')
      await client.query(
        `INSERT INTO transaction_business_role (transaction_id, business_id, role_name) 
         VALUES ($1, $2, 'TARGET')`,
        [transactionId, businessId]
      );

      // 7. Resolve Sourcing & KYB phase ID
      const phaseRes = await client.query(
        `SELECT id FROM phase WHERE name = $1`,
        ["Sourcing & KYB"]
      );
      let phaseId;
      if (phaseRes.rows.length > 0) {
        phaseId = phaseRes.rows[0].id;
      } else {
        const maxOrderRes = await client.query(
          `SELECT COALESCE(MAX(stage_order), 0) as max_order FROM phase`
        );
        const nextOrder = (maxOrderRes.rows[0]?.max_order || 0) + 1;
        const insertRes = await client.query(
          `INSERT INTO phase (name, stage_order) VALUES ($1, $2) RETURNING id`,
          ["Sourcing & KYB", nextOrder]
        );
        phaseId = insertRes.rows[0].id;
      }

      // 8. Resolve In Progress phase_status ID
      const phaseStatusRes = await client.query(
        `SELECT id FROM phase_status WHERE name = $1`,
        ["In Progress"]
      );
      let phaseStatusId;
      if (phaseStatusRes.rows.length > 0) {
        phaseStatusId = phaseStatusRes.rows[0].id;
      } else {
        const insertRes = await client.query(
          `INSERT INTO phase_status (name) VALUES ($1) RETURNING id`,
          ["In Progress"]
        );
        phaseStatusId = insertRes.rows[0].id;
      }

      // 9. Insert initial phase history record
      await client.query(
        `INSERT INTO phase_history (transaction_id, phase_id, phase_status_id, data, started_at) 
         VALUES ($1, $2, $3, '{}'::jsonb, CURRENT_TIMESTAMP)`,
        [transactionId, phaseId, phaseStatusId]
      );

      await client.query("COMMIT");
      return transactionId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all deals with status, target info, and current phase for the Kanban dashboard.
   */
  public async getDeals(options?: { activeOnly?: boolean }): Promise<any[]> {
    let sql = `
      SELECT 
        t.id,
        t.title,
        t.code,
        t.target_valuation AS "targetValuation",
        t.currency,
        t.created_at AS "createdAt",
        ts.name AS status,
        tt.name AS type,
        tstrat.name AS strategy,
        b.id AS "targetId",
        b.name AS "targetName",
        b.cnpj AS "targetCnpj",
        b.sector AS "targetSector",
        b.origin_country AS "targetOriginCountry",
        ph_latest.phase_name AS "currentPhase",
        ph_latest.status_name AS "currentPhaseStatus",
        ph_latest.started_at AS "currentPhaseStartedAt",
        ph_latest.comments AS "currentPhaseComments"
      FROM transaction t
      LEFT JOIN transaction_status ts ON t.transaction_status_id = ts.id
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.id
      LEFT JOIN transaction_strategy tstrat ON t.transaction_strategy_id = tstrat.id
      LEFT JOIN LATERAL (
        SELECT tbr.business_id 
        FROM transaction_business_role tbr
        WHERE tbr.transaction_id = t.id AND tbr.role_name = 'TARGET'
        LIMIT 1
      ) target_role ON TRUE
      LEFT JOIN business b ON target_role.business_id = b.id
      LEFT JOIN LATERAL (
        SELECT p.name AS phase_name, ps.name AS status_name, ph.started_at, ph.comments
        FROM phase_history ph
        JOIN phase p ON ph.phase_id = p.id
        JOIN phase_status ps ON ph.phase_status_id = ps.id
        WHERE ph.transaction_id = t.id
        ORDER BY ph.started_at DESC, ph.created_at DESC
        LIMIT 1
      ) ph_latest ON TRUE
    `;

    const conditions: string[] = [];
    if (options?.activeOnly) {
      conditions.push(`ts.name = 'Active'`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY t.created_at DESC;`;

    const res = await this.query(sql);
    return res.rows;
  }

  /**
   * Returns transaction, its related financial_structure, business, and phase_history.
   */
  public async getDealById(id: string): Promise<any | null> {
    const txSql = `
      SELECT 
        t.id,
        t.title,
        t.code,
        t.target_valuation AS "targetValuation",
        t.currency,
        t.created_at AS "createdAt",
        ts.name AS status,
        tt.name AS type,
        tstrat.name AS strategy
      FROM transaction t
      LEFT JOIN transaction_status ts ON t.transaction_status_id = ts.id
      LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.id
      LEFT JOIN transaction_strategy tstrat ON t.transaction_strategy_id = tstrat.id
      WHERE t.id = $1;
    `;
    const txRes = await this.query(txSql, [id]);
    if (txRes.rows.length === 0) {
      return null;
    }
    const transaction = txRes.rows[0];

    // Get financial_structure
    const fsSql = `
      SELECT 
        id,
        cash_percentage AS "cashPercentage",
        equity_percentage AS "equityPercentage",
        earn_out_percentage AS "earnOutPercentage",
        escrow_percentage AS "escrowPercentage",
        total_valuation AS "totalValuation"
      FROM financial_structure
      WHERE transaction_id = $1;
    `;
    const fsRes = await this.query(fsSql, [id]);
    const financialStructure = fsRes.rows.length > 0 ? fsRes.rows[0] : null;

    // Get business
    const bizSql = `
      SELECT 
        b.id,
        b.name,
        b.cnpj,
        b.sector,
        b.origin_country AS "originCountry"
      FROM transaction_business_role tbr
      JOIN business b ON tbr.business_id = b.id
      WHERE tbr.transaction_id = $1 AND tbr.role_name = 'TARGET'
      LIMIT 1;
    `;
    const bizRes = await this.query(bizSql, [id]);
    const business = bizRes.rows.length > 0 ? bizRes.rows[0] : null;

    // Get phase_history
    const phSql = `
      SELECT 
        ph.id,
        p.name AS "phaseName",
        ps.name AS "statusName",
        ph.started_at AS "startedAt",
        ph.completed_at AS "completedAt",
        ph.comments,
        ph.data
      FROM phase_history ph
      JOIN phase p ON ph.phase_id = p.id
      JOIN phase_status ps ON ph.phase_status_id = ps.id
      WHERE ph.transaction_id = $1
      ORDER BY ph.started_at ASC, ph.created_at ASC;
    `;
    const phRes = await this.query(phSql, [id]);
    const phaseHistory = phRes.rows;

    return {
      ...transaction,
      financial_structure: financialStructure,
      business,
      phase_history: phaseHistory
    };
  }

  /**
   * Inserts a new record in phase_history.
   */
  public async updateDealPhase(
    dealId: string,
    phaseName: string,
    statusName: string,
    comments?: string,
    data?: any
  ): Promise<any> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Resolve phaseId (inserting if not found)
      const phaseRes = await client.query(
        `SELECT id FROM phase WHERE name = $1`,
        [phaseName]
      );
      let phaseId;
      if (phaseRes.rows.length > 0) {
        phaseId = phaseRes.rows[0].id;
      } else {
        const maxOrderRes = await client.query(
          `SELECT COALESCE(MAX(stage_order), 0) as max_order FROM phase`
        );
        const nextOrder = (maxOrderRes.rows[0]?.max_order || 0) + 1;
        const insertRes = await client.query(
          `INSERT INTO phase (name, stage_order) VALUES ($1, $2) RETURNING id`,
          [phaseName, nextOrder]
        );
        phaseId = insertRes.rows[0].id;
      }

      // 2. Resolve statusId (inserting if not found)
      const statusRes = await client.query(
        `SELECT id FROM phase_status WHERE name = $1`,
        [statusName]
      );
      let statusId;
      if (statusRes.rows.length > 0) {
        statusId = statusRes.rows[0].id;
      } else {
        const insertRes = await client.query(
          `INSERT INTO phase_status (name) VALUES ($1) RETURNING id`,
          [statusName]
        );
        statusId = insertRes.rows[0].id;
      }

      // 3. Mark previous phases as completed
      await client.query(
        `UPDATE phase_history 
         SET completed_at = CURRENT_TIMESTAMP 
         WHERE transaction_id = $1 AND completed_at IS NULL`,
        [dealId]
      );

      // 4. Insert new phase history record
      const insertSql = `
        INSERT INTO phase_history (transaction_id, phase_id, phase_status_id, comments, data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, transaction_id AS "transactionId", phase_id AS "phaseId", phase_status_id AS "phaseStatusId", comments, data, started_at AS "startedAt";
      `;
      const insertRes = await client.query(insertSql, [
        dealId,
        phaseId,
        statusId,
        comments || null,
        data ? JSON.stringify(data) : JSON.stringify({})
      ]);

      await client.query("COMMIT");
      return insertRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
