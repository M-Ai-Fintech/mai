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
  ValuationInputId,
  ValuationModelId,
  ValuationResultId,
  ValuationScenarioId,
} from "./ids.ts";
import type { ValuationScope } from "./basis.ts";

export interface ValuationRepository {
  insertModel(
    transaction: TransactionHandle,
    model: ValuationModel,
  ): Promise<void>;
  findModel(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationModelId,
    version?: number,
  ): Promise<ValuationModel | undefined>;
  insertScenario(
    transaction: TransactionHandle,
    scenario: ValuationScenario,
  ): Promise<void>;
  findScenario(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationScenarioId,
    forUpdate?: boolean,
  ): Promise<ValuationScenario | undefined>;
  updateScenario(
    transaction: TransactionHandle,
    scenario: ValuationScenario,
    expectedVersion: number,
  ): Promise<void>;
  insertInput(
    transaction: TransactionHandle,
    input: ValuationInput,
  ): Promise<void>;
  findInput(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationInputId,
    version?: number,
  ): Promise<ValuationInput | undefined>;
  insertResult(
    transaction: TransactionHandle,
    result: ValuationResult,
  ): Promise<void>;
  findResult(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: ValuationResultId,
  ): Promise<ValuationResult | undefined>;
  insertApproval(
    transaction: TransactionHandle,
    approval: ValuationApproval,
  ): Promise<void>;
  insertInvalidation(
    transaction: TransactionHandle,
    invalidation: ValuationInvalidation,
  ): Promise<void>;
  listInvalidations(
    transaction: TransactionHandle,
    scope: ValuationScope,
    scenarioId: ValuationScenarioId,
  ): Promise<ValuationInvalidation[]>;
  insertComparison(
    transaction: TransactionHandle,
    comparison: ValuationComparison,
  ): Promise<void>;
  findComparison(
    transaction: TransactionHandle,
    scope: ValuationScope,
    id: import("./ids.ts").ValuationComparisonId,
  ): Promise<ValuationComparison | undefined>;
}

export type {
  ValuationApproval,
  ValuationComparison,
  ValuationInput,
  ValuationInvalidation,
  ValuationModel,
  ValuationResult,
  ValuationScenario,
};
