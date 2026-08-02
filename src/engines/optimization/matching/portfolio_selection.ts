import {
  eligibleCandidates,
  explanation,
  findCapacityFailure,
  findPreconditionFailure,
  orderCandidates,
  rankingContract,
} from "./selection_constraints.ts";
import {
  normalizeCriteria,
  validateRequest,
} from "./selection_input_validation.ts";
import {
  buildModel,
  infeasibleResult,
  optimalResult,
  solveCanonicalModel,
} from "./portfolio_model.ts";
import {
  type PortfolioSelectionRequest,
  type PortfolioSelectionResult,
} from "./types.ts";

/** Selects a deterministic portfolio without owning workflow or policy decisions.
 * @example selectPortfolio({ candidates, criteria }).status
 */
export function selectPortfolio(
  request: PortfolioSelectionRequest,
): PortfolioSelectionResult {
  validateRequest(request);
  const criteria = normalizeCriteria(
    request.criteria,
    request.candidates.length,
  );
  const ranking = rankingContract(criteria.seed);
  const ordered = orderCandidates(request.candidates, criteria.seed);
  const precondition = findPreconditionFailure(ordered, criteria);
  if (precondition) {
    return infeasibleResult(ranking, request.candidates.length, precondition);
  }

  const eligible = eligibleCandidates(ordered, criteria);
  if (eligible.length === 0) {
    return emptyCandidateResult(ranking, request.candidates.length);
  }
  const capacityFailure = findCapacityFailure(eligible, criteria);
  if (capacityFailure) {
    return infeasibleResult(ranking, eligible.length, capacityFailure);
  }

  const built = buildModel(eligible, criteria);
  const solution = solveCanonicalModel(
    built.model,
    built.variableKeys,
    eligible,
  );
  if (!solution.feasible) {
    return infeasibleResult(
      ranking,
      eligible.length,
      explanation(
        "CONSTRAINT_CONFLICT",
        "combined",
        "No portfolio satisfies the combined eligibility, risk-threshold, budget, tax-debt, sector-cap, mutual-exclusion, and selection-size constraints.",
      ),
    );
  }
  return optimalResult(solution, built.variableKeys, eligible, ranking);
}

export class PortfolioSelectionEngine {
  /** Runs the matching-owned portfolio selection seam. */
  public static select(
    request: PortfolioSelectionRequest,
  ): PortfolioSelectionResult {
    return selectPortfolio(request);
  }
}

function emptyCandidateResult(
  ranking: ReturnType<typeof rankingContract>,
  candidateCount: number,
): PortfolioSelectionResult {
  const empty = candidateCount === 0;
  return infeasibleResult(
    ranking,
    candidateCount,
    explanation(
      empty ? "EMPTY_CANDIDATE_SET" : "NO_ELIGIBLE_CANDIDATES",
      empty ? "candidate-set" : "eligibility",
      empty
        ? "The candidate set is empty."
        : "No candidates satisfy the supplied eligibility and risk constraints.",
    ),
  );
}
