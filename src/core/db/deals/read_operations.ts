import { DatabaseQueryResult } from "../DatabaseConnection.ts";

export interface DealListRecord {
  id: string;
  title: string;
  code: string;
  targetValuation: number | null;
  currency: string;
  createdAt: Date;
  status: string | null;
  type: string | null;
  strategy: string | null;
  targetId: string | null;
  targetName: string | null;
  targetCnpj: string | null;
  targetSector: string | null;
  targetOriginCountry: string | null;
  currentPhase: string | null;
  currentPhaseStatus: string | null;
  currentPhaseStartedAt: Date | null;
  currentPhaseComments: string | null;
}

export interface DealDetailRecord {
  id: string;
  title: string;
  code: string;
  targetValuation: number | null;
  currency: string;
  createdAt: Date;
  status: string | null;
  type: string | null;
  strategy: string | null;
  financial_structure: Record<string, unknown> | null;
  business: Record<string, unknown> | null;
  phase_history: Array<Record<string, unknown>>;
}

interface QueryExecutor {
  query<TRow>(
    text: string,
    params?: unknown[],
  ): Promise<DatabaseQueryResult<TRow>>;
}

const dealsQuery = `
  SELECT t.id, t.title, t.code, t.target_valuation AS "targetValuation",
    t.currency, t.created_at AS "createdAt", ts.name AS status,
    tt.name AS type, tstrat.name AS strategy, b.id AS "targetId",
    b.name AS "targetName", b.cnpj AS "targetCnpj",
    b.sector AS "targetSector", b.origin_country AS "targetOriginCountry",
    ph_latest.phase_name AS "currentPhase",
    ph_latest.status_name AS "currentPhaseStatus",
    ph_latest.started_at AS "currentPhaseStartedAt",
    ph_latest.comments AS "currentPhaseComments"
  FROM transaction t
  LEFT JOIN transaction_status ts ON t.transaction_status_id = ts.id
  LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.id
  LEFT JOIN transaction_strategy tstrat ON t.transaction_strategy_id = tstrat.id
  LEFT JOIN LATERAL (
    SELECT tbr.business_id FROM transaction_business_role tbr
    WHERE tbr.transaction_id = t.id AND tbr.role_name = 'TARGET' LIMIT 1
  ) target_role ON TRUE
  LEFT JOIN business b ON target_role.business_id = b.id
  LEFT JOIN LATERAL (
    SELECT p.name AS phase_name, ps.name AS status_name, ph.started_at, ph.comments
    FROM phase_history ph
    JOIN phase p ON ph.phase_id = p.id
    JOIN phase_status ps ON ph.phase_status_id = ps.id
    WHERE ph.transaction_id = t.id
    ORDER BY ph.started_at DESC, ph.created_at DESC LIMIT 1
  ) ph_latest ON TRUE`;

const transactionQuery = `
  SELECT t.id, t.title, t.code, t.target_valuation AS "targetValuation",
    t.currency, t.created_at AS "createdAt", ts.name AS status,
    tt.name AS type, tstrat.name AS strategy
  FROM transaction t
  LEFT JOIN transaction_status ts ON t.transaction_status_id = ts.id
  LEFT JOIN transaction_type tt ON t.transaction_type_id = tt.id
  LEFT JOIN transaction_strategy tstrat ON t.transaction_strategy_id = tstrat.id
  WHERE t.id = $1;`;

const financialStructureQuery = `
  SELECT id, cash_percentage AS "cashPercentage",
    equity_percentage AS "equityPercentage",
    earn_out_percentage AS "earnOutPercentage",
    escrow_percentage AS "escrowPercentage",
    total_valuation AS "totalValuation"
  FROM financial_structure WHERE transaction_id = $1;`;

const targetBusinessQuery = `
  SELECT b.id, b.name, b.cnpj, b.sector,
    b.origin_country AS "originCountry"
  FROM transaction_business_role tbr
  JOIN business b ON tbr.business_id = b.id
  WHERE tbr.transaction_id = $1 AND tbr.role_name = 'TARGET' LIMIT 1;`;

const phaseHistoryQuery = `
  SELECT ph.id, p.name AS "phaseName", ps.name AS "statusName",
    ph.started_at AS "startedAt", ph.completed_at AS "completedAt",
    ph.comments, ph.data
  FROM phase_history ph
  JOIN phase p ON ph.phase_id = p.id
  JOIN phase_status ps ON ph.phase_status_id = ps.id
  WHERE ph.transaction_id = $1
  ORDER BY ph.started_at ASC, ph.created_at ASC;`;

export async function listDealRecords(
  executor: QueryExecutor,
  options?: { activeOnly?: boolean },
): Promise<DealListRecord[]> {
  const activeFilter = options?.activeOnly ? " WHERE ts.name = 'Active'" : "";
  const result = await executor.query<DealListRecord>(
    `${dealsQuery}${activeFilter} ORDER BY t.created_at DESC;`,
  );
  return result.rows;
}

export async function findDealById(
  executor: QueryExecutor,
  id: string,
): Promise<DealDetailRecord | null> {
  const transaction = await findTransaction(executor, id);
  if (!transaction) return null;
  const [financial, business, phases] = await Promise.all([
    firstRow(executor, financialStructureQuery, id),
    firstRow(executor, targetBusinessQuery, id),
    allRows(executor, phaseHistoryQuery, id),
  ]);
  return {
    ...transaction,
    financial_structure: financial,
    business,
    phase_history: phases,
  };
}

type DealHeader = Omit<
  DealDetailRecord,
  "financial_structure" | "business" | "phase_history"
>;

async function findTransaction(
  executor: QueryExecutor,
  id: string,
): Promise<DealHeader | null> {
  const result = await executor.query<DealHeader>(transactionQuery, [id]);
  return result.rows[0] ?? null;
}

async function firstRow(
  executor: QueryExecutor,
  sql: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const result = await executor.query<Record<string, unknown>>(sql, [id]);
  return result.rows[0] ?? null;
}

async function allRows(
  executor: QueryExecutor,
  sql: string,
  id: string,
): Promise<Array<Record<string, unknown>>> {
  return (await executor.query<Record<string, unknown>>(sql, [id])).rows;
}
