import {
  parseActorId,
  parseAggregateVersion,
  parseDealId,
  parseTenantId,
  parseWorkspaceId,
} from "../platform/api/v1.ts";
import type { ActorReference } from "../platform/authz/v1.ts";
import { createExactValuationBasis, type ValuationScope } from "./basis.ts";
import type {
  ValuationApproval,
  ValuationAuthoritySnapshot,
  ValuationComparison,
  ValuationInput,
  ValuationInvalidation,
  ValuationModel,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";
import {
  parseValuationApprovalId,
  parseValuationComparisonId,
  parseValuationInputId,
  parseValuationInvalidationId,
  parseValuationModelId,
  parseValuationResultId,
  parseValuationScenarioId,
} from "./ids.ts";
import { createValuationInputProvenance } from "./provenance.ts";
import { ValuationError } from "./errors.ts";

export function rowModel(value: unknown): ValuationModel {
  const model = object(value, "valuation model");
  return Object.freeze({
    aggregateType: "valuation_model",
    id: required(model.id, parseValuationModelId, "model ID"),
    scope: rowScope(model.scope),
    name: text(model.name, "model name"),
    definition: rowDefinition(model.definition),
    state: enumValue(
      model.state,
      ["draft", "active", "retired"],
      "model state",
    ),
    version: required(model.version, parseAggregateVersion, "model version"),
    createdAt: date(model.createdAt, "model createdAt"),
    updatedAt: date(model.updatedAt, "model updatedAt"),
  });
}

export function rowScenario(value: unknown): ValuationScenario {
  const scenario = object(value, "valuation scenario");
  return Object.freeze({
    aggregateType: "valuation_scenario",
    id: required(scenario.id, parseValuationScenarioId, "scenario ID"),
    scope: rowScope(scenario.scope),
    name: text(scenario.name, "scenario name"),
    modelId: required(
      scenario.modelId,
      parseValuationModelId,
      "scenario model ID",
    ),
    modelVersion: required(
      scenario.modelVersion,
      parseAggregateVersion,
      "scenario model version",
    ),
    state: enumValue(scenario.state, [
      "draft",
      "ready",
      "queued",
      "computing",
      "computed",
      "approved",
      "stale",
      "invalidated",
    ], "scenario state"),
    currentInputId: optional(
      scenario.currentInputId,
      parseValuationInputId,
      "current input ID",
    ),
    currentInputVersion: optional(
      scenario.currentInputVersion,
      parseAggregateVersion,
      "current input version",
    ),
    currentResultId: optional(
      scenario.currentResultId,
      parseValuationResultId,
      "current result ID",
    ),
    approvedResultId: optional(
      scenario.approvedResultId,
      parseValuationResultId,
      "approved result ID",
    ),
    version: required(
      scenario.version,
      parseAggregateVersion,
      "scenario version",
    ),
    createdAt: date(scenario.createdAt, "scenario createdAt"),
    updatedAt: date(scenario.updatedAt, "scenario updatedAt"),
  });
}

export function rowInput(value: unknown): ValuationInput {
  const input = object(value, "valuation input");
  return Object.freeze({
    aggregateType: "valuation_input",
    id: required(input.id, parseValuationInputId, "input ID"),
    scope: rowScope(input.scope),
    scenarioId: required(
      input.scenarioId,
      parseValuationScenarioId,
      "input scenario ID",
    ),
    scenarioVersion: required(
      input.scenarioVersion,
      parseAggregateVersion,
      "input scenario version",
    ),
    modelId: required(input.modelId, parseValuationModelId, "input model ID"),
    modelVersion: required(
      input.modelVersion,
      parseAggregateVersion,
      "input model version",
    ),
    version: required(input.version, parseAggregateVersion, "input version"),
    request: object(
      input.request,
      "valuation request",
    ) as unknown as ValuationInput["request"],
    basis: rowBasis(input.basis),
    provenance: createValuationInputProvenance(rowProvenance(input.provenance)),
    createdAt: date(input.createdAt, "input createdAt"),
  });
}

export function rowResult(value: unknown): ValuationResult {
  const result = object(value, "valuation result");
  const outcome = object(
    result.outcome,
    "calculation outcome",
  ) as unknown as ValuationResult["outcome"];
  if (outcome.ok !== true) {
    throw new ValuationError(
      "JOB_FAILED",
      `Stored valuation result "${
        String(result.id)
      }" is not successful; expected immutable successful calculation output.`,
    );
  }
  return Object.freeze({
    aggregateType: "valuation_result",
    id: required(result.id, parseValuationResultId, "result ID"),
    scope: rowScope(result.scope),
    scenarioId: required(
      result.scenarioId,
      parseValuationScenarioId,
      "result scenario ID",
    ),
    scenarioVersion: required(
      result.scenarioVersion,
      parseAggregateVersion,
      "result scenario version",
    ),
    inputId: required(result.inputId, parseValuationInputId, "result input ID"),
    inputVersion: required(
      result.inputVersion,
      parseAggregateVersion,
      "result input version",
    ),
    modelId: required(result.modelId, parseValuationModelId, "result model ID"),
    modelVersion: required(
      result.modelVersion,
      parseAggregateVersion,
      "result model version",
    ),
    state: enumValue(result.state, ["computed", "approved"], "result state"),
    outcome,
    calculationProvenance: object(
      result.calculationProvenance,
      "calculation provenance",
    ) as unknown as ValuationResult["calculationProvenance"],
    basis: rowBasis(result.basis),
    createdAt: date(result.createdAt, "result createdAt"),
  });
}

export function rowApproval(value: unknown): ValuationApproval {
  const approval = object(value, "valuation approval");
  return Object.freeze({
    aggregateType: "valuation_approval",
    id: required(approval.id, parseValuationApprovalId, "approval ID"),
    scope: rowScope(approval.scope),
    scenarioId: required(
      approval.scenarioId,
      parseValuationScenarioId,
      "approval scenario ID",
    ),
    scenarioVersion: required(
      approval.scenarioVersion,
      parseAggregateVersion,
      "approval scenario version",
    ),
    resultId: required(
      approval.resultId,
      parseValuationResultId,
      "approval result ID",
    ),
    resultBasis: rowBasis(approval.resultBasis),
    actor: rowActor(approval.actor),
    authority: rowAuthority(approval.authority),
    approvedAt: date(approval.approvedAt, "approval time"),
  });
}

export function rowInvalidation(value: unknown): ValuationInvalidation {
  const invalidation = object(value, "valuation invalidation");
  return Object.freeze({
    aggregateType: "valuation_invalidation",
    id: required(
      invalidation.id,
      parseValuationInvalidationId,
      "invalidation ID",
    ),
    scope: rowScope(invalidation.scope),
    scenarioId: required(
      invalidation.scenarioId,
      parseValuationScenarioId,
      "invalidation scenario ID",
    ),
    scenarioVersion: required(
      invalidation.scenarioVersion,
      parseAggregateVersion,
      "invalidation scenario version",
    ),
    resultId: optional(
      invalidation.resultId,
      parseValuationResultId,
      "invalidation result ID",
    ),
    kind: enumValue(
      invalidation.kind,
      ["stale", "invalidated"],
      "invalidation kind",
    ),
    reason: text(invalidation.reason, "invalidation reason"),
    sourceReference: optionalText(invalidation.sourceReference),
    actor: rowActor(invalidation.actor),
    createdAt: date(invalidation.createdAt, "invalidation createdAt"),
  });
}

export function rowComparison(value: unknown): ValuationComparison {
  const comparison = object(value, "valuation comparison");
  return Object.freeze({
    aggregateType: "valuation_comparison",
    id: required(comparison.id, parseValuationComparisonId, "comparison ID"),
    scope: rowScope(comparison.scope),
    baselineResultId: required(
      comparison.baselineResultId,
      parseValuationResultId,
      "baseline result ID",
    ),
    entries: comparison.entries as ValuationComparison["entries"],
    projectionVersion: required(
      comparison.projectionVersion,
      parseAggregateVersion,
      "projection version",
    ),
    createdAt: date(comparison.createdAt, "comparison createdAt"),
  });
}

function rowScope(value: unknown): ValuationScope {
  const scope = object(value, "valuation scope");
  return {
    tenantId: required(scope.tenantId, parseTenantId, "tenant ID"),
    workspaceId: required(scope.workspaceId, parseWorkspaceId, "workspace ID"),
    dealId: required(scope.dealId, parseDealId, "deal ID"),
  };
}

function rowBasis(value: unknown) {
  const basis = object(value, "valuation basis");
  return createExactValuationBasis({
    scope: rowScope(basis.scope),
    modelId: required(basis.modelId, parseValuationModelId, "basis model ID"),
    modelVersion: required(
      basis.modelVersion,
      parseAggregateVersion,
      "basis model version",
    ),
    scenarioId: required(
      basis.scenarioId,
      parseValuationScenarioId,
      "basis scenario ID",
    ),
    scenarioVersion: required(
      basis.scenarioVersion,
      parseAggregateVersion,
      "basis scenario version",
    ),
    inputId: required(basis.inputId, parseValuationInputId, "basis input ID"),
    inputVersion: required(
      basis.inputVersion,
      parseAggregateVersion,
      "basis input version",
    ),
    references: basis.references as ValuationInput["basis"]["references"],
    basisDigest: text(basis.basisDigest, "basis digest"),
    capturedAt: date(basis.capturedAt, "basis capturedAt"),
  });
}

function rowDefinition(value: unknown): ValuationModel["definition"] {
  return object(
    value,
    "model definition",
  ) as unknown as ValuationModel["definition"];
}

function rowProvenance(value: unknown): ValuationInputProvenanceInput {
  const provenance = object(value, "input provenance");
  return {
    source: provenance.source as ValuationInputProvenanceInput["source"],
    actor: rowActor(provenance.actor),
    origin: provenance.origin as ValuationInputProvenanceInput["origin"],
    capturedAt: date(provenance.capturedAt, "provenance capturedAt"),
    note: optionalText(provenance.note),
  };
}

type ValuationInputProvenanceInput = Parameters<
  typeof createValuationInputProvenance
>[0];

function rowAuthority(value: unknown): ValuationAuthoritySnapshot {
  const authority = object(value, "authority snapshot");
  return {
    snapshotId: text(authority.snapshotId, "authority snapshot ID"),
    actorId: required(authority.actorId, parseActorId, "authority actor ID"),
    policyVersion: text(authority.policyVersion, "authority policy version"),
    scope: rowScope(authority.scope),
    capturedAt: date(authority.capturedAt, "authority capturedAt"),
  };
}

function rowActor(value: unknown): ActorReference {
  const actor = object(value, "actor");
  return {
    id: required(actor.id, parseActorId, "actor ID"),
    kind: enumValue(
      actor.kind,
      ["human", "ai", "service", "external"],
      "actor kind",
    ),
    state: enumValue(
      actor.state,
      ["active", "inactive", "revoked"],
      "actor state",
    ),
  };
}

function required<T>(
  value: unknown,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | {
    readonly ok: false;
    readonly issue?: unknown;
  },
  label: string,
): T {
  const parsed = parser(value);
  if (parsed.ok) return parsed.value;
  throw new ValuationError(
    "INVALID_INPUT",
    `Stored ${label} "${
      String(value)
    }" is invalid; expected a typed Valuation identifier.`,
  );
}

function optional<T>(
  value: unknown,
  parser: (
    value: unknown,
  ) => { readonly ok: true; readonly value: T } | {
    readonly ok: false;
    readonly issue?: unknown;
  },
  label: string,
): T | undefined {
  return value === null || value === undefined
    ? undefined
    : required(value, parser, label);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new ValuationError(
    "INVALID_INPUT",
    `Stored ${label} is invalid; expected a JSON object.`,
  );
}

function text(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim()) return value;
  throw new ValuationError(
    "INVALID_INPUT",
    `Stored ${label} "${String(value)}" is invalid; expected non-empty text.`,
  );
}

function optionalText(value: unknown): string | undefined {
  return value === undefined || value === null
    ? undefined
    : text(value, "optional text");
}

function date(value: unknown, label: string): Date {
  const result = new Date(String(value));
  if (!Number.isNaN(result.getTime())) return result;
  throw new ValuationError(
    "INVALID_INPUT",
    `Stored ${label} "${String(value)}" is invalid; expected an ISO timestamp.`,
  );
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  throw new ValuationError(
    "INVALID_INPUT",
    `Stored ${label} "${String(value)}" is invalid; expected one of ${
      allowed.join(", ")
    }.`,
  );
}
