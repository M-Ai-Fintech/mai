import type {
  CalculationOptions,
  CalculationOutcome,
  CalculationProvenance,
  ValuationCalculation,
  ValuationMethod,
  ValuationRequest,
} from "../engines/valuation/types.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type {
  ValuationApprovalId,
  ValuationComparisonId,
  ValuationInputId,
  ValuationInvalidationId,
  ValuationModelId,
  ValuationResultId,
  ValuationScenarioId,
} from "./ids.ts";
import type { ExactValuationBasis, ValuationScope } from "./basis.ts";
import type { ValuationInputProvenance } from "./provenance.ts";
import { ValuationError } from "./errors.ts";
import {
  assertActiveActor,
  assertApprovalResultMatchesScenario,
  assertAuthority,
  assertBasisIdentity,
  assertCurrentInput,
  assertDate,
  assertDefinition,
  assertHumanActor,
  assertName,
  assertResultMatchesScenario,
  assertScenarioInput,
  assertScenarioModel,
  assertScope,
  assertScopeMatch,
  freezeAuthority,
  freezeModel,
  freezeScenario,
  nextVersion,
  transitionScenario,
} from "./model_support.ts";
import { modelTransitionAllowed } from "./transition_tables.ts";

export type { CalculationOptions, ValuationMethod, ValuationRequest };
export type { ExactValuationBasis, ValuationScope } from "./basis.ts";

export type ValuationModelState = "draft" | "active" | "retired";
export type ScenarioState =
  | "draft"
  | "ready"
  | "queued"
  | "computing"
  | "computed"
  | "approved"
  | "stale"
  | "invalidated";
export type ValuationResultState = "computed" | "approved";
export type InvalidationKind = "stale" | "invalidated";

