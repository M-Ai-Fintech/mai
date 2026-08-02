import { invalid, missing } from "../../valuation/support.ts";
import type { CalculationError } from "../../valuation/types.ts";
import {
  legacyInterestCoverageCalculation,
  legacyLeverageCalculation,
} from "../valuation/compatibility.ts";
import type { FinancialData, KycData } from "../constraints.ts";
import type {
  DealProfile,
  GeneticConfig,
  TermSheetAlternative,
} from "../genetic.ts";
import { optimizeNegotiationProposal } from "./optimizer.ts";
import { NEGOTIATION_UTILITY_UNITS } from "./types.ts";
import type {
  ConstraintMetadata,
  ConstraintViolation,
  NegotiationOptimizerResult,
  OptimizerConfig,
  ProposalBound,
  ProposalBounds,
  UtilityFunction,
  UtilityModel,
} from "./types.ts";

export const COMPATIBILITY_POLICY_VERSION = "MAI-146-compatibility-v1";
export const COMPATIBILITY_EFFECTIVE_DATE = "2026-08-01";
export const COMPATIBILITY_EVIDENCE_VERSION = "legacy-consumer-v1";
export const COMPATIBILITY_SOURCE =
  "legacy negotiation compatibility default (not authoritative)";

export const LEGACY_NEGOTIATION_DEFAULT_CONFIG = {
  populationSize: 100,
  generations: 10,
  mutationRate: 0.1,
  tournamentSize: 3,
  crossoverRate: 0.8,
  seed: 0,
  alternativeCount: 3,
  stagnationGenerations: 8,
  minimumImprovement: 0.000001,
} as const;

export type LegacyNegotiationStatus =
  | "delegated"
  | "infeasible"
  | "unavailable"
  | "blocked";

export interface LegacyNegotiationInput {
  readonly profile: DealProfile;
  readonly kyc?: KycData;
  readonly financial?: FinancialData;
  readonly maxLeverage?: number;
  readonly minCoverage?: number;
  readonly geneticConfig?: Partial<GeneticConfig>;
  readonly compatibilityDefaults?: readonly string[];
  readonly enforceFinancialConstraints?: boolean;
}

export interface LegacyCompatibilityMetadata {
  readonly adapter: "negotiation-legacy-compatibility";
  readonly contractVersion: "negotiation-proposal-optimizer.v1";
  readonly status: LegacyNegotiationStatus;
  readonly nonAuthoritativeDefaults: readonly string[];
}

export interface LegacyNegotiationResult {
  readonly status: LegacyNegotiationStatus;
  readonly alternatives: readonly TermSheetAlternative[];
  readonly violations: readonly ConstraintViolation[];
  readonly authoritative: NegotiationOptimizerResult | null;
  readonly compatibility: LegacyCompatibilityMetadata;
  readonly error?: CalculationError;
}

export function optimizeLegacyNegotiation(
  input: LegacyNegotiationInput,
): LegacyNegotiationResult {
  const defaults = compatibilityDefaults(input);
  try {
    const kycResult = rejectBlockedKyc(input.kyc, defaults);
    if (kycResult) return kycResult;
    const financialResult = input.enforceFinancialConstraints
      ? enforceFinancialConstraints(input, defaults)
      : null;
    if (financialResult) return financialResult;
    const authoritative = optimizeNegotiationProposal({
      bounds: legacyBounds(input.profile),
      utilities: legacyUtilities(input.profile),
      seed: input.geneticConfig?.seed ?? LEGACY_NEGOTIATION_DEFAULT_CONFIG.seed,
      config: negotiationConfig(input.geneticConfig),
    });
    const status: LegacyNegotiationStatus = authoritative.status ===
        "feasible"
      ? "delegated"
      : "infeasible";
    return delegatedResult(status, authoritative, defaults);
  } catch (error: unknown) {
    const calculationError = invalid(
      "negotiationInput",
      error instanceof Error ? error.message : error,
      "a valid legacy negotiation input that satisfies typed optimizer bounds",
    );
    return unavailableResult(calculationError, defaults);
  }
}

function compatibilityDefaults(
  input: LegacyNegotiationInput,
): string[] {
  const defaults = new Set(input.compatibilityDefaults ?? []);
  const config = input.geneticConfig;
  if (config?.populationSize === undefined) {
    defaults.add("populationSize=100 compatibility default");
  }
  if (config?.generations === undefined) {
    defaults.add("generations=10 compatibility default");
  }
  if (config?.mutationRate === undefined) {
    defaults.add("mutationRate=0.1 compatibility default");
  }
  if (config?.tournamentSize === undefined) {
    defaults.add("tournamentSize=3 compatibility default");
  }
  if (config?.crossoverRate === undefined) {
    defaults.add("crossoverRate=0.8 compatibility default");
  }
  if (config?.seed === undefined) {
    defaults.add("seed=0 compatibility default");
  }
  if (config?.alternativeCount === undefined) {
    defaults.add("alternativeCount=3 compatibility default");
  }
  if (config?.stagnationGenerations === undefined) {
    defaults.add("stagnationGenerations=8 compatibility default");
  }
  if (config?.minimumImprovement === undefined) {
    defaults.add("minimumImprovement=0.000001 compatibility default");
  }
  if (input.enforceFinancialConstraints && input.maxLeverage === undefined) {
    defaults.add("maxLeverage=4 compatibility default");
  }
  if (input.enforceFinancialConstraints && input.minCoverage === undefined) {
    defaults.add("minCoverage=2.5 compatibility default");
  }
  return [...defaults];
}

