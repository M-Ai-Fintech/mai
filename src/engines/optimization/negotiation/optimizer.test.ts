import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertNotEquals,
  assertThrows,
} from "@std/assert";
import {
  NEGOTIATION_UTILITY_UNITS,
  negotiationOptimizerInputSchema,
  ProposalBound,
  ProposalBounds,
  proposalBoundsSchema,
  UtilityModel,
} from "./types.ts";
import { evaluateUtilities, normalizeDimension } from "./utility.ts";
import { createSeededRandom } from "./random.ts";
import { evaluateConstraintViolations } from "./constraints.ts";
import { NegotiationProposal } from "./types.ts";
import { optimizeNegotiationProposal } from "./optimizer.ts";

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
    metadata: {
      source: "MAI-146 test fixture",
      policyVersion: "test-v1",
      units,
      effectiveDate: "2026-08-01",
      evidenceVersion: "fixture-v1",
      enforcement: "mandatory",
    },
  };
}

const bounds: ProposalBounds = {
  valuation: bound("valuation", 10, 20, "currency-amount"),
  cashPercentage: bound("cash", 0, 0.5, "fraction"),
  equityPercentage: bound("equity", 0, 0.5, "fraction"),
  earnOutPercentage: bound("earn-out", 0, 0.5, "fraction"),
  escrowPercentage: bound("escrow", 0, 0.5, "fraction"),
  earnOutTargetYears: bound("earn-out-years", 1, 5, "years"),
  nonCompeteMonths: bound("non-compete-months", 12, 60, "months"),
};

const utilityModel: UtilityModel = {
  buyer: {
    id: "buyer-default",
    version: "1",
    units: NEGOTIATION_UTILITY_UNITS,
    weights: {
      valuation: 0.2,
      cashPercentage: 0.2,
      equityPercentage: 0.2,
      earnOutPercentage: 0.1,
      escrowPercentage: 0.1,
      earnOutTargetYears: 0.1,
      nonCompeteMonths: 0.1,
    },
    directions: {
      valuation: "lower",
      cashPercentage: "lower",
      equityPercentage: "higher",
      earnOutPercentage: "higher",
      escrowPercentage: "higher",
      earnOutTargetYears: "lower",
      nonCompeteMonths: "higher",
    },
  },
  seller: {
    id: "seller-default",
    version: "1",
    units: NEGOTIATION_UTILITY_UNITS,
    weights: {
      valuation: 0.2,
      cashPercentage: 0.2,
      equityPercentage: 0.2,
      earnOutPercentage: 0.1,
      escrowPercentage: 0.1,
      earnOutTargetYears: 0.1,
      nonCompeteMonths: 0.1,
    },
    directions: {
      valuation: "higher",
      cashPercentage: "higher",
      equityPercentage: "lower",
      earnOutPercentage: "lower",
      escrowPercentage: "lower",
      earnOutTargetYears: "higher",
      nonCompeteMonths: "lower",
    },
  },
  reservation: {
    buyer: {
      minimum: 0.2,
      metadata: {
        source: "MAI-146 test fixture",
        policyVersion: "test-v1",
        units: NEGOTIATION_UTILITY_UNITS,
        effectiveDate: "2026-08-01",
        evidenceVersion: "fixture-v1",
        enforcement: "mandatory",
      },
    },
    seller: {
      minimum: 0.2,
      metadata: {
        source: "MAI-146 test fixture",
        policyVersion: "test-v1",
        units: NEGOTIATION_UTILITY_UNITS,
        effectiveDate: "2026-08-01",
        evidenceVersion: "fixture-v1",
        enforcement: "mandatory",
      },
    },
  },
};

const optimizerInput = {
  bounds,
  utilities: utilityModel,
  seed: 146,
  config: {
    populationSize: 30,
    maxGenerations: 20,
    alternativeCount: 3,
    stagnationGenerations: 4,
  },
};

Deno.test("utility evaluation documents normalized buyer and seller units", () => {
  const result = evaluateUtilities(
    {
      valuation: 15,
      cashPercentage: 0.25,
      equityPercentage: 0.25,
      earnOutPercentage: 0.25,
      escrowPercentage: 0.25,
      earnOutTargetYears: 3,
      nonCompeteMonths: 36,
    },
    bounds,
    utilityModel,
  );

  assertEquals(result.buyer.units, NEGOTIATION_UTILITY_UNITS);
  assertEquals(result.seller.units, NEGOTIATION_UTILITY_UNITS);
  assertAlmostEquals(result.buyer.total, 0.5, 0.0001);
  assertAlmostEquals(result.seller.total, 0.5, 0.0001);
});

Deno.test("seeded random source replays the same sequence", () => {
  const first = createSeededRandom(146);
  const replay = createSeededRandom(146);
  const firstSequence = [first.next(), first.next(), first.nextGaussian()];
  const replaySequence = [replay.next(), replay.next(), replay.nextGaussian()];

  assertEquals(replaySequence, firstSequence);
});

