import type {
  CalculationOutcome,
  CalculationProvenance,
  ValuationCalculation,
} from "../engines/valuation/types.ts";
import { ValuationError } from "./errors.ts";
import type {
  ValuationInput,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";
import type { ValuationResultId } from "./ids.ts";

export function createValuationResult(input: {
  readonly id: ValuationResultId;
  readonly scenario: ValuationScenario;
  readonly valuationInput: ValuationInput;
  readonly outcome: CalculationOutcome<ValuationCalculation>;
  readonly now: Date;
}): ValuationResult {
  if (input.scenario.state !== "computing") {
    throw new ValuationError(
      "INVALID_TRANSITION",
      `Valuation scenario "${input.scenario.id}" is "${input.scenario.state}"; expected computing before recording a result.`,
    );
  }
  if (
    input.valuationInput.id !== input.scenario.currentInputId ||
    input.valuationInput.version !== input.scenario.currentInputVersion
  ) {
    throw new ValuationError(
      "STALE_INPUT",
      `Valuation input "${input.valuationInput.id}" version "${input.valuationInput.version}" is not the current input for scenario "${input.scenario.id}"; expected "${input.scenario.currentInputId}/${input.scenario.currentInputVersion}".`,
    );
  }
  if (!input.outcome.ok) {
    throw new ValuationError(
      "JOB_FAILED",
      `Valuation result "${input.id}" cannot store failed calculation "${input.outcome.error.code}"; expected a successful deterministic result.`,
    );
  }
  assertDate(input.now);
  return Object.freeze({
    aggregateType: "valuation_result",
    id: input.id,
    scope: Object.freeze({ ...input.scenario.scope }),
    scenarioId: input.scenario.id,
    scenarioVersion: input.scenario.version,
    inputId: input.valuationInput.id,
    inputVersion: input.valuationInput.version,
    modelId: input.valuationInput.modelId,
    modelVersion: input.valuationInput.modelVersion,
    state: "computed",
    outcome: input.outcome,
    calculationProvenance: input.outcome.provenance,
    basis: input.valuationInput.basis,
    createdAt: new Date(input.now),
  });
}

export function resultProvenance(
  result: ValuationResult,
): CalculationProvenance {
  return result.calculationProvenance;
}

function assertDate(value: Date): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new ValuationError(
    "INVALID_INPUT",
    `Valuation result time "${
      String(value)
    }" is invalid; expected a valid Date.`,
  );
}
