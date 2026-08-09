import { z } from "zod";
import {
  ELIGIBILITY_CONTRACT_VERSION,
  LEGACY_ADAPTER_CONTRACT_VERSION,
} from "../../engines/optimization/matching/types.ts";
import {
  constraintMetadataSchema,
  NEGOTIATION_OPTIMIZER_ALGORITHM_VERSION,
  NEGOTIATION_OPTIMIZER_CONTRACT_VERSION,
  NEGOTIATION_UTILITY_UNITS,
  negotiationOptimizerInputSchema,
  optimizerConfigSchema,
} from "../../engines/optimization/negotiation/types.ts";

const finiteNumber = z.number().finite();
const currency = z.enum(["BRL", "USD", "EUR"]);

const moneySchema = z.object({
  amount: finiteNumber,
  currency,
}).strict();

const percentageSchema = z.object({
  decimal: finiteNumber,
}).strict();

const cashFlowSchema = z.object({
  period: z.object({ value: finiteNumber, unit: z.literal("years") }).strict(),
  amount: moneySchema,
}).strict();

const calculationOptionsSchema = z.object({
  rounding: z.object({
    moneyScale: z.number().int().min(0).max(12),
    ratioScale: z.number().int().min(0).max(12),
    mode: z.literal("half-up"),
  }).strict(),
}).strict();

const eligibilityEvidenceSchema = z.object({
  evidenceVersion: z.string().min(1),
  findingId: z.string().min(1),
  decisionRecordId: z.string().min(1),
  policyVersion: z.string().min(1),
  actorOrApprovalAuthority: z.string().min(1),
  effectiveAt: z.string().min(1),
  staleness: z.enum(["current", "stale", "unknown"]),
}).strict();

const eligibilitySchema = z.union([
  z.object({
    contractVersion: z.literal(ELIGIBILITY_CONTRACT_VERSION),
    status: z.enum([
      "eligible",
      "ineligible",
      "unavailable",
      "unresolved",
      "restricted",
      "unauthorized",
    ]),
    evidence: eligibilityEvidenceSchema,
  }).strict(),
  z.object({
    contractVersion: z.literal(LEGACY_ADAPTER_CONTRACT_VERSION),
    status: z.literal("legacy-compatible"),
  }).strict(),
]);

const matchingCandidateSchema = z.object({
  id: z.string().min(1),
  synergyValue: finiteNumber,
  acquisitionCost: finiteNumber.min(0),
  sector: z.string().min(1),
  riskScore: finiteNumber.min(0),
  taxDebt: finiteNumber.min(0),
  eligibility: eligibilitySchema,
}).strict();

const portfolioCriteriaSchema = z.object({
  budgetLimit: finiteNumber.min(0),
  riskThreshold: finiteNumber.min(0).max(1),
  taxDebtCap: finiteNumber.min(0),
  sectorAllocationCaps: z.record(z.string(), finiteNumber.min(0)).optional(),
  excludedCandidateIds: z.array(z.string().min(1)).optional(),
  mutualExclusions: z.array(
    z.tuple([z.string().min(1), z.string().min(1)]),
  ).optional(),
  mandatoryCandidateIds: z.array(z.string().min(1)).optional(),
  mandatoryInclusions: z.array(z.string().min(1)).optional(),
  minSelectionSize: z.number().int().min(0).optional(),
  maxSelectionSize: z.number().int().min(0).optional(),
  minimumSelectionSize: z.number().int().min(0).optional(),
  maximumSelectionSize: z.number().int().min(0).optional(),
  seed: z.number().int().min(-9007199254740991).max(9007199254740991)
    .optional(),
}).strict();

export const governedCalculationInputSchema = z.object({
  dealId: z.string().min(1),
  query: z.string().min(1),
  context: z.record(z.unknown()),
}).strict();

export const portfolioSelectionCalculationContextSchema = z.object({
  candidates: z.array(matchingCandidateSchema),
  criteria: portfolioCriteriaSchema,
}).strict();

export const synergyPricingCalculationContextSchema = z.object({
  standaloneValue: moneySchema,
  costSynergies: z.array(cashFlowSchema).min(1),
  revenueSynergies: z.array(cashFlowSchema).min(1),
  integrationCosts: z.array(cashFlowSchema).min(1),
  discountRate: percentageSchema,
  taxRate: percentageSchema,
  revenueHaircut: percentageSchema,
  sharingCoefficient: percentageSchema,
  options: calculationOptionsSchema,
}).strict();

