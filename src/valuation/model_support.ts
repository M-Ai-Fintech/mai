import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { ValuationInputId } from "./ids.ts";
import {
  type ExactValuationBasis,
  sameScope,
  type ValuationScope,
} from "./basis.ts";
import { ValuationError, valuationInputError } from "./errors.ts";
import { scenarioRule } from "./transition_tables.ts";
import type {
  ScenarioState,
  ValuationAuthoritySnapshot,
  ValuationInput,
  ValuationModel,
  ValuationModelDefinition,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";

export function transitionScenario(
  scenario: ValuationScenario,
  next: ScenarioState,
  now: Date,
  changes: Partial<ValuationScenario> = {},
): ValuationScenario {
  const rule = scenarioRule(scenario.state, next);
  if (rule === undefined) {
    throw new ValuationError(
      "INVALID_TRANSITION",
      `Valuation scenario "${scenario.id}" state "${scenario.state}" cannot transition to "${next}"; expected an allowed lifecycle transition.`,
    );
  }
  assertDate(now, "scenario transition time");
  return freezeScenario({
    ...scenario,
    ...changes,
    state: next,
    version: nextVersion(Number(scenario.version) + 1),
    updatedAt: now,
  });
}

export function assertScenarioInput(
  scenario: ValuationScenario,
  input: ValuationInput,
): void {
  assertScopeMatch(scenario.scope, input.scope, "Scenario input");
  if (scenario.id !== input.scenarioId || scenario.modelId !== input.modelId) {
    throw new ValuationError(
      "SCOPE_MISMATCH",
      `Valuation input "${input.id}" references scenario "${input.scenarioId}" and model "${input.modelId}"; expected scenario "${scenario.id}" and model "${scenario.modelId}".`,
    );
  }
  if (input.scenarioVersion !== scenario.version) {
    throw new ValuationError(
      "VERSION_CONFLICT",
      `Valuation input "${input.id}" targets scenario version "${input.scenarioVersion}"; expected current version "${scenario.version}".`,
    );
  }
}

export function assertCurrentInput(scenario: ValuationScenario): void {
  if (
    scenario.currentInputId !== undefined &&
    scenario.currentInputVersion !== undefined
  ) return;
  throw new ValuationError(
    "INVALID_INPUT",
    `Valuation scenario "${scenario.id}" has no current input; expected an exact input version before compute.`,
  );
}

export function assertResultMatchesScenario(
  scenario: ValuationScenario,
  result: ValuationResult,
): void {
  assertScopeMatch(scenario.scope, result.scope, "Scenario result");
  if (
    result.scenarioId !== scenario.id ||
    result.scenarioVersion !== scenario.version ||
    result.inputId !== scenario.currentInputId ||
    result.inputVersion !== scenario.currentInputVersion
  ) {
    throw new ValuationError(
      "STALE_INPUT",
      `Valuation result "${result.id}" targets scenario/input version "${result.scenarioVersion}/${result.inputVersion}"; expected "${scenario.version}/${scenario.currentInputVersion}" for scenario "${scenario.id}".`,
    );
  }
}

export function assertApprovalResultMatchesScenario(
  scenario: ValuationScenario,
  result: ValuationResult,
): void {
  assertScopeMatch(scenario.scope, result.scope, "Approval result");
  if (
    result.scenarioId === scenario.id &&
    result.scenarioVersion <= scenario.version &&
    result.inputId === scenario.currentInputId &&
    result.inputVersion === scenario.currentInputVersion
  ) return;
  throw new ValuationError(
    "STALE_RESULT",
    `Valuation result "${result.id}" is not the current exact result for scenario "${scenario.id}"; expected the current input and a scenario version no newer than "${scenario.version}".`,
  );
}

export function assertScenarioModel(
  scenario: ValuationScenario,
  model: ValuationModel,
): void {
  assertScopeMatch(scenario.scope, model.scope, "Valuation model");
  if (
    scenario.modelId === model.id && scenario.modelVersion === model.version
  ) return;
  throw new ValuationError(
    "REFERENCED_VERSION_MISMATCH",
    `Scenario "${scenario.id}" references model "${scenario.modelId}" version "${scenario.modelVersion}"; expected "${model.id}" version "${model.version}".`,
  );
}

export function assertBasisIdentity(
  basis: ExactValuationBasis,
  scenario: ValuationScenario,
  model: ValuationModel,
  inputId: ValuationInputId,
): void {
  if (
    basis.modelId === model.id && basis.modelVersion === model.version &&
    basis.scenarioId === scenario.id &&
    basis.scenarioVersion === scenario.version &&
    basis.inputId === inputId && basis.inputVersion === 1
  ) return;
  throw new ValuationError(
    "EXACT_BASIS_MISMATCH",
    `Valuation input basis for "${inputId}" does not match model "${model.id}" version "${model.version}" or scenario "${scenario.id}" version "${scenario.version}"; expected an exact versioned basis.`,
  );
}

export function assertHumanActor(actor: ActorReference, action: string): void {
  if (actor.kind === "human" && actor.state === "active") return;
  throw new ValuationError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Actor "${actor.id}" cannot ${action}; expected an active human actor and never an AI/model output.`,
  );
}

export function assertActiveActor(actor: ActorReference, action: string): void {
  if (actor.state === "active") return;
  throw new ValuationError(
    "ACTOR_DENIED",
    `Actor "${actor.id}" cannot ${action}; expected an active actor for automated invalidation.`,
  );
}

export function assertAuthority(
  authority: ValuationAuthoritySnapshot,
  actor: ActorReference,
  scope: ValuationScope,
): void {
  if (
    authority.actorId === actor.id &&
    sameScope(authority.scope, scope) &&
    authority.snapshotId.trim() &&
    authority.policyVersion.trim() &&
    authority.capturedAt instanceof Date &&
    !Number.isNaN(authority.capturedAt.getTime())
  ) return;
  throw new ValuationError(
    "HUMAN_AUTHORITY_REQUIRED",
    `Authority snapshot "${authority.snapshotId}" is not an exact active human snapshot for actor "${actor.id}" and the requested valuation scope.`,
  );
}

export function assertDefinition(definition: ValuationModelDefinition): void {
  if (definition.algorithm !== "mai.deterministic-valuation") {
    throw valuationInputError(
      "algorithm",
      definition.algorithm,
      "mai.deterministic-valuation",
    );
  }
  assertName(definition.algorithmVersion, "algorithm version");
  if (definition.rounding.mode !== "half-up") {
    throw valuationInputError(
      "rounding.mode",
      definition.rounding.mode,
      "half-up",
    );
  }
  assertScale(definition.rounding.moneyScale, "moneyScale");
  assertScale(definition.rounding.ratioScale, "ratioScale");
}

export function assertScope(scope: ValuationScope): void {
  for (const [label, value] of Object.entries(scope)) {
    if (typeof value === "string" && value.trim()) continue;
    throw valuationInputError(`scope.${label}`, value, "a non-empty scoped ID");
  }
}

export function assertScopeMatch(
  expected: ValuationScope,
  actual: ValuationScope,
  subject: string,
): void {
  if (sameScope(expected, actual)) return;
  throw new ValuationError(
    "SCOPE_MISMATCH",
    `${subject} scope does not match tenant "${expected.tenantId}", workspace "${expected.workspaceId}", and deal "${expected.dealId}".`,
  );
}

export function assertName(value: string, label: string): void {
  if (typeof value === "string" && value.trim() && value.length <= 256) return;
  throw valuationInputError(label, value, "1-256 non-whitespace characters");
}

export function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw valuationInputError(label, value, "a valid Date");
}

export function nextVersion(value: number): AggregateVersion {
  if (Number.isSafeInteger(value) && value > 0) {
    return value as AggregateVersion;
  }
  throw valuationInputError(
    "aggregate version",
    value,
    "a positive safe integer",
  );
}

export function freezeModel(model: ValuationModel): ValuationModel {
  return Object.freeze({
    ...model,
    scope: Object.freeze({ ...model.scope }),
    definition: Object.freeze({
      ...model.definition,
      rounding: Object.freeze({ ...model.definition.rounding }),
      ...(model.definition.parameters === undefined
        ? {}
        : { parameters: Object.freeze({ ...model.definition.parameters }) }),
    }),
    createdAt: new Date(model.createdAt),
    updatedAt: new Date(model.updatedAt),
  });
}

export function freezeScenario(scenario: ValuationScenario): ValuationScenario {
  return Object.freeze({
    ...scenario,
    scope: Object.freeze({ ...scenario.scope }),
    createdAt: new Date(scenario.createdAt),
    updatedAt: new Date(scenario.updatedAt),
  });
}

export function freezeAuthority(
  authority: ValuationAuthoritySnapshot,
): ValuationAuthoritySnapshot {
  return Object.freeze({
    ...authority,
    scope: Object.freeze({ ...authority.scope }),
    capturedAt: new Date(authority.capturedAt),
  });
}

function assertScale(value: number, label: string): void {
  if (Number.isSafeInteger(value) && value >= 0) return;
  throw valuationInputError(
    `rounding.${label}`,
    value,
    "a non-negative integer",
  );
}