function enforceFinancialConstraints(
  input: LegacyNegotiationInput,
  defaults: readonly string[],
): LegacyNegotiationResult | null {
  if (!input.financial) {
    return unavailableResult(
      missing("financial", "debt, EBITDA, and interest expense values"),
      defaults,
    );
  }
  const maxLeverage = input.maxLeverage ?? 4;
  const minCoverage = input.minCoverage ?? 2.5;
  if (!Number.isFinite(maxLeverage) || maxLeverage < 0) {
    return unavailableResult(
      invalid("maxLeverage", maxLeverage, "a finite non-negative threshold"),
      defaults,
    );
  }
  if (!Number.isFinite(minCoverage) || minCoverage < 0) {
    return unavailableResult(
      invalid("minCoverage", minCoverage, "a finite non-negative threshold"),
      defaults,
    );
  }
  const leverage = legacyLeverageCalculation(
    input.financial.debt,
    input.financial.ebitda,
  );
  if (!leverage.ok) return unavailableResult(leverage.error, defaults);
  const coverage = legacyInterestCoverageCalculation(
    input.financial.ebitda,
    input.financial.interestExpense,
  );
  if (!coverage.ok) return unavailableResult(coverage.error, defaults);
  const violations = [
    ratioViolation(
      "legacy-leverage-rule",
      leverage.value.ratio.value,
      maxLeverage,
      `Leverage ratio ${leverage.value.ratio.value} exceeds maximum ${maxLeverage}.`,
    ),
    ratioViolation(
      "legacy-coverage-rule",
      coverage.value.ratio.value,
      minCoverage,
      `EBITDA coverage ${coverage.value.ratio.value} is below minimum ${minCoverage}.`,
    ),
  ].filter((violation): violation is ConstraintViolation => violation !== null);
  if (violations.length === 0) return null;
  return statusResult("infeasible", defaults, violations);
}

function rejectBlockedKyc(
  kyc: KycData | undefined,
  defaults: readonly string[],
): LegacyNegotiationResult | null {
  if (!kyc) return null;
  const reason = kyc.kycBlocked
    ? "Blocked by KYC policy."
    : kyc.sanctionMatch
    ? "Blocked by sanction match."
    : kyc.pepExposure
    ? "Blocked due to PEP exposure."
    : null;
  if (reason === null) return null;
  return statusResult("blocked", defaults, [
    {
      constraintId: "legacy-kyc-rule",
      kind: "compatibility-policy",
      enforcement: "mandatory",
      message: reason,
      actual: null,
      expected: "no KYC, sanction, or PEP block flag",
      units: "boolean",
      source: COMPATIBILITY_SOURCE,
      metadata: compatibilityMetadata("boolean", "KYC"),
    },
  ]);
}

function delegatedResult(
  status: LegacyNegotiationStatus,
  authoritative: NegotiationOptimizerResult,
  defaults: readonly string[],
): LegacyNegotiationResult {
  return {
    status,
    alternatives: authoritative.alternatives.filter((alternative) =>
      alternative.feasible
    ).map(toLegacyAlternative),
    violations: authoritative.violations,
    authoritative,
    compatibility: metadata(status, defaults),
  };
}

function unavailableResult(
  error: CalculationError,
  defaults: readonly string[],
): LegacyNegotiationResult {
  return {
    ...statusResult("unavailable", defaults, [calculationViolation(error)]),
    error,
  };
}

function statusResult(
  status: LegacyNegotiationStatus,
  defaults: readonly string[],
  violations: readonly ConstraintViolation[],
): LegacyNegotiationResult {
  return {
    status,
    alternatives: [],
    violations,
    authoritative: null,
    compatibility: metadata(status, defaults),
  };
}

function metadata(
  status: LegacyNegotiationStatus,
  defaults: readonly string[],
): LegacyCompatibilityMetadata {
  return {
    adapter: "negotiation-legacy-compatibility",
    contractVersion: "negotiation-proposal-optimizer.v1",
    status,
    nonAuthoritativeDefaults: [...defaults],
  };
}

function negotiationConfig(
  config: Partial<GeneticConfig> | undefined,
): Partial<OptimizerConfig> {
  return {
    populationSize: config?.populationSize ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.populationSize,
    maxGenerations: config?.generations ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.generations,
    mutationRate: config?.mutationRate ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.mutationRate,
    tournamentSize: config?.tournamentSize ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.tournamentSize,
    crossoverRate: config?.crossoverRate ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.crossoverRate,
    alternativeCount: config?.alternativeCount ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.alternativeCount,
    stagnationGenerations: config?.stagnationGenerations ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.stagnationGenerations,
    minimumImprovement: config?.minimumImprovement ??
      LEGACY_NEGOTIATION_DEFAULT_CONFIG.minimumImprovement,
  };
}

