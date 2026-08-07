import {
  calculateValuation,
  type CalculationOutcome,
  type CalculationProvenance,
  type ValuationCalculation,
  type ValuationRequest,
} from "../engines/valuation/index.ts";
import type { ValuationModelDefinition } from "./model.ts";
import { ValuationError } from "./errors.ts";

export interface DeterministicValuationRequest {
  readonly request: ValuationRequest;
  readonly model: ValuationModelDefinition;
}

export interface DeterministicValuationPort {
  compute(
    request: DeterministicValuationRequest,
  ):
    | Promise<CalculationOutcome<ValuationCalculation>>
    | CalculationOutcome<ValuationCalculation>;
}

/** Adapter boundary for MAI-18's pure deterministic calculation contracts. */
export class Mai18DeterministicValuationAdapter
  implements DeterministicValuationPort {
  compute(
    request: DeterministicValuationRequest,
  ): CalculationOutcome<ValuationCalculation> {
    if (
      request.model.algorithm !== "mai.deterministic-valuation" ||
      request.model.algorithmVersion !== "1.0.0"
    ) {
      throw new ValuationError(
        "DEPENDENCY_UNAVAILABLE",
        `Valuation model algorithm "${request.model.algorithm}" is unsupported; expected the MAI-18 deterministic contract.`,
      );
    }
    const outcome = calculateValuation(request.request);
    if (!outcome.ok) return outcome;
    return {
      ...outcome,
      provenance: deterministicProvenance(outcome.provenance, request.model),
    };
  }
}

export function ensureSuccessfulCalculation(
  outcome: CalculationOutcome<ValuationCalculation>,
  method: string,
): {
  readonly value: ValuationCalculation;
  readonly provenance: CalculationProvenance;
} {
  if (outcome.ok) {
    return { value: outcome.value, provenance: outcome.provenance };
  }
  throw new ValuationError(
    outcome.error.code === "UNSUPPORTED_METHOD"
      ? "METHOD_UNSUPPORTED"
      : "JOB_FAILED",
    `Deterministic valuation method "${method}" failed with ${outcome.error.code} at field "${outcome.error.field}"; expected valid MAI-18 calculation inputs.`,
  );
}

function deterministicProvenance(
  provenance: CalculationProvenance,
  model: ValuationModelDefinition,
): CalculationProvenance {
  return {
    ...provenance,
    algorithm: "mai.deterministic-valuation",
    algorithmVersion: "1.0.0",
    rounding: model.rounding,
  };
}
