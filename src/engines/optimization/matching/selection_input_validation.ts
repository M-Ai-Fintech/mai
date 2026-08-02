import {
  type CandidateEligibility,
  ELIGIBILITY_CONTRACT_VERSION,
  type EligibilityEvidence,
  LEGACY_ADAPTER_CONTRACT_VERSION,
  type LegacyCompatibilityEligibility,
  type MatchingCandidate,
  type PortfolioSelectionCriteria,
  type PortfolioSelectionRequest,
} from "./types.ts";

export interface NormalizedCriteria {
  readonly budgetLimit: number;
  readonly riskThreshold: number;
  readonly taxDebtCap: number;
  readonly sectorAllocationCaps: Readonly<Record<string, number>>;
  readonly excludedCandidateIds: readonly string[];
  readonly mutualExclusions: readonly (readonly [string, string])[];
  readonly mandatoryCandidateIds: readonly string[];
  readonly minSelectionSize: number;
  readonly maxSelectionSize: number;
  readonly seed?: number;
}

export function validateRequest(request: PortfolioSelectionRequest): void {
  if (!request || !Array.isArray(request.candidates) || !request.criteria) {
    throw new TypeError(
      `Selection request was ${
        describe(request)
      }; expected candidates and criteria.`,
    );
  }
  validateCandidates(request.candidates);
  validateCriteria(request.criteria);
}

function validateCandidates(candidates: readonly MatchingCandidate[]): void {
  const ids = new Set<string>();
  candidates.forEach((candidate, index) => {
    assertText(`candidates[${index}].id`, candidate.id);
    if (ids.has(candidate.id)) {
      throw new TypeError(
        `Candidate id "${candidate.id}" was duplicated; expected unique ids.`,
      );
    }
    ids.add(candidate.id);
    assertFiniteNumber(
      `candidates[${index}].synergyValue`,
      candidate.synergyValue,
    );
    assertNonNegative(
      `candidates[${index}].acquisitionCost`,
      candidate.acquisitionCost,
    );
    assertText(`candidates[${index}].sector`, candidate.sector);
    assertNonNegative(`candidates[${index}].riskScore`, candidate.riskScore);
    assertNonNegative(`candidates[${index}].taxDebt`, candidate.taxDebt);
    validateEligibility(candidate.eligibility, index);
  });
}

function validateEligibility(
  eligibility: CandidateEligibility,
  index: number,
): void {
  if (!eligibility) {
    throw new TypeError(
      `candidates[${index}].eligibility was ${
        describe(eligibility)
      }; expected a versioned eligibility decision.`,
    );
  }
  const version =
    (eligibility as { contractVersion?: unknown }).contractVersion;
  if (version === LEGACY_ADAPTER_CONTRACT_VERSION) {
    const legacy = eligibility as LegacyCompatibilityEligibility;
    if (legacy.status !== "legacy-compatible") {
      throw new TypeError(
        `candidates[${index}].eligibility.status was ${
          describe(legacy.status)
        }; expected legacy-compatible.`,
      );
    }
    return;
  }
  if (version !== ELIGIBILITY_CONTRACT_VERSION) {
    throw new TypeError(
      `candidates[${index}].eligibility.contractVersion was ${
        describe(version)
      }; expected ${ELIGIBILITY_CONTRACT_VERSION}.`,
    );
  }
  validateEvidence(
    (eligibility as Extract<
      CandidateEligibility,
      { contractVersion: typeof ELIGIBILITY_CONTRACT_VERSION }
    >).evidence,
    index,
  );
}

function validateEvidence(
  evidence: EligibilityEvidence,
  index: number,
): void {
  const fields = [
    ["evidenceVersion", evidence.evidenceVersion],
    ["findingId", evidence.findingId],
    ["decisionRecordId", evidence.decisionRecordId],
    ["policyVersion", evidence.policyVersion],
    ["actorOrApprovalAuthority", evidence.actorOrApprovalAuthority],
    ["effectiveAt", evidence.effectiveAt],
  ] as const;
  for (const [field, value] of fields) {
    assertText(`candidates[${index}].eligibility.evidence.${field}`, value);
  }
  if (!Number.isFinite(Date.parse(evidence.effectiveAt))) {
    throw new TypeError(
      `candidates[${index}].eligibility.evidence.effectiveAt was ${
        describe(evidence.effectiveAt)
      }; expected an ISO date.`,
    );
  }
  if (
    !(["current", "stale", "unknown"] as const).includes(
      evidence.staleness as "current" | "stale" | "unknown",
    )
  ) {
    throw new TypeError(
      `candidates[${index}].eligibility.evidence.staleness was ${
        describe(evidence.staleness)
      }; expected current, stale, or unknown.`,
    );
  }
}