function legacyBounds(profile: DealProfile): ProposalBounds {
  return {
    valuation: bound(
      "valuation",
      profile.valuationMin,
      profile.valuationMax,
      "valuation-amount",
    ),
    cashPercentage: bound("cash", 0, 1, "fraction"),
    equityPercentage: bound("equity", 0, 1, "fraction"),
    earnOutPercentage: bound("earn-out", 0, 1, "fraction"),
    escrowPercentage: bound("escrow", 0, 1, "fraction"),
    earnOutTargetYears: bound("earn-out-years", 1, 5, "years"),
    nonCompeteMonths: bound("non-compete-months", 12, 60, "months"),
  };
}

function legacyUtilities(profile: DealProfile): UtilityModel {
  const weights = {
    valuation: 0.2,
    cashPercentage: 0.2,
    equityPercentage: 0.2,
    earnOutPercentage: 0.1,
    escrowPercentage: 0.1,
    earnOutTargetYears: 0.1,
    nonCompeteMonths: 0.1,
  };
  const targets = {
    cashPercentage: profile.preferences.cash,
    equityPercentage: profile.preferences.equity,
    earnOutPercentage: profile.preferences.earnOut,
    escrowPercentage: profile.preferences.escrow,
  };
  return {
    buyer: legacyUtility("buyer", "lower", weights, targets),
    seller: legacyUtility("seller", "higher", weights, targets),
    reservation: {
      buyer: reservation("buyer", 0.2),
      seller: reservation("seller", 0.2),
    },
  };
}

function legacyUtility(
  side: string,
  valuationDirection: "higher" | "lower",
  weights: UtilityModel["buyer"]["weights"],
  targets: UtilityFunction["targets"],
): UtilityFunction {
  return {
    id: `legacy-${side}`,
    version: COMPATIBILITY_POLICY_VERSION,
    units: NEGOTIATION_UTILITY_UNITS,
    weights,
    directions: {
      valuation: valuationDirection,
      cashPercentage: "higher",
      equityPercentage: "higher",
      earnOutPercentage: "higher",
      escrowPercentage: "higher",
      earnOutTargetYears: "higher",
      nonCompeteMonths: "higher",
    },
    targets,
  };
}

function reservation(
  side: "buyer" | "seller",
  minimum: number,
): UtilityModel["reservation"]["buyer"] {
  return {
    minimum,
    metadata: compatibilityMetadata(
      NEGOTIATION_UTILITY_UNITS,
      `${side} reservation`,
    ),
  };
}

function bound(
  id: string,
  minimum: number,
  maximum: number,
  units: string,
): ProposalBound {
  return {
    id,
    minimum,
    maximum,
    metadata: compatibilityMetadata(units, id),
  };
}

export function compatibilityMetadata(
  units: string,
  field: string,
): ConstraintMetadata {
  return {
    source: `${COMPATIBILITY_SOURCE}: ${field}`,
    policyVersion: COMPATIBILITY_POLICY_VERSION,
    units,
    effectiveDate: COMPATIBILITY_EFFECTIVE_DATE,
    evidenceVersion: COMPATIBILITY_EVIDENCE_VERSION,
    enforcement: "mandatory",
    ...(units === "fraction"
      ? { percentageRepresentation: "fraction" as const }
      : {}),
  };
}

function ratioViolation(
  constraintId: string,
  actual: number,
  expected: number,
  message: string,
): ConstraintViolation | null {
  const isLeverage = constraintId.includes("leverage");
  if (isLeverage ? actual <= expected : actual >= expected) return null;
  return {
    constraintId,
    kind: "dimension-range",
    enforcement: "mandatory",
    message,
    actual,
    expected: isLeverage ? `<= ${expected}` : `>= ${expected}`,
    units: "multiple",
    source: COMPATIBILITY_SOURCE,
    metadata: compatibilityMetadata("multiple", constraintId),
  };
}

function calculationViolation(error: CalculationError): ConstraintViolation {
  return {
    constraintId: `calculation-${error.field}`,
    kind: "required-input",
    enforcement: "mandatory",
    message: error.message,
    actual: null,
    expected: error.expected,
    units: "typed-calculation",
    source: COMPATIBILITY_SOURCE,
    metadata: compatibilityMetadata("typed-calculation", error.field),
  };
}

function toLegacyAlternative(alternative: {
  proposal: {
    valuation: number;
    cashPercentage: number;
    equityPercentage: number;
    earnOutPercentage: number;
    escrowPercentage: number;
  };
  fitness: number;
}): TermSheetAlternative {
  return {
    valuation: alternative.proposal.valuation,
    cashPercentage: alternative.proposal.cashPercentage,
    equityPercentage: alternative.proposal.equityPercentage,
    earnOutPercentage: alternative.proposal.earnOutPercentage,
    escrowPercentage: alternative.proposal.escrowPercentage,
    fitness: alternative.fitness,
  };
}
