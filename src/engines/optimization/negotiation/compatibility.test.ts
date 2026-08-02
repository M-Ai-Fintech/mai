import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import {
  evaluateLegacyTermSheet,
  optimizeLegacyTermSheet,
} from "./term_sheet_compatibility.ts";
import { optimizeLegacyNegotiation } from "./compatibility.ts";

const profile = {
  valuationMin: 80,
  valuationMax: 120,
  preferences: { cash: 0.4, equity: 0.3, earnOut: 0.2, escrow: 0.1 },
};

const financial = { ebitda: 5, debt: 15, interestExpense: 1 };

Deno.test("legacy negotiation adapter delegates deterministically", () => {
  const input = {
    profile,
    financial,
    maxLeverage: 4,
    minCoverage: 2.5,
    enforceFinancialConstraints: true,
    geneticConfig: {
      populationSize: 30,
      generations: 12,
      seed: 146,
    },
  } as const;
  const first = optimizeLegacyNegotiation(input);
  const replay = optimizeLegacyNegotiation(input);

  assertEquals(first.status, "delegated");
  assertEquals(replay, first);
  assertEquals(first.compatibility.nonAuthoritativeDefaults, [
    "mutationRate=0.1 compatibility default",
    "tournamentSize=3 compatibility default",
    "crossoverRate=0.8 compatibility default",
    "alternativeCount=3 compatibility default",
    "stagnationGenerations=8 compatibility default",
    "minimumImprovement=0.000001 compatibility default",
  ]);
  assert(first.authoritative !== null);
  assert(first.authoritative?.replay.seed === 146);
});

Deno.test("legacy negotiation adapter exposes unavailable financial data", () => {
  const result = optimizeLegacyNegotiation({
    profile,
    enforceFinancialConstraints: true,
    geneticConfig: { seed: 146 },
  });

  assertEquals(result.status, "unavailable");
  assertEquals(result.alternatives, []);
  assertEquals(result.error?.code, "REQUIRED_DATA_UNAVAILABLE");
  assertStringIncludes(result.error?.message ?? "", "financial");
});

Deno.test("legacy negotiation adapter reports financial violations", () => {
  const result = optimizeLegacyNegotiation({
    profile,
    financial: { ebitda: 5, debt: 30, interestExpense: 1 },
    maxLeverage: 4,
    minCoverage: 2.5,
    enforceFinancialConstraints: true,
    geneticConfig: { seed: 146 },
  });

  assertEquals(result.status, "infeasible");
  assertEquals(result.alternatives, []);
  assert(
    result.violations.some((violation) =>
      violation.constraintId === "legacy-leverage-rule"
    ),
  );
});

Deno.test("legacy negotiation adapter blocks KYC without creating authority", () => {
  const result = optimizeLegacyNegotiation({
    profile,
    kyc: { kycBlocked: true, sanctionMatch: false, pepExposure: false },
    geneticConfig: { seed: 146 },
  });

  assertEquals(result.status, "blocked");
  assertEquals(result.authoritative, null);
  assertEquals(result.alternatives, []);
  assert(
    !JSON.stringify(result).match(/approve|accept|send|finalize|persist/i),
  );
});

Deno.test("term-sheet compatibility delegates and replays its seed", () => {
  const params = {
    populationSize: 40,
    generations: 15,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    minBuyerReservationUtility: 0.2,
    minSellerReservationUtility: 0.2,
    seed: 146,
  } as const;
  const first = optimizeLegacyTermSheet(params);
  const replay = optimizeLegacyTermSheet(params);

  assertEquals(replay, first);
  assert(first.bestProposal.cashPercentage >= 0.1);
  assert(first.bestProposal.buyerEquityShare >= 0.1);
  assert(first.bestProposal.earnOutTargetYears >= 1);
  assert(first.bestProposal.nonCompeteMonths >= 12);
  const evaluation = evaluateLegacyTermSheet(first.bestProposal);
  assertAlmostEquals(evaluation.buyerUtility, first.buyerUtility, 0.01);
  assertAlmostEquals(evaluation.sellerUtility, first.sellerUtility, 0.01);
});
