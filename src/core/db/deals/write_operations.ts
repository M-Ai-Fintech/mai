import pg from "pg";

/**
 * Legacy SQL table compatibility evidence (MAI-72 / MAI-129):
 * Active domain APIs use Deal/DealId terminology while legacy Postgres tables
 * (`transaction`, `transaction_business_role`, `financial_structure`, `phase_history`)
 * remain physical SQL names until MAI-129 data migration.
 */

export interface PhaseTransitionRecord {
  id: string;
  dealId: string;
  phaseId: string;
  phaseStatusId: string;
  comments: string | null;
  data: Record<string, unknown>;
  startedAt: Date;
}

interface CreateDealInput {
  title: string;
  code: string;
  typeName: string;
  strategyName: string;
  statusName: string;
  targetValuation: number;
}

interface PhaseTransitionInput {
  dealId: string;
  phaseName: string;
  statusName: string;
  comments?: string;
  data?: Record<string, unknown>;
}

export function createDealTransaction(
  pool: pg.Pool,
  input: CreateDealInput,
): Promise<string> {
  return withTransaction(pool, (client) => createDealRecord(client, input));
}

export function transitionDealPhase(
  pool: pg.Pool,
  input: PhaseTransitionInput,
): Promise<PhaseTransitionRecord> {
  return withTransaction(pool, (client) => transitionRecord(client, input));
}

async function createDealRecord(
  client: pg.PoolClient,
  input: CreateDealInput,
): Promise<string> {
  const [typeId, strategyId, statusId] = await dealReferenceIds(client, input);
  const businessId = await insertBusiness(client, input.title);
  const dealId = await insertTransaction(
    client,
    input,
    typeId,
    strategyId,
    statusId,
  );
  await linkTargetBusiness(client, dealId, businessId);
  await insertInitialPhase(client, dealId);
  return dealId;
}

async function dealReferenceIds(
  client: pg.PoolClient,
  input: CreateDealInput,
): Promise<[string, string, string]> {
  return await Promise.all([
    upsertNamedId(client, "transaction_type", input.typeName),
    upsertNamedId(client, "transaction_strategy", input.strategyName),
    upsertNamedId(client, "transaction_status", input.statusName),
  ]);
}

async function transitionRecord(
  client: pg.PoolClient,
  input: PhaseTransitionInput,
): Promise<PhaseTransitionRecord> {
  const phaseId = await resolveOrderedPhase(client, input.phaseName);
  const statusId = await upsertNamedId(
    client,
    "phase_status",
    input.statusName,
  );
  await completeCurrentPhase(client, input.dealId);
  return await insertPhaseTransition(client, input, phaseId, statusId);
}

async function withTransaction<TResult>(
  pool: pg.Pool,
  operation: (client: pg.PoolClient) => Promise<TResult>,
): Promise<TResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertNamedId(
  client: pg.PoolClient,
  table:
    | "transaction_type"
    | "transaction_strategy"
    | "transaction_status"
    | "phase_status",
  name: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO ${table} (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name],
  );
  return result.rows[0].id;
}

async function insertBusiness(
  client: pg.PoolClient,
  title: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    "INSERT INTO business (name) VALUES ($1) RETURNING id",
    [title],
  );
  return result.rows[0].id;
}

async function insertTransaction(
  client: pg.PoolClient,
  input: CreateDealInput,
  typeId: string,
  strategyId: string,
  statusId: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO transaction (
       title, code, transaction_type_id, transaction_strategy_id,
       transaction_status_id, target_valuation
     ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    transactionValues(input, typeId, strategyId, statusId),
  );
  return result.rows[0].id;
}

function transactionValues(
  input: CreateDealInput,
  typeId: string,
  strategyId: string,
  statusId: string,
): unknown[] {
  return [
    input.title,
    input.code,
    typeId,
    strategyId,
    statusId,
    input.targetValuation,
  ];
}

function linkTargetBusiness(
  client: pg.PoolClient,
  dealId: string,
  businessId: string,
): Promise<pg.QueryResult> {
  return client.query(
    `INSERT INTO transaction_business_role
       (transaction_id, business_id, role_name) VALUES ($1, $2, 'TARGET')`,
    [dealId, businessId],
  );
}

async function insertInitialPhase(
  client: pg.PoolClient,
  dealId: string,
): Promise<void> {
  const phaseId = await resolveOrderedPhase(client, "Sourcing & KYB");
  const statusId = await upsertNamedId(client, "phase_status", "In Progress");
  await client.query(
    `INSERT INTO phase_history
       (transaction_id, phase_id, phase_status_id, data, started_at)
     VALUES ($1, $2, $3, '{}'::jsonb, CURRENT_TIMESTAMP)`,
    [dealId, phaseId, statusId],
  );
}

async function resolveOrderedPhase(
  client: pg.PoolClient,
  name: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    "SELECT id FROM phase WHERE name = $1",
    [name],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const order = await nextPhaseOrder(client);
  const inserted = await client.query<{ id: string }>(
    "INSERT INTO phase (name, stage_order) VALUES ($1, $2) RETURNING id",
    [name, order],
  );
  return inserted.rows[0].id;
}

async function nextPhaseOrder(client: pg.PoolClient): Promise<number> {
  const result = await client.query<{ max_order: number | null }>(
    "SELECT COALESCE(MAX(stage_order), 0) AS max_order FROM phase",
  );
  return (result.rows[0]?.max_order ?? 0) + 1;
}

function completeCurrentPhase(
  client: pg.PoolClient,
  dealId: string,
): Promise<pg.QueryResult> {
  return client.query(
    `UPDATE phase_history SET completed_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $1 AND completed_at IS NULL`,
    [dealId],
  );
}

async function insertPhaseTransition(
  client: pg.PoolClient,
  input: PhaseTransitionInput,
  phaseId: string,
  statusId: string,
): Promise<PhaseTransitionRecord> {
  const result = await client.query<PhaseTransitionRecord>(
    `INSERT INTO phase_history
       (transaction_id, phase_id, phase_status_id, comments, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, transaction_id AS "dealId",
       phase_id AS "phaseId", phase_status_id AS "phaseStatusId",
       comments, data, started_at AS "startedAt"`,
    transitionValues(input, phaseId, statusId),
  );
  return result.rows[0];
}

function transitionValues(
  input: PhaseTransitionInput,
  phaseId: string,
  statusId: string,
): unknown[] {
  return [
    input.dealId,
    phaseId,
    statusId,
    input.comments ?? null,
    JSON.stringify(input.data ?? {}),
  ];
}
