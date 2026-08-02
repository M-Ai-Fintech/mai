import { selectPortfolio } from "./portfolio_selection.ts";
import {
  LEGACY_ADAPTER_CONTRACT_VERSION,
  type LegacyCompatibilityEligibility,
  type MatchingCandidate,
  type PortfolioSelectionCriteria,
  type PortfolioSelectionResult,
} from "./types.ts";
import type {
  PortfolioCriteria,
  PortfolioResult,
  TargetRawInput,
} from "../types.ts";

type EvaluatedProfiles = PortfolioResult["evaluatedProfiles"];

/** Preserves legacy portfolio DTOs while delegating selection to matching. */
export class LegacyPortfolioSolver {
  public static async evaluateAndOptimize(
    targets: TargetRawInput[],
    criteria: PortfolioCriteria,
  ): Promise<PortfolioResult> {
    const evaluatedProfiles = evaluateProfiles(targets);
    const result = selectPortfolio({
      candidates: targets.map(toMatchingCandidate),
      criteria: toSelectionCriteria(criteria),
    });
    await Promise.resolve();
    return toLegacyResult(result, evaluatedProfiles);
  }
}

function toMatchingCandidate(target: TargetRawInput): MatchingCandidate {
  return {
    id: target.id,
    synergyValue: target.synergyValue,
    acquisitionCost: target.acquisitionCost,
    sector: target.businessSector,
    riskScore: target.historicalVolatility,
    taxDebt: target.taxDebtsAmount ?? 0,
    eligibility: legacyEligibility(),
  };
}

function legacyEligibility(): LegacyCompatibilityEligibility {
  return {
    contractVersion: LEGACY_ADAPTER_CONTRACT_VERSION,
    status: "legacy-compatible",
  };
}

function toSelectionCriteria(
  criteria: PortfolioCriteria,
): PortfolioSelectionCriteria {
  return {
    budgetLimit: criteria.budgetLimit,
    riskThreshold: criteria.riskToleranceLimit,
    taxDebtCap: criteria.taxDebtCap,
    sectorAllocationCaps: criteria.sectorAllocationCaps,
    mutualExclusions: (criteria.mutualExclusions ?? []).map((
      [left, right],
    ) => [left, right]),
  };
}

function evaluateProfiles(targets: TargetRawInput[]): EvaluatedProfiles {
  return Object.fromEntries(
    [...targets].sort((left, right) => compareText(left.id, right.id)).map((
      target,
    ) => [
      target.id,
      { metrics: { insolvencyRisk: target.historicalVolatility } },
    ]),
  );
}

function toLegacyResult(
  result: PortfolioSelectionResult,
  evaluatedProfiles: EvaluatedProfiles,
): PortfolioResult {
  return {
    optimization: {
      status: result.status,
      selectedTargetIds: [...result.selectedCandidateIds],
    },
    totalSynergy: result.totals.synergyValue,
    totalCost: result.totals.acquisitionCost,
    evaluatedProfiles,
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
