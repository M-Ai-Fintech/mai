import type { ActorReference } from "../../src/platform/authz/v1.ts";
import {
  parseActorId,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  createExactValuationBasis,
  type ExactValuationBasis,
  type ValuationScope,
} from "../../src/valuation/basis.ts";
import {
  createValuationInputProvenance,
  type ValuationInputProvenance,
} from "../../src/valuation/provenance.ts";
import {
  attachValuationInput,
  completeValuationScenario,
  createValuationInput,
  createValuationModel,
  createValuationScenario,
  markValuationComputing,
  queueValuationScenario,
  transitionValuationModel,
  type ValuationInput,
  type ValuationModel,
  type ValuationResult,
  type ValuationScenario,
} from "../../src/valuation/model.ts";
import {
  parseAggregateVersion,
  parseValuationInputId,
  parseValuationModelId,
  parseValuationResultId,
  parseValuationScenarioId,
} from "../../src/valuation/ids.ts";
import type {
  CalculationOutcome,
  ValuationCalculation,
} from "../../src/engines/valuation/types.ts";
import { createValuationResult } from "../../src/valuation/result.ts";

export const NOW = new Date("2026-08-07T12:00:00.000Z");

export function scope(): ValuationScope {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

export function humanActor(): ActorReference {
  return {
    id: required("actor_analyst", parseActorId),
    kind: "human",
    state: "active",
  };
}

export function serviceActor(): ActorReference {
  return {
    id: required("actor_valuation-worker", parseActorId),
    kind: "service",
    state: "active",
  };
}

export function aiActor(): ActorReference {
  return {
    id: required("actor_model", parseActorId),
    kind: "ai",
    state: "active",
  };
}

export function modelDefinition() {
  return {
    method: "book-value" as const,
    algorithm: "mai.deterministic-valuation" as const,
    algorithmVersion: "1.0.0",
    rounding: { moneyScale: 2, ratioScale: 4, mode: "half-up" as const },
  };
}

export function activeModel(): ValuationModel {
  const draft = createValuationModel({
    id: required("valuation_model_book", parseValuationModelId),
    scope: scope(),
    name: "Book value",
    definition: modelDefinition(),
    now: NOW,
  });
  return transitionValuationModel(draft, "active", NOW);
}

export function scenario(): ValuationScenario {
  return createValuationScenario({
    id: required("valuation_scenario_base", parseValuationScenarioId),
    scope: scope(),
    name: "Base case",
    model: activeModel(),
    now: NOW,
  });
}

export function basis(
  inputId = "valuation_input_financials",
): ExactValuationBasis {
  return createExactValuationBasis({
    scope: scope(),
    modelId: required("valuation_model_book", parseValuationModelId),
    modelVersion: required(2, parseAggregateVersion),
    scenarioId: required("valuation_scenario_base", parseValuationScenarioId),
    scenarioVersion: required(1, parseAggregateVersion),
    inputId: required(inputId, parseValuationInputId),
    inputVersion: required(1, parseAggregateVersion),
    references: [{
      kind: "fact_version",
      id: "factver_financials",
      version: required(1, parseAggregateVersion),
    }],
    basisDigest: "a".repeat(64),
    capturedAt: NOW,
  });
}

export function provenance(
  actor: ActorReference = humanActor(),
): ValuationInputProvenance {
  return createValuationInputProvenance({
    source: "human_entered",
    actor,
    origin: "http",
    capturedAt: NOW,
  });
}

export function input(valueBasis = basis()): ValuationInput {
  const currentScenario = scenario();
  return createValuationInput({
    id: valueBasis.inputId,
    scenario: currentScenario,
    model: activeModel(),
    request: { method: "book-value", input: {} },
    basis: valueBasis,
    provenance: provenance(),
    now: NOW,
  });
}

export type SuccessfulCalculation = Extract<
  CalculationOutcome<ValuationCalculation>,
  { readonly ok: true }
>;

export function successfulOutcome(amount = 100): SuccessfulCalculation {
  return {
    ok: true,
    value: {
      method: "book-value",
      value: { amount, currency: "USD" },
      flags: [],
    },
    provenance: {
      algorithm: "mai.deterministic-valuation",
      algorithmVersion: "1.0.0",
      formulaId: "book-value",
      inputFields: ["totalAssets", "intangibleAssets", "totalLiabilities"],
      rounding: modelDefinition().rounding,
    },
  };
}

export function computedScenario(): {
  readonly scenario: ValuationScenario;
  readonly result: ValuationResult;
} {
  const draft = scenario();
  const valueInput = input();
  const ready = attachValuationInput(draft, valueInput, NOW);
  const queued = queueValuationScenario(ready, NOW);
  const computing = markValuationComputing(queued, NOW);
  const result = createValuationResult({
    id: required("valuation_result_base", parseValuationResultId),
    scenario: computing,
    valuationInput: valueInput,
    outcome: successfulOutcome(),
    now: NOW,
  });
  return {
    scenario: completeValuationScenario(computing, result, NOW),
    result,
  };
}

function required<T>(
  value: unknown,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | { readonly ok: false },
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}
