import type { ValuationCalculation } from "../engines/valuation/types.ts";
import type { AggregateVersion } from "../platform/api/v1.ts";
import type { ValuationComparisonId, ValuationResultId } from "./ids.ts";
import { ValuationError } from "./errors.ts";
import {
  type ValuationComparison,
  type ValuationResult,
  type ValuationResultComparisonEntry,
} from "./model.ts";
import { sameScope, type ValuationScope } from "./basis.ts";

export function createValuationComparison(input: {
  readonly id: ValuationComparisonId;
  readonly scope: ValuationScope;
  readonly baselineResultId: ValuationResultId;
  readonly results: readonly ValuationResult[];
  readonly freshness: Readonly<Record<string, "current" | "stale">>;
  readonly now: Date;
}): ValuationComparison {
  if (input.results.length < 2) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation comparison "${input.id}" received ${input.results.length} results; expected at least two comparable results.`,
    );
  }
  const baseline = input.results.find(({ id }) =>
    id === input.baselineResultId
  );
  if (baseline === undefined) {
    throw new ValuationError(
      "REFERENCED_VERSION_MISMATCH",
      `Valuation comparison baseline "${input.baselineResultId}" was not present in the supplied result set; expected an exact result reference.`,
    );
  }
  const baselineMoney = moneyValue(baseline);
  const entries = input.results.map((result) =>
    comparisonEntry(result, input.scope, baselineMoney, input.freshness)
  );
  return Object.freeze({
    aggregateType: "valuation_comparison",
    id: input.id,
    scope: Object.freeze({ ...input.scope }),
    baselineResultId: input.baselineResultId,
    entries: Object.freeze(entries),
    projectionVersion: 1 as AggregateVersion,
    createdAt: new Date(input.now),
  });
}

function comparisonEntry(
  result: ValuationResult,
  scope: ValuationScope,
  baselineMoney: { readonly amount: number; readonly currency: string },
  freshness: Readonly<Record<string, "current" | "stale">>,
): ValuationResultComparisonEntry {
  if (!sameScope(result.scope, scope)) {
    throw new ValuationError(
      "SCOPE_MISMATCH",
      `Valuation result "${result.id}" belongs to a different deal scope; expected tenant "${scope.tenantId}", workspace "${scope.workspaceId}", and deal "${scope.dealId}".`,
    );
  }
  const value = moneyValue(result);
  if (value.currency !== baselineMoney.currency) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation result "${result.id}" currency "${value.currency}" differs from baseline currency "${baselineMoney.currency}"; expected an explicit FX conversion before comparison.`,
    );
  }
  return {
    resultId: result.id,
    method: calculationMethod(result),
    amount: value.amount,
    currency: value.currency,
    basisDigest: result.basis.basisDigest,
    modelVersion: result.modelVersion,
    scenarioVersion: result.scenarioVersion,
    freshness: freshness[result.id] ?? "current",
    deltaFromBaseline: value.amount - baselineMoney.amount,
  };
}

function calculationMethod(
  result: ValuationResult,
): ValuationResultComparisonEntry["method"] {
  if (!result.outcome.ok) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation result "${result.id}" has no method; expected a successful deterministic calculation.`,
    );
  }
  return result.outcome.value
    .method as ValuationResultComparisonEntry["method"];
}

function moneyValue(
  result: ValuationResult,
): { readonly amount: number; readonly currency: string } {
  if (!result.outcome.ok) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation result "${result.id}" has no successful monetary outcome; expected a successful deterministic calculation.`,
    );
  }
  const value = result.outcome.value as ValuationCalculation & {
    readonly value?: { readonly amount: number; readonly currency: string };
    readonly recommendedPurchasePrice?: {
      readonly amount: number;
      readonly currency: string;
    };
  };
  const money = "value" in value ? value.value : value.recommendedPurchasePrice;
  if (money === undefined) {
    throw new ValuationError(
      "INVALID_INPUT",
      `Valuation result "${result.id}" formula "${result.calculationProvenance.formulaId}" has no comparable money output; expected a valuation amount.`,
    );
  }
  return money;
}
