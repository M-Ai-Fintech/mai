import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  createNormalizedTerms,
  normalizedTermsFromOptimizerProposal,
} from "../../src/negotiation/terms.ts";
import {
  assertProposalTransition,
  assertRoundTransition,
} from "../../src/negotiation/transitions.ts";
import {
  compareProposalToMandate,
  createMandate,
} from "../../src/negotiation/mandate.ts";
import {
  createNegotiationRound,
  createProposal,
} from "../../src/negotiation/model.ts";
import {
  assertExternalRoundSafe,
  toExternalRound,
} from "../../src/negotiation/projection.ts";
import { actor, scope, terms } from "./support.ts";

const now = "2026-08-08T12:00:00.000Z";

Deno.test("normalized negotiation terms are finite, versioned, and deduplicated", () => {
  const normalized = createNormalizedTerms(terms);
  assertEquals(normalized.schemaVersion, 1);
  assertEquals(normalized.terms.length, 1);
  assertEquals(normalized.valuation?.minorUnits, 100_000);
  assertThrows(
    () =>
      createNormalizedTerms({
        currency: "USD",
        terms: [
          { key: "valuation", value: 1, unit: "minor_units", currency: "USD" },
          { key: "valuation", value: 2, unit: "minor_units", currency: "USD" },
        ],
      }),
    Error,
    "supplied more than once",
  );
});

Deno.test("optimizer recommendations cross the read-only normalized-term boundary", () => {
  const normalized = normalizedTermsFromOptimizerProposal({
    valuation: 100.4,
    cashPercentage: 0.5,
    equityPercentage: 0.2,
    earnOutPercentage: 0.2,
    escrowPercentage: 0.1,
    earnOutTargetYears: 2,
    nonCompeteMonths: 12,
  }, "USD");
  assertEquals(normalized.valuation?.minorUnits, 100);
  assertEquals(normalized.cashPercentageBps, 5_000);
});

Deno.test("round and proposal state machines reject autonomous reopening", () => {
  assertRoundTransition("draft", "open");
  assertProposalTransition("submitted", "countered");
  assertThrows(() => assertRoundTransition("closed", "open"), Error, "invalid");
  assertThrows(
    () => assertProposalTransition("accepted", "submitted"),
    Error,
    "invalid",
  );
});

Deno.test("mandate comparison distinguishes within, outside, and indeterminate", () => {
  const mandate = createMandate({
    mandateId: "mandate_solar",
    scope,
    status: "active",
    constraints: [{
      id: "valuation-floor",
      key: "valuation",
      operator: "minimum",
      value: 100_000,
      unit: "minor_units",
      mandatory: true,
      source: "human-mandate",
    }],
    now,
  });
  const within = compareProposalToMandate({
    mandate,
    proposalVersionId: "proposal_version_solar-1",
    terms: createNormalizedTerms(terms),
    comparedAt: now,
  });
  assertEquals(within.outcome, "within_mandate");
  const outside = compareProposalToMandate({
    mandate,
    proposalVersionId: "proposal_version_solar-2",
    terms: createNormalizedTerms({
      currency: "USD",
      valuation: { minorUnits: 99_999, currency: "USD" },
    }),
    comparedAt: now,
  });
  assertEquals(outside.outcome, "outside_mandate");
  const indeterminate = compareProposalToMandate({
    mandate,
    proposalVersionId: "proposal_version_solar-3",
    terms: createNormalizedTerms({ currency: "USD", paymentTimingDays: 5 }),
    comparedAt: now,
  });
  assertEquals(indeterminate.outcome, "indeterminate");
});

Deno.test("external projection excludes internal positions, BATNA, mandates, approvals, and delivery receipts", () => {
  const round = createNegotiationRound({
    roundId: "round_solar",
    negotiationId: "negotiation_solar",
    scope,
    number: 1,
    openedBy: actor().id,
    now,
    internal: {
      positions: [],
      batna: {
        side: "buyer",
        alternatives: [{ id: "alternative_one", label: "Walk away" }],
        recordedBy: actor().id,
        recordedAt: now,
      },
      strategyNotes: ["private"],
    },
  });
  const proposal = createProposal({
    proposalId: "proposal_solar",
    negotiationId: round.negotiationId,
    roundId: round.roundId,
    scope,
    fromParty: "buyer",
    terms: createNormalizedTerms(terms),
    submittedBy: actor().id,
    submittedByKind: "human",
    origin: "human",
    now,
  });
  const external = toExternalRound({ ...round, proposals: [proposal] });
  assertExternalRoundSafe(external);
  const serialized = JSON.stringify(external);
  assert(!serialized.includes("BATNA"));
  assert(!serialized.includes("strategyNotes"));
  assert(!serialized.includes("internal"));
  assertEquals("approvals" in external, false);
});