Deno.test("constraint evaluation reports every material violation", () => {
  const proposal: NegotiationProposal = {
    valuation: 15,
    cashPercentage: 0.25,
    equityPercentage: 0.25,
    earnOutPercentage: 0.25,
    escrowPercentage: 0.25,
    earnOutTargetYears: 3,
    nonCompeteMonths: 36,
  };
  const violations = evaluateConstraintViolations(
    proposal,
    bounds,
    evaluateUtilities(proposal, bounds, utilityModel),
    utilityModel,
    [
      {
        kind: "dimension-range",
        id: "cash-floor",
        dimension: "cashPercentage",
        minimum: 0.4,
        maximum: 1,
        metadata: {
          source: "mandate",
          policyVersion: "mandate-v1",
          units: "fraction",
          effectiveDate: "2026-08-01",
          evidenceVersion: "evidence-v1",
          enforcement: "mandatory",
        },
      },
      {
        kind: "dimension-range",
        id: "equity-floor",
        dimension: "equityPercentage",
        minimum: 0.4,
        maximum: 1,
        metadata: {
          source: "mandate",
          policyVersion: "mandate-v1",
          units: "fraction",
          effectiveDate: "2026-08-01",
          evidenceVersion: "evidence-v1",
          enforcement: "mandatory",
        },
      },
    ],
  );

  assertEquals(violations.length, 2);
  assertEquals(violations.map((violation) => violation.constraintId), [
    "cash-floor",
    "equity-floor",
  ]);
});

Deno.test("optimizer is deterministic and returns replayable ranked alternatives", () => {
  const first = optimizeNegotiationProposal(optimizerInput);
  const replay = optimizeNegotiationProposal(optimizerInput);

  assertEquals(replay, first);
  assertEquals(first.replay.seed, 146);
  assertEquals(first.replay.config.crossoverRate, 0.8);
  assertEquals(first.alternatives.length, 3);
  assert(first.best !== null);
  assertEquals(first.status, "feasible");
  assertEquals(first.best?.violations.length, 0);
});

Deno.test("optimizer explains infeasible constraints instead of dropping candidates", () => {
  const result = optimizeNegotiationProposal({
    ...optimizerInput,
    constraints: [{
      kind: "dimension-range",
      id: "impossible-cash-floor",
      dimension: "cashPercentage",
      minimum: 0.9,
      maximum: 1,
      metadata: {
        source: "mandate",
        policyVersion: "mandate-v1",
        units: "fraction",
        effectiveDate: "2026-08-01",
        evidenceVersion: "evidence-v1",
        enforcement: "mandatory",
      },
    }],
  });

  assertEquals(result.status, "infeasible");
  assertEquals(result.best, null);
  assert(
    result.alternatives[0].violations.some((violation) =>
      violation.constraintId === "impossible-cash-floor"
    ),
  );
});

Deno.test("optimizer enforces reservation floors and exposes termination", () => {
  const strictUtilities: UtilityModel = {
    ...utilityModel,
    reservation: {
      buyer: { ...utilityModel.reservation.buyer, minimum: 0.99 },
      seller: { ...utilityModel.reservation.seller, minimum: 0.99 },
    },
  };
  const result = optimizeNegotiationProposal({
    ...optimizerInput,
    utilities: strictUtilities,
    config: {
      ...optimizerInput.config,
      maxGenerations: 12,
      stagnationGenerations: 2,
      minimumImprovement: 1,
    },
  });

  assertEquals(result.status, "infeasible");
  assertEquals(result.termination.reason, "infeasible");
  assert(result.termination.generations <= 12);
  assert(
    result.alternatives[0].violations.some((violation) =>
      violation.constraintId === "buyer-reservation-utility"
    ),
  );
  assert(
    result.alternatives[0].violations.some((violation) =>
      violation.constraintId === "seller-reservation-utility"
    ),
  );
});

Deno.test("crossoverRate is replay metadata and changes the seeded search", () => {
  const noCrossover = optimizeNegotiationProposal({
    ...optimizerInput,
    config: { ...optimizerInput.config, crossoverRate: 0 },
  });
  const alwaysCrossover = optimizeNegotiationProposal({
    ...optimizerInput,
    config: { ...optimizerInput.config, crossoverRate: 1 },
  });

  assertEquals(noCrossover.replay.config.crossoverRate, 0);
  assertEquals(alwaysCrossover.replay.config.crossoverRate, 1);
  assertNotEquals(noCrossover.alternatives, alwaysCrossover.alternatives);
});

Deno.test("fixed bounds have explicit zero-width normalization semantics", () => {
  const fixed = bound("fixed", 10, 10, "currency-amount");

  assertEquals(normalizeDimension(10, fixed), {
    value: 1,
    state: "fixed-match",
  });
  assertEquals(normalizeDimension(11, fixed), {
    value: 0,
    state: "fixed-mismatch",
  });
  assertEquals(normalizeDimension(11, bound("invalid", 20, 10, "amount")), {
    value: 0,
    state: "invalid-negative-width",
  });
});

Deno.test("bound contracts reject negative ranges with offending values", () => {
  const invalid = proposalBoundsSchema.safeParse({
    ...bounds,
    valuation: bound("valuation", 20, 10, "currency-amount"),
  });

  assertEquals(invalid.success, false);
  if (!invalid.success) {
    assert(
      invalid.error.issues.some((issue) =>
        issue.message.includes("maximum 10") &&
        issue.message.includes("minimum 20")
      ),
    );
  }
});

Deno.test("optimizer input rejects missing required utility contracts", () => {
  const invalid = negotiationOptimizerInputSchema.safeParse({
    bounds,
    utilities: {},
    seed: 146,
  });

  assertEquals(invalid.success, false);
});

Deno.test("optimizer rejects misleading alternative limits", () => {
  assertThrows(
    () =>
      optimizeNegotiationProposal({
        ...optimizerInput,
        config: { ...optimizerInput.config, alternativeCount: 31 },
      }),
    Error,
    "expected at most population size 30",
  );
});