export const negotiationProposalCalculationContextSchema =
  negotiationOptimizerInputSchema.strict();

const calculationReceiptBaseSchema = z.object({
  capability: z.string().min(1),
  purePort: z.string().min(1),
  operation: z.string().min(1),
  action: z.string().min(1),
  engineReference: z.string().min(1),
});

const portfolioSelectionResultSchema = z.object({
  contractVersion: z.literal("matching-portfolio/v1"),
  status: z.enum(["optimal", "infeasible"]),
  selectedCandidateIds: z.array(z.string()),
  totals: z.object({
    synergyValue: finiteNumber,
    acquisitionCost: finiteNumber,
    taxDebt: finiteNumber,
    selectionCount: z.number().int().min(0),
  }).strict(),
  ranking: z.object({
    contractVersion: z.literal("matching-portfolio/v1"),
    objective: z.literal("synergyValue"),
    direction: z.literal("maximize"),
    tieBreaker: z.enum([
      "candidate-id-ascending",
      "seeded-candidate-order",
    ]),
    tieBreakMethod: z.literal("lexicographic-reoptimization"),
    seed: z.number().int().optional(),
  }).strict(),
  explanations: z.array(
    z.object({
      code: z.enum([
        "EMPTY_CANDIDATE_SET",
        "NO_ELIGIBLE_CANDIDATES",
        "MANDATORY_INCLUSION_UNAVAILABLE",
        "MANDATORY_INCLUSION_EXCLUDED",
        "MANDATORY_INCLUSION_RISK_EXCEEDED",
        "MANDATORY_INCLUSION_CONFLICT",
        "MANDATORY_INCLUSION_OVER_BUDGET",
        "MANDATORY_INCLUSION_OVER_TAX_DEBT_CAP",
        "MANDATORY_INCLUSION_OVER_SECTOR_CAP",
        "SELECTION_SIZE_CONFLICT",
        "MIN_SELECTION_UNREACHABLE",
        "CONSTRAINT_CONFLICT",
      ]),
      constraint: z.enum([
        "candidate-set",
        "eligibility",
        "risk-threshold",
        "mandatory-inclusion",
        "budget",
        "tax-debt",
        "sector-cap",
        "selection-size",
        "mutual-exclusion",
        "combined",
      ]),
      message: z.string().min(1),
    }).strict(),
  ),
  consideredCandidateCount: z.number().int().min(0),
}).strict();

const synergyResultSchema = z.object({
  method: z.literal("synergy-pricing"),
  presentValueCostSynergies: moneySchema,
  presentValueRevenueSynergies: moneySchema,
  presentValueIntegrationCosts: moneySchema,
  netSynergyValue: moneySchema,
  sellerPremium: moneySchema,
  recommendedPurchasePrice: moneySchema,
  sharingCoefficient: percentageSchema,
}).strict();

const utilityScoreSchema = z.object({
  total: finiteNumber,
  units: z.literal(NEGOTIATION_UTILITY_UNITS),
  components: z.object({
    valuation: finiteNumber,
    cashPercentage: finiteNumber,
    equityPercentage: finiteNumber,
    earnOutPercentage: finiteNumber,
    escrowPercentage: finiteNumber,
    earnOutTargetYears: finiteNumber,
    nonCompeteMonths: finiteNumber,
  }).strict(),
}).strict();

const constraintViolationSchema = z.object({
  constraintId: z.string().min(1),
  kind: z.string().min(1),
  enforcement: z.enum(["mandatory", "advisory"]),
  message: z.string().min(1),
  actual: finiteNumber.nullable(),
  expected: z.string().min(1),
  units: z.string().min(1),
  source: z.string().min(1),
  metadata: constraintMetadataSchema.strict(),
}).strict();

const negotiationProposalOutputSchema = z.object({
  valuation: finiteNumber.min(0),
  cashPercentage: finiteNumber.min(0).max(1),
  equityPercentage: finiteNumber.min(0).max(1),
  earnOutPercentage: finiteNumber.min(0).max(1),
  escrowPercentage: finiteNumber.min(0).max(1),
  earnOutTargetYears: finiteNumber.min(0),
  nonCompeteMonths: finiteNumber.int().min(0),
}).strict();