export interface ValuationModelDefinition {
  readonly method: ValuationMethod;
  readonly algorithm: "mai.deterministic-valuation";
  readonly algorithmVersion: string;
  readonly rounding: CalculationOptions["rounding"];
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export interface ValuationModel {
  readonly aggregateType: "valuation_model";
  readonly id: ValuationModelId;
  readonly scope: ValuationScope;
  readonly name: string;
  readonly definition: ValuationModelDefinition;
  readonly state: ValuationModelState;
  readonly version: AggregateVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ValuationScenario {
  readonly aggregateType: "valuation_scenario";
  readonly id: ValuationScenarioId;
  readonly scope: ValuationScope;
  readonly name: string;
  readonly modelId: ValuationModelId;
  readonly modelVersion: AggregateVersion;
  readonly state: ScenarioState;
  readonly currentInputId?: ValuationInputId;
  readonly currentInputVersion?: AggregateVersion;
  readonly currentResultId?: ValuationResultId;
  readonly approvedResultId?: ValuationResultId;
  readonly version: AggregateVersion;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ValuationInput {
  readonly aggregateType: "valuation_input";
  readonly id: ValuationInputId;
  readonly scope: ValuationScope;
  readonly scenarioId: ValuationScenarioId;
  readonly scenarioVersion: AggregateVersion;
  readonly modelId: ValuationModelId;
  readonly modelVersion: AggregateVersion;
  readonly version: AggregateVersion;
  readonly request: ValuationRequest;
  readonly basis: ExactValuationBasis;
  readonly provenance: ValuationInputProvenance;
  readonly createdAt: Date;
}

export interface ValuationResult {
  readonly aggregateType: "valuation_result";
  readonly id: ValuationResultId;
  readonly scope: ValuationScope;
  readonly scenarioId: ValuationScenarioId;
  readonly scenarioVersion: AggregateVersion;
  readonly inputId: ValuationInputId;
  readonly inputVersion: AggregateVersion;
  readonly modelId: ValuationModelId;
  readonly modelVersion: AggregateVersion;
  readonly state: ValuationResultState;
  readonly outcome: CalculationOutcome<ValuationCalculation>;
  readonly calculationProvenance: CalculationProvenance;
  readonly basis: ExactValuationBasis;
  readonly createdAt: Date;
}

export interface ValuationAuthoritySnapshot {
  readonly snapshotId: string;
  readonly actorId: import("../platform/api/v1.ts").ActorId;
  readonly policyVersion: string;
  readonly scope: ValuationScope;
  readonly capturedAt: Date;
}

export interface ValuationApproval {
  readonly aggregateType: "valuation_approval";
  readonly id: ValuationApprovalId;
  readonly scope: ValuationScope;
  readonly scenarioId: ValuationScenarioId;
  readonly scenarioVersion: AggregateVersion;
  readonly resultId: ValuationResultId;
  readonly resultBasis: ExactValuationBasis;
  readonly actor: ActorReference;
  readonly authority: ValuationAuthoritySnapshot;
  readonly approvedAt: Date;
}

export interface ValuationInvalidation {
  readonly aggregateType: "valuation_invalidation";
  readonly id: ValuationInvalidationId;
  readonly scope: ValuationScope;
  readonly scenarioId: ValuationScenarioId;
  readonly scenarioVersion: AggregateVersion;
  readonly resultId?: ValuationResultId;
  readonly kind: InvalidationKind;
  readonly reason: string;
  readonly sourceReference?: string;
  readonly actor: ActorReference;
  readonly createdAt: Date;
}

export interface ValuationResultComparisonEntry {
  readonly resultId: ValuationResultId;
  readonly method: ValuationMethod;
  readonly amount: number;
  readonly currency: string;
  readonly basisDigest: string;
  readonly modelVersion: AggregateVersion;
  readonly scenarioVersion: AggregateVersion;
  readonly freshness: "current" | "stale";
  readonly deltaFromBaseline?: number;
}

export interface ValuationComparison {
  readonly aggregateType: "valuation_comparison";
  readonly id: ValuationComparisonId;
  readonly scope: ValuationScope;
  readonly baselineResultId: ValuationResultId;
  readonly entries: readonly ValuationResultComparisonEntry[];
  readonly projectionVersion: AggregateVersion;
  readonly createdAt: Date;
}

export function createValuationModel(input: {
  readonly id: ValuationModelId;
  readonly scope: ValuationScope;
  readonly name: string;
  readonly definition: ValuationModelDefinition;
  readonly now: Date;
}): ValuationModel {
  assertScope(input.scope);
  assertName(input.name, "model name");
  assertDefinition(input.definition);
  assertDate(input.now, "model time");
  return freezeModel({
    aggregateType: "valuation_model",
    id: input.id,
    scope: input.scope,
    name: input.name.trim(),
    definition: input.definition,
    state: "draft",
    version: nextVersion(1),
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function transitionValuationModel(
  model: ValuationModel,
  next: ValuationModelState,
  now: Date,
): ValuationModel {
  if (!modelTransitionAllowed(model.state, next)) {
    throw new ValuationError(
      "INVALID_TRANSITION",
      `Valuation model "${model.id}" state "${model.state}" cannot transition to "${next}"; expected a governed model lifecycle transition.`,
    );
  }
  return freezeModel({
    ...model,
    state: next,
    version: nextVersion(Number(model.version) + 1),
    updatedAt: now,
  });
}

export function createValuationScenario(input: {
  readonly id: ValuationScenarioId;
  readonly scope: ValuationScope;
  readonly name: string;
  readonly model: ValuationModel;
  readonly now: Date;
}): ValuationScenario {
  assertScope(input.scope);
  assertScopeMatch(input.scope, input.model.scope, "Scenario model");
  if (input.model.state !== "active") {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation model "${input.model.id}" is "${input.model.state}"; expected an active model before creating a scenario.`,
    );
  }
  assertName(input.name, "scenario name");
  assertDate(input.now, "scenario time");
  return freezeScenario({
    aggregateType: "valuation_scenario",
    id: input.id,
    scope: input.scope,
    name: input.name.trim(),
    modelId: input.model.id,
    modelVersion: input.model.version,
    state: "draft",
    version: nextVersion(1),
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export function createValuationInput(input: {
  readonly id: ValuationInputId;
  readonly scenario: ValuationScenario;
  readonly model: ValuationModel;
  readonly request: ValuationRequest;
  readonly basis: ExactValuationBasis;
  readonly provenance: ValuationInputProvenance;
  readonly now: Date;
}): ValuationInput {
  assertScenarioModel(input.scenario, input.model);
  assertScopeMatch(input.scenario.scope, input.basis.scope, "Input basis");
  assertBasisIdentity(input.basis, input.scenario, input.model, input.id);
  if (input.request.method !== input.model.definition.method) {
    throw new ValuationError(
      "METHOD_UNSUPPORTED",
      `Valuation input method "${input.request.method}" does not match model method "${input.model.definition.method}"; expected the versioned model contract.`,
    );
  }
  assertDate(input.now, "input time");
  return Object.freeze({
    aggregateType: "valuation_input",
    id: input.id,
    scope: Object.freeze({ ...input.scenario.scope }),
    scenarioId: input.scenario.id,
    scenarioVersion: input.scenario.version,
    modelId: input.model.id,
    modelVersion: input.model.version,
    version: nextVersion(1),
    request: Object.freeze({ ...input.request }),
    basis: input.basis,
    provenance: input.provenance,
    createdAt: new Date(input.now),
  });
}

export function attachValuationInput(
  scenario: ValuationScenario,
  input: ValuationInput,
  now: Date,
): ValuationScenario {
  assertScenarioInput(scenario, input);
  return transitionScenario(scenario, "ready", now, {
    currentInputId: input.id,
    currentInputVersion: input.version,
    currentResultId: undefined,
    approvedResultId: undefined,
  });
}

export function queueValuationScenario(
  scenario: ValuationScenario,
  now: Date,
): ValuationScenario {
  assertCurrentInput(scenario);
  return transitionScenario(scenario, "queued", now);
}

export function markValuationComputing(
  scenario: ValuationScenario,
  now: Date,
): ValuationScenario {
  return transitionScenario(scenario, "computing", now);
}

export function completeValuationScenario(
  scenario: ValuationScenario,
  result: ValuationResult,
  now: Date,
): ValuationScenario {
  assertResultMatchesScenario(scenario, result);
  return transitionScenario(scenario, "computed", now, {
    currentResultId: result.id,
  });
}

export function approveValuationScenario(
  scenario: ValuationScenario,
  result: ValuationResult,
  input: {
    readonly id: ValuationApprovalId;
    readonly actor: ActorReference;
    readonly authority: ValuationAuthoritySnapshot;
    readonly now: Date;
  },
): {
  readonly scenario: ValuationScenario;
  readonly approval: ValuationApproval;
} {
  assertApprovalResultMatchesScenario(scenario, result);
  if (scenario.state !== "computed" || scenario.currentResultId !== result.id) {
    throw new ValuationError(
      "INVALID_TRANSITION",
      `Valuation scenario "${scenario.id}" is "${scenario.state}"; expected its current computed result before approval.`,
    );
  }
  assertHumanActor(input.actor, "approve a valuation result");
  assertAuthority(input.authority, input.actor, scenario.scope);
  const approval: ValuationApproval = Object.freeze({
    aggregateType: "valuation_approval",
    id: input.id,
    scope: Object.freeze({ ...scenario.scope }),
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    resultId: result.id,
    resultBasis: result.basis,
    actor: Object.freeze({ ...input.actor }),
    authority: freezeAuthority(input.authority),
    approvedAt: new Date(input.now),
  });
  return {
    scenario: transitionScenario(scenario, "approved", input.now, {
      approvedResultId: result.id,
    }),
    approval,
  };
}

export function invalidateValuationScenario(
  scenario: ValuationScenario,
  input: {
    readonly id: ValuationInvalidationId;
    readonly kind: InvalidationKind;
    readonly resultId?: ValuationResultId;
    readonly reason: string;
    readonly sourceReference?: string;
    readonly actor: ActorReference;
    readonly now: Date;
  },
): {
  readonly scenario: ValuationScenario;
  readonly invalidation: ValuationInvalidation;
} {
  if (scenario.state === "stale" || scenario.state === "invalidated") {
    throw new ValuationError(
      "STALE_RESULT",
      `Valuation scenario "${scenario.id}" is already "${scenario.state}"; expected a current scenario before invalidation.`,
    );
  }
  if (
    input.resultId !== undefined && input.resultId !== scenario.currentResultId
  ) {
    throw new ValuationError(
      "REFERENCED_VERSION_MISMATCH",
      `Valuation invalidation "${input.id}" targets result "${input.resultId}"; expected current result "${scenario.currentResultId}".`,
    );
  }
  if (input.kind === "invalidated") {
    assertHumanActor(input.actor, "invalidate a valuation result");
  } else {
    assertActiveActor(input.actor, "mark a valuation result stale");
  }
  assertName(input.reason, "invalidation reason");
  assertDate(input.now, "invalidation time");
  const invalidation: ValuationInvalidation = Object.freeze({
    aggregateType: "valuation_invalidation",
    id: input.id,
    scope: Object.freeze({ ...scenario.scope }),
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    ...(input.resultId === undefined ? {} : { resultId: input.resultId }),
    kind: input.kind,
    reason: input.reason.trim(),
    ...(input.sourceReference === undefined
      ? {}
      : { sourceReference: input.sourceReference }),
    actor: Object.freeze({ ...input.actor }),
    createdAt: new Date(input.now),
  });
  const nextState = input.kind === "stale" ? "stale" : "invalidated";
  return {
    scenario: transitionScenario(scenario, nextState, input.now),
    invalidation,
  };
}
