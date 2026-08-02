import { z } from "zod";

export const NEGOTIATION_OPTIMIZER_CONTRACT_VERSION =
  "negotiation-proposal-optimizer.v1";
export const NEGOTIATION_OPTIMIZER_ALGORITHM_VERSION =
  "seeded-genetic-search.v1";
export const NEGOTIATION_UTILITY_UNITS = "normalized-utility[0,1]";

const finiteNumber = z.number().finite();
const percentage = finiteNumber.min(0).max(1);

export const proposalDimensionSchema = z.enum([
  "valuation",
  "cashPercentage",
  "equityPercentage",
  "earnOutPercentage",
  "escrowPercentage",
  "earnOutTargetYears",
  "nonCompeteMonths",
]);
export type ProposalDimension = z.infer<typeof proposalDimensionSchema>;

export const constraintMetadataSchema = z.object({
  source: z.string().min(1),
  policyVersion: z.string().min(1),
  units: z.string().min(1),
  currency: z.string().length(3).optional(),
  percentageRepresentation: z.enum(["fraction", "whole-number"]).optional(),
  effectiveDate: z.string().min(1),
  evidenceVersion: z.string().min(1),
  enforcement: z.enum(["mandatory", "advisory"]),
});
export type ConstraintMetadata = z.infer<typeof constraintMetadataSchema>;

export const proposalBoundSchema = z.object({
  id: z.string().min(1),
  minimum: finiteNumber,
  maximum: finiteNumber,
  metadata: constraintMetadataSchema,
}).superRefine((bound, context) => {
  if (bound.maximum < bound.minimum) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        `Invalid bound ${bound.id}: maximum ${bound.maximum} is below minimum ${bound.minimum}.`,
    });
  }
});
export type ProposalBound = z.infer<typeof proposalBoundSchema>;

export const proposalBoundsSchema = z.object({
  valuation: proposalBoundSchema,
  cashPercentage: proposalBoundSchema,
  equityPercentage: proposalBoundSchema,
  earnOutPercentage: proposalBoundSchema,
  escrowPercentage: proposalBoundSchema,
  earnOutTargetYears: proposalBoundSchema,
  nonCompeteMonths: proposalBoundSchema,
}).superRefine((bounds, context) => {
  const percentages = [
    bounds.cashPercentage,
    bounds.equityPercentage,
    bounds.earnOutPercentage,
    bounds.escrowPercentage,
  ];
  const minimum = percentages.reduce((sum, bound) => sum + bound.minimum, 0);
  const maximum = percentages.reduce((sum, bound) => sum + bound.maximum, 0);
  if (minimum > 1 || maximum < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        `Allocation bounds have minimum sum ${minimum} and maximum sum ${maximum}; expected a feasible sum of 1.`,
    });
  }
  for (
    const dimension of [
      "cashPercentage",
      "equityPercentage",
      "earnOutPercentage",
      "escrowPercentage",
    ] as const
  ) {
    const bound = bounds[dimension];
    if (bound.minimum < 0 || bound.maximum > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [dimension],
        message:
          `Invalid percentage bound ${dimension}: received ${bound.minimum}..${bound.maximum}; expected 0..1.`,
      });
    }
  }
  if (bounds.valuation.minimum < 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["valuation"],
      message:
        `Invalid valuation minimum ${bounds.valuation.minimum}; expected a non-negative amount.`,
    });
  }
  if (bounds.earnOutTargetYears.minimum < 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["earnOutTargetYears"],
      message:
        `Invalid earn-out timing minimum ${bounds.earnOutTargetYears.minimum}; expected a non-negative duration.`,
    });
  }
  if (
    bounds.nonCompeteMonths.minimum < 0 ||
    !Number.isInteger(bounds.nonCompeteMonths.minimum) ||
    !Number.isInteger(bounds.nonCompeteMonths.maximum)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nonCompeteMonths"],
      message:
        `Invalid non-compete bound ${bounds.nonCompeteMonths.minimum}..${bounds.nonCompeteMonths.maximum}; expected non-negative integer months.`,
    });
  }
});
export type ProposalBounds = z.infer<typeof proposalBoundsSchema>;

