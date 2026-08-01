import {
  ConstraintMetadata,
  ConstraintViolation,
  NegotiationConstraint,
  NegotiationProposal,
  ProposalBounds,
  ProposalDimension,
  UtilityEvaluation,
  UtilityModel,
} from "./types.ts";

const allocationMetadata: ConstraintMetadata = {
  source: "negotiation optimizer contract",
  policyVersion: "negotiation-proposal-optimizer.v1",
  units: "fraction",
  percentageRepresentation: "fraction",
  effectiveDate: "2026-08-01",
  evidenceVersion: "contract-v1",
  enforcement: "mandatory",
};

export function evaluateConstraintViolations(
  proposal: NegotiationProposal,
  bounds: ProposalBounds,
  utilities: UtilityEvaluation,
  model: UtilityModel,
  constraints: NegotiationConstraint[] = [],
): ConstraintViolation[] {
  return [
    ...evaluateBounds(proposal, bounds),
    ...evaluateAllocation(proposal),
    ...evaluateReservations(utilities, model),
    ...constraints.flatMap((constraint) =>
      evaluateConstraint(constraint, proposal, utilities)
    ),
  ];
}

export function hasMandatoryViolations(
  violations: ConstraintViolation[],
): boolean {
  return violations.some((violation) => violation.enforcement === "mandatory");
}

function evaluateBounds(
  proposal: NegotiationProposal,
  bounds: ProposalBounds,
): ConstraintViolation[] {
  const dimensions: ProposalDimension[] = [
    "valuation",
    "cashPercentage",
    "equityPercentage",
    "earnOutPercentage",
    "escrowPercentage",
    "earnOutTargetYears",
    "nonCompeteMonths",
  ];
  return dimensions.flatMap((dimension) => {
    const bound = bounds[dimension];
    const value = proposal[dimension];
    if (value >= bound.minimum && value <= bound.maximum) return [];
    return [makeViolation(
      bound.id,
      "dimension-range",
      bound.metadata,
      value,
      `${bound.minimum}..${bound.maximum}`,
      `Value ${value} for ${dimension} is outside ${bound.minimum}..${bound.maximum}.`,
    )];
  });
}

function evaluateAllocation(
  proposal: NegotiationProposal,
): ConstraintViolation[] {
  const total = proposal.cashPercentage + proposal.equityPercentage +
    proposal.earnOutPercentage + proposal.escrowPercentage;
  if (Math.abs(total - 1) <= 0.000001) return [];
  return [makeViolation(
    "allocation-total",
    "allocation-total",
    allocationMetadata,
    total,
    "1 ± 0.000001",
    `Allocation total ${total} does not equal 1.`,
  )];
}

function evaluateReservations(
  utilities: UtilityEvaluation,
  model: UtilityModel,
): ConstraintViolation[] {
  return [
    reservationViolation(
      "buyer",
      utilities.buyer.total,
      model.reservation.buyer,
    ),
    reservationViolation(
      "seller",
      utilities.seller.total,
      model.reservation.seller,
    ),
  ].filter((violation): violation is ConstraintViolation => violation !== null);
}

function reservationViolation(
  side: "buyer" | "seller",
  actual: number,
  reservation: UtilityModel["reservation"]["buyer"],
): ConstraintViolation | null {
  if (actual >= reservation.minimum) return null;
  return makeViolation(
    `${side}-reservation-utility`,
    "utility-floor",
    reservation.metadata,
    actual,
    `>= ${reservation.minimum}`,
    `${side} utility ${actual} is below reservation ${reservation.minimum}.`,
  );
}

function evaluateConstraint(
  constraint: NegotiationConstraint,
  proposal: NegotiationProposal,
  utilities: UtilityEvaluation,
): ConstraintViolation[] {
  if (constraint.kind === "dimension-range") {
    return evaluateRangeConstraint(constraint, proposal);
  }
  if (constraint.kind === "allocation-total") {
    return evaluateAllocationConstraint(constraint, proposal);
  }
  if (constraint.kind === "utility-floor") {
    return evaluateUtilityConstraint(constraint, utilities);
  }
  return evaluateRequiredInput(constraint, proposal, utilities);
}

function evaluateRangeConstraint(
  constraint: Extract<NegotiationConstraint, { kind: "dimension-range" }>,
  proposal: NegotiationProposal,
): ConstraintViolation[] {
  const actual = proposal[constraint.dimension];
  if (actual >= constraint.minimum && actual <= constraint.maximum) return [];
  return [makeViolation(
    constraint.id,
    constraint.kind,
    constraint.metadata,
    actual,
    `${constraint.minimum}..${constraint.maximum}`,
    `Value ${actual} for ${constraint.dimension} is outside the declared range.`,
  )];
}

function evaluateAllocationConstraint(
  constraint: Extract<NegotiationConstraint, { kind: "allocation-total" }>,
  proposal: NegotiationProposal,
): ConstraintViolation[] {
  const total = proposal.cashPercentage + proposal.equityPercentage +
    proposal.earnOutPercentage + proposal.escrowPercentage;
  if (Math.abs(total - constraint.target) <= constraint.tolerance) return [];
  return [makeViolation(
    constraint.id,
    constraint.kind,
    constraint.metadata,
    total,
    `${constraint.target} ± ${constraint.tolerance}`,
    `Allocation total ${total} violates target ${constraint.target}.`,
  )];
}

function evaluateUtilityConstraint(
  constraint: Extract<NegotiationConstraint, { kind: "utility-floor" }>,
  utilities: UtilityEvaluation,
): ConstraintViolation[] {
  const actual = utilities[constraint.side].total;
  if (actual >= constraint.minimum) return [];
  return [makeViolation(
    constraint.id,
    constraint.kind,
    constraint.metadata,
    actual,
    `>= ${constraint.minimum}`,
    `${constraint.side} utility ${actual} is below declared floor.`,
  )];
}

function evaluateRequiredInput(
  constraint: Extract<NegotiationConstraint, { kind: "required-input" }>,
  proposal: NegotiationProposal,
  utilities: UtilityEvaluation,
): ConstraintViolation[] {
  const actual = requiredInputValue(constraint.input, proposal, utilities);
  if (actual !== null && Number.isFinite(actual)) return [];
  return [makeViolation(
    constraint.id,
    constraint.kind,
    constraint.metadata,
    null,
    "finite value present",
    `Required input ${constraint.input} is missing or not finite.`,
  )];
}

function requiredInputValue(
  input: Extract<NegotiationConstraint, { kind: "required-input" }>["input"],
  proposal: NegotiationProposal,
  utilities: UtilityEvaluation,
): number | null {
  if (input === "buyerUtility") return utilities.buyer.total;
  if (input === "sellerUtility") return utilities.seller.total;
  return proposal[input];
}

function makeViolation(
  constraintId: string,
  kind: string,
  metadata: ConstraintMetadata,
  actual: number | null,
  expected: string,
  message: string,
): ConstraintViolation {
  return {
    constraintId,
    kind,
    enforcement: metadata.enforcement,
    message,
    actual,
    expected,
    units: metadata.units,
    source: metadata.source,
    metadata,
  };
}
