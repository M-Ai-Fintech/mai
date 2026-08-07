import type { TransactionHandle } from "../platform/persistence/v1.ts";
import type {
  ValuationApproval,
  ValuationComparison,
  ValuationInput,
  ValuationInvalidation,
  ValuationModel,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";
import type {
  ValuationComparisonId,
  ValuationInputId,
  ValuationModelId,
  ValuationResultId,
  ValuationScenarioId,
} from "./ids.ts";
import type { ValuationRepository } from "./repository_contract.ts";
import {
  rowComparison,
  rowInput,
  rowInvalidation,
  rowModel,
  rowResult,
  rowScenario,
} from "./repository_rows.ts";
import type { ValuationScope } from "./basis.ts";
import { ValuationError } from "./errors.ts";

export class PostgresValuationRepository implements ValuationRepository {
  async insertModel(
    transaction: TransactionHandle,
    model: ValuationModel,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO valuation.models (model_id, tenant_id, workspace_id, deal_id, model_version, state, payload, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        model.id,
        ...scopeValues(model.scope),
        model.version,
        model.state,
        JSON.stringify(model),
        model.createdAt,
        model.updatedAt,
      ],
    );
  }

  async findModel(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationModelId,
    version?: number,
  ): Promise<ValuationModel | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM valuation.models WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND model_id=$4${
        version === undefined
          ? " ORDER BY model_version DESC LIMIT 1"
          : " AND model_version=$5"
      }`,
      version === undefined
        ? [...scopeValues(scope), id]
        : [...scopeValues(scope), id, version],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowModel(result.rows[0].payload);
  }

  async insertScenario(
    transaction: TransactionHandle,
    scenario: ValuationScenario,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO valuation.scenarios (scenario_id, tenant_id, workspace_id, deal_id, aggregate_version, model_id, model_version, state, current_input_id, current_input_version, current_result_id, approved_result_id, payload, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        scenario.id,
        ...scopeValues(scenario.scope),
        scenario.version,
        scenario.modelId,
        scenario.modelVersion,
        scenario.state,
        scenario.currentInputId ?? null,
        scenario.currentInputVersion ?? null,
        scenario.currentResultId ?? null,
        scenario.approvedResultId ?? null,
        JSON.stringify(scenario),
        scenario.createdAt,
        scenario.updatedAt,
      ],
    );
  }

  async findScenario(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationScenarioId,
    forUpdate = false,
  ): Promise<ValuationScenario | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM valuation.scenarios WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND scenario_id=$4${
        forUpdate ? " FOR UPDATE" : ""
      }`,
      [...scopeValues(scope), id],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowScenario(result.rows[0].payload);
  }

  async updateScenario(
    transaction: TransactionHandle,
    scenario: ValuationScenario,
    expectedVersion: number,
  ): Promise<void> {
    const result = await transaction.query(
      `UPDATE valuation.scenarios SET aggregate_version=$5, state=$6, current_input_id=$7, current_input_version=$8, current_result_id=$9, approved_result_id=$10, payload=$11, updated_at=$12
       WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND scenario_id=$4 AND aggregate_version=$13`,
      [
        ...scopeValues(scenario.scope),
        scenario.id,
        scenario.version,
        scenario.state,
        scenario.currentInputId ?? null,
        scenario.currentInputVersion ?? null,
        scenario.currentResultId ?? null,
        scenario.approvedResultId ?? null,
        JSON.stringify(scenario),
        scenario.updatedAt,
        expectedVersion,
      ],
    );
    if (result.rowCount === 1) return;
    throw new ValuationError(
      "VERSION_CONFLICT",
      `Valuation scenario "${scenario.id}" expected version "${expectedVersion}"; another writer changed the aggregate.`,
    );
  }

  async insertInput(
    transaction: TransactionHandle,
    input: ValuationInput,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO valuation.inputs (input_id, scenario_id, tenant_id, workspace_id, deal_id, input_version, scenario_version, model_id, model_version, basis_digest, payload, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        input.id,
        input.scenarioId,
        ...scopeValues(input.scope),
        input.version,
        input.scenarioVersion,
        input.modelId,
        input.modelVersion,
        input.basis.basisDigest,
        JSON.stringify(input),
        input.createdAt,
      ],
    );
  }

  async findInput(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationInputId,
    version?: number,
  ): Promise<ValuationInput | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM valuation.inputs WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND input_id=$4${
        version === undefined
          ? " ORDER BY input_version DESC LIMIT 1"
          : " AND input_version=$5"
      }`,
      version === undefined
        ? [...scopeValues(scope), id]
        : [...scopeValues(scope), id, version],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowInput(result.rows[0].payload);
  }

  async insertResult(
    transaction: TransactionHandle,
    result: ValuationResult,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO valuation.results (result_id, scenario_id, input_id, tenant_id, workspace_id, deal_id, scenario_version, input_version, model_id, model_version, basis_digest, payload, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        result.id,
        result.scenarioId,
        result.inputId,
        ...scopeValues(result.scope),
        result.scenarioVersion,
        result.inputVersion,
        result.modelId,
        result.modelVersion,
        result.basis.basisDigest,
        JSON.stringify(result),
        result.createdAt,
      ],
    );
  }

  async findResult(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationResultId,
  ): Promise<ValuationResult | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM valuation.results WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND result_id=$4`,
      [...scopeValues(scope), id],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowResult(result.rows[0].payload);
  }

  async insertApproval(
    transaction: TransactionHandle,
    approval: ValuationApproval,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO valuation.approvals (approval_id, scenario_id, result_id, tenant_id, workspace_id, deal_id, scenario_version, result_basis_digest, payload, approved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        approval.id,
        approval.scenarioId,
        approval.resultId,
        ...scopeValues(approval.scope),
        approval.scenarioVersion,
        approval.resultBasis.basisDigest,
        JSON.stringify(approval),
        approval.approvedAt,
      ],
    );
  }

  async insertInvalidation(
    transaction: TransactionHandle,
    invalidation: ValuationInvalidation,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO valuation.invalidations (invalidation_id, scenario_id, result_id, tenant_id, workspace_id, deal_id, scenario_version, invalidation_kind, reason, payload, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        invalidation.id,
        invalidation.scenarioId,
        invalidation.resultId ?? null,
        ...scopeValues(invalidation.scope),
        invalidation.scenarioVersion,
        invalidation.kind,
        invalidation.reason,
        JSON.stringify(invalidation),
        invalidation.createdAt,
      ],
    );
  }

  async listInvalidations(
    transaction: TransactionHandle,
    scope: ValuationScope,
    scenarioId: ValuationScenarioId,
  ): Promise<ValuationInvalidation[]> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM valuation.invalidations WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND scenario_id=$4 ORDER BY created_at, invalidation_id`,
      [...scopeValues(scope), scenarioId],
    );
    return result.rows.map((row) => rowInvalidation(row.payload));
  }

  async insertComparison(
    transaction: TransactionHandle,
    comparison: ValuationComparison,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO valuation.comparisons (comparison_id, tenant_id, workspace_id, deal_id, projection_version, payload, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        comparison.id,
        ...scopeValues(comparison.scope),
        comparison.projectionVersion,
        JSON.stringify(comparison),
        comparison.createdAt,
      ],
    );
  }

  async findComparison(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationComparisonId,
  ): Promise<ValuationComparison | undefined> {
    const result = await transaction.query<{ payload: unknown }>(
      `SELECT payload FROM valuation.comparisons WHERE tenant_id=$1 AND workspace_id=$2 AND deal_id=$3 AND comparison_id=$4`,
      [...scopeValues(scope), id],
    );
    return result.rows[0] === undefined
      ? undefined
      : rowComparison(result.rows[0].payload);
  }
}

function scopeValues(scope: ValuationScope): string[] {
  return [scope.tenantId, scope.workspaceId, scope.dealId];
}