const rankedAlternativeSchema = z.object({
  rank: z.number().int().positive(),
  proposal: negotiationProposalOutputSchema,
  buyerUtility: utilityScoreSchema,
  sellerUtility: utilityScoreSchema,
  fitness: finiteNumber,
  feasible: z.boolean(),
  violations: z.array(constraintViolationSchema),
}).strict();

const negotiationResultSchema = z.object({
  status: z.enum(["feasible", "infeasible"]),
  best: rankedAlternativeSchema.nullable(),
  alternatives: z.array(rankedAlternativeSchema),
  violations: z.array(constraintViolationSchema),
  replay: z.object({
    seed: z.number().int().min(0).max(4294967295),
    contractVersion: z.literal(NEGOTIATION_OPTIMIZER_CONTRACT_VERSION),
    algorithmVersion: z.literal(NEGOTIATION_OPTIMIZER_ALGORITHM_VERSION),
    config: optimizerConfigSchema,
  }).strict(),
  termination: z.object({
    reason: z.enum(["converged", "max-generations", "infeasible"]),
    generations: z.number().int().min(0),
    evaluations: z.number().int().min(0),
    bestFitness: finiteNumber,
    stagnantGenerations: z.number().int().min(0),
  }).strict(),
}).strict();

const portfolioCalculationProposalSchema = calculationReceiptBaseSchema
  .extend({
    capability: z.literal("calculation.portfolio"),
    purePort: z.literal("portfolio-selection"),
    operation: z.literal("select_portfolio"),
    action: z.literal("select_portfolio"),
    engineReference: z.literal(
      "src/engines/optimization/matching/portfolio_selection.ts",
    ),
    result: portfolioSelectionResultSchema,
  }).strict();

const synergyCalculationProposalSchema = calculationReceiptBaseSchema
  .extend({
    capability: z.literal("calculation.synergy"),
    purePort: z.literal("synergy-pricing"),
    operation: z.literal("calculate_synergy_price"),
    action: z.literal("calculate_synergy_price"),
    engineReference: z.literal("src/engines/valuation/synergy_calculation.ts"),
    result: synergyResultSchema,
  }).strict();

const termSheetCalculationProposalSchemaInternal = calculationReceiptBaseSchema
  .extend({
    capability: z.literal("calculation.term-sheet"),
    purePort: z.literal("negotiation-proposal-optimizer"),
    operation: z.literal("optimize_term_sheet"),
    action: z.literal("optimize_term_sheet"),
    engineReference: z.literal(
      "src/engines/optimization/negotiation/optimizer.ts",
    ),
    result: negotiationResultSchema,
  }).strict();

export const matchingCalculationProposalSchema = z.union([
  portfolioCalculationProposalSchema,
  synergyCalculationProposalSchema,
]);

export const termSheetCalculationProposalSchema =
  termSheetCalculationProposalSchemaInternal;

export const calculationProposalSchema = z.union([
  portfolioCalculationProposalSchema,
  synergyCalculationProposalSchema,
  termSheetCalculationProposalSchemaInternal,
]);

export function parseCalculationContext<T>(
  input: unknown,
  schema: z.ZodType<T>,
  capability: string,
): T {
  const envelope = governedCalculationInputSchema.safeParse(input);
  if (!envelope.success) {
    throw invalidCalculationInput(capability, envelope.error);
  }
  const context = schema.safeParse(envelope.data.context);
  if (!context.success) {
    throw invalidCalculationInput(capability, context.error);
  }
  return context.data;
}

function invalidCalculationInput(
  capability: string,
  error: z.ZodError,
): Error {
  const issue = error.issues[0];
  const path = issue?.path.join(".") || "context";
  const received = issue !== undefined && "received" in issue
    ? String(issue.received)
    : issue?.code ?? "invalid";
  const expected = issue?.message ?? "the closed capability-specific context";
  return new Error(
    'Calculation input for "' + capability + '" was invalid at "' + path +
      '"; received ' + received + "; expected " + expected + ".",
  );
}