function validateCriteria(criteria: PortfolioSelectionCriteria): void {
  assertNonNegative("criteria.budgetLimit", criteria.budgetLimit);
  assertRange("criteria.riskThreshold", criteria.riskThreshold, 0, 1);
  assertNonNegative("criteria.taxDebtCap", criteria.taxDebtCap);
  for (
    const [sector, cap] of Object.entries(criteria.sectorAllocationCaps ?? {})
  ) {
    assertText("criteria.sectorAllocationCaps sector", sector);
    assertNonNegative(`criteria.sectorAllocationCaps[${sector}]`, cap);
  }
  validateIdList(
    criteria.excludedCandidateIds,
    "criteria.excludedCandidateIds",
  );
  validateIdList(
    criteria.mandatoryCandidateIds,
    "criteria.mandatoryCandidateIds",
  );
  validateIdList(criteria.mandatoryInclusions, "criteria.mandatoryInclusions");
  for (const [index, pair] of (criteria.mutualExclusions ?? []).entries()) {
    if (pair.length !== 2 || pair[0] === pair[1]) {
      throw new TypeError(
        `criteria.mutualExclusions[${index}] was ${
          describe(pair)
        }; expected two distinct candidate ids.`,
      );
    }
    assertText(`criteria.mutualExclusions[${index}][0]`, pair[0]);
    assertText(`criteria.mutualExclusions[${index}][1]`, pair[1]);
  }
  validateSize(criteria.minSelectionSize, "criteria.minSelectionSize");
  validateSize(criteria.maxSelectionSize, "criteria.maxSelectionSize");
  validateSize(criteria.minimumSelectionSize, "criteria.minimumSelectionSize");
  validateSize(criteria.maximumSelectionSize, "criteria.maximumSelectionSize");
  if (criteria.seed !== undefined && !Number.isSafeInteger(criteria.seed)) {
    throw new TypeError(
      `criteria.seed was ${describe(criteria.seed)}; expected a safe integer.`,
    );
  }
  assertMatchingSizeAliases(
    criteria.minSelectionSize,
    criteria.minimumSelectionSize,
    "minimum",
  );
  assertMatchingSizeAliases(
    criteria.maxSelectionSize,
    criteria.maximumSelectionSize,
    "maximum",
  );
}

function validateIdList(
  ids: readonly string[] | undefined,
  field: string,
): void {
  for (const [index, id] of (ids ?? []).entries()) {
    assertText(`${field}[${index}]`, id);
  }
}

function validateSize(value: number | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(
      `${field} was ${describe(value)}; expected a non-negative safe integer.`,
    );
  }
}

function assertMatchingSizeAliases(
  primary: number | undefined,
  alias: number | undefined,
  label: string,
): void {
  if (primary !== undefined && alias !== undefined && primary !== alias) {
    throw new TypeError(
      `criteria ${label} selection sizes were ${primary} and ${alias}; expected matching values.`,
    );
  }
}

export function normalizeCriteria(
  criteria: PortfolioSelectionCriteria,
  candidateCount: number,
): NormalizedCriteria {
  const mandatoryCandidateIds = uniqueIds([
    ...(criteria.mandatoryCandidateIds ?? []),
    ...(criteria.mandatoryInclusions ?? []),
  ]);
  const minSelectionSize = criteria.minSelectionSize ??
    criteria.minimumSelectionSize ?? 0;
  const maxSelectionSize = criteria.maxSelectionSize ??
    criteria.maximumSelectionSize ?? candidateCount;
  return {
    budgetLimit: criteria.budgetLimit,
    riskThreshold: criteria.riskThreshold,
    taxDebtCap: criteria.taxDebtCap,
    sectorAllocationCaps: criteria.sectorAllocationCaps ?? {},
    excludedCandidateIds: uniqueIds(criteria.excludedCandidateIds ?? []),
    mutualExclusions: criteria.mutualExclusions ?? [],
    mandatoryCandidateIds,
    minSelectionSize,
    maxSelectionSize,
    seed: criteria.seed,
  };
}

function uniqueIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)];
}

function assertText(field: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(
      `${field} was ${describe(value)}; expected a non-empty string.`,
    );
  }
}

function assertFiniteNumber(
  field: string,
  value: unknown,
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(
      `${field} was ${describe(value)}; expected a finite number.`,
    );
  }
}

function assertNonNegative(
  field: string,
  value: unknown,
): asserts value is number {
  assertFiniteNumber(field, value);
  if (value < 0) {
    throw new TypeError(
      `${field} was ${describe(value)}; expected a non-negative number.`,
    );
  }
}

function assertRange(
  field: string,
  value: unknown,
  minimum: number,
  maximum: number,
): asserts value is number {
  assertFiniteNumber(field, value);
  if (value < minimum || value > maximum) {
    throw new TypeError(
      `${field} was ${
        describe(value)
      }; expected a number between ${minimum} and ${maximum}.`,
    );
  }
}

function describe(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