export const negotiationProposalSchema = z.object({
  valuation: finiteNumber.min(0),
  cashPercentage: percentage,
  equityPercentage: percentage,
  earnOutPercentage: percentage,
  escrowPercentage: percentage,
  earnOutTargetYears: finiteNumber.min(0),
  nonCompeteMonths: finiteNumber.int().min(0),
}).superRefine((proposal, context) => {
  const total = proposal.cashPercentage + proposal.equityPercentage +
    proposal.earnOutPercentage + proposal.escrowPercentage;
  if (Math.abs(total - 1) > 0.000001) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        `Proposal allocation totals ${total}; expected percentages to sum to 1.`,
    });
  }
});
export type NegotiationProposal = z.infer<typeof negotiationProposalSchema>;

const utilityWeightsSchema = z.object({
  valuation: percentage,
  cashPercentage: percentage,
  equityPercentage: percentage,
  earnOutPercentage: percentage,
  escrowPercentage: percentage,
  earnOutTargetYears: percentage,
  nonCompeteMonths: percentage,
}).superRefine((weights, context) => {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(total - 1) > 0.000001) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Utility weights total ${total}; expected weights to sum to 1.`,
    });
  }
});
export type UtilityWeights = z.infer<typeof utilityWeightsSchema>;

const utilityDirectionsSchema = z.object({
  valuation: z.enum(["higher", "lower"]),
  cashPercentage: z.enum(["higher", "lower"]),
  equityPercentage: z.enum(["higher", "lower"]),
  earnOutPercentage: z.enum(["higher", "lower"]),
  escrowPercentage: z.enum(["higher", "lower"]),
  earnOutTargetYears: z.enum(["higher", "lower"]),
  nonCompeteMonths: z.enum(["higher", "lower"]),
});
export type UtilityDirections = z.infer<typeof utilityDirectionsSchema>;

const utilityTargetsSchema = z.object({
  valuation: percentage,
  cashPercentage: percentage,
  equityPercentage: percentage,
  earnOutPercentage: percentage,
  escrowPercentage: percentage,
  earnOutTargetYears: percentage,
  nonCompeteMonths: percentage,
}).partial();
export type UtilityTargets = z.infer<typeof utilityTargetsSchema>;

/**
 * A side's weighted utility function. Every component is normalized to [0,1]
 * in its declared bound units before the weighted sum is calculated.
 */
export const utilityFunctionSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  units: z.literal(NEGOTIATION_UTILITY_UNITS),
  weights: utilityWeightsSchema,
  directions: utilityDirectionsSchema,
  targets: utilityTargetsSchema.optional(),
});
export type UtilityFunction = z.infer<typeof utilityFunctionSchema>;

export const reservationUtilityBoundSchema = z.object({
  minimum: percentage,
  metadata: constraintMetadataSchema,
});
export type ReservationUtilityBound = z.infer<
  typeof reservationUtilityBoundSchema
>;

export const utilityModelSchema = z.object({
  buyer: utilityFunctionSchema,
  seller: utilityFunctionSchema,
  reservation: z.object({
    buyer: reservationUtilityBoundSchema,
    seller: reservationUtilityBoundSchema,
  }),
});
export type UtilityModel = z.infer<typeof utilityModelSchema>;

export const constraintKindSchema = z.enum([
  "dimension-range",
  "allocation-total",
  "utility-floor",
  "required-input",
]);

const dimensionRangeConstraintSchema = z.object({
  kind: z.literal("dimension-range"),
  id: z.string().min(1),
  dimension: proposalDimensionSchema,
  minimum: finiteNumber,
  maximum: finiteNumber,
  metadata: constraintMetadataSchema,
}).superRefine((constraint, context) => {
  if (constraint.maximum < constraint.minimum) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        `Invalid constraint ${constraint.id}: maximum ${constraint.maximum} is below minimum ${constraint.minimum}.`,
    });
  }
});

const allocationTotalConstraintSchema = z.object({
  kind: z.literal("allocation-total"),
  id: z.string().min(1),
  target: finiteNumber,
  tolerance: finiteNumber.min(0),
  metadata: constraintMetadataSchema,
});

const utilityFloorConstraintSchema = z.object({
  kind: z.literal("utility-floor"),
  id: z.string().min(1),
  side: z.enum(["buyer", "seller"]),
  minimum: percentage,
  metadata: constraintMetadataSchema,
});

const requiredInputConstraintSchema = z.object({
  kind: z.literal("required-input"),
  id: z.string().min(1),
  input: z.union([
    proposalDimensionSchema,
    z.enum(["buyerUtility", "sellerUtility"]),
  ]),
  metadata: constraintMetadataSchema,
});

export const negotiationConstraintSchema = z.union([
  dimensionRangeConstraintSchema,
  allocationTotalConstraintSchema,
  utilityFloorConstraintSchema,
  requiredInputConstraintSchema,
]);
export type NegotiationConstraint = z.infer<typeof negotiationConstraintSchema>;

export const optimizerConfigSchema = z.object({
  populationSize: z.number().int().min(2),
  maxGenerations: z.number().int().min(1),
  mutationRate: percentage,
  crossoverRate: percentage,
  tournamentSize: z.number().int().min(1),
  alternativeCount: z.number().int().min(1),
  stagnationGenerations: z.number().int().min(1),
  minimumImprovement: finiteNumber.min(0),
});
export type OptimizerConfig = z.infer<typeof optimizerConfigSchema>;

export const DEFAULT_NEGOTIATION_OPTIMIZER_CONFIG: OptimizerConfig = {
  populationSize: 80,
  maxGenerations: 40,
  mutationRate: 0.1,
  crossoverRate: 0.8,
  tournamentSize: 3,
  alternativeCount: 3,
  stagnationGenerations: 8,
  minimumImprovement: 0.000001,
};

export interface NegotiationOptimizerInput {
  bounds: ProposalBounds;
  utilities: UtilityModel;
  constraints?: NegotiationConstraint[];
  seed: number;
  config?: Partial<OptimizerConfig>;
}

export const negotiationOptimizerInputSchema = z.object({
  bounds: proposalBoundsSchema,
  utilities: utilityModelSchema,
  constraints: z.array(negotiationConstraintSchema).optional(),
  seed: z.number().int().min(0).max(4294967295),
  config: optimizerConfigSchema.partial().optional(),
});

export interface ReplayMetadata {
  seed: number;
  contractVersion: typeof NEGOTIATION_OPTIMIZER_CONTRACT_VERSION;
  algorithmVersion: typeof NEGOTIATION_OPTIMIZER_ALGORITHM_VERSION;
  config: OptimizerConfig;
}

/** Utility totals and components use normalized-utility[0,1] units. */
export interface UtilityScore {
  total: number;
  units: typeof NEGOTIATION_UTILITY_UNITS;
  components: Record<ProposalDimension, number>;
}

export interface UtilityEvaluation {
  buyer: UtilityScore;
  seller: UtilityScore;
}

export interface ConstraintViolation {
  constraintId: string;
  kind: string;
  enforcement: "mandatory" | "advisory";
  message: string;
  actual: number | null;
  expected: string;
  units: string;
  source: string;
  metadata: ConstraintMetadata;
}

export interface RankedAlternative {
  rank: number;
  proposal: NegotiationProposal;
  buyerUtility: UtilityScore;
  sellerUtility: UtilityScore;
  fitness: number;
  feasible: boolean;
  violations: ConstraintViolation[];
}

export type TerminationReason = "converged" | "max-generations" | "infeasible";

export interface TerminationMetadata {
  reason: TerminationReason;
  generations: number;
  evaluations: number;
  bestFitness: number;
  stagnantGenerations: number;
}

export interface NegotiationOptimizerResult {
  status: "feasible" | "infeasible";
  best: RankedAlternative | null;
  alternatives: RankedAlternative[];
  violations: ConstraintViolation[];
  replay: ReplayMetadata;
  termination: TerminationMetadata;
}
