import { assert, assertEquals } from "@std/assert";
import {
  legacyInterestCoverageCalculation,
  legacyLeverageCalculation,
  legacySynergyPricing,
  legacyValuationFloorCalculation,
} from "./compatibility.ts";

const synergyInput = {
  standaloneValue: 100,
  costSynergies: [5, 5, 5],
  revenueSynergies: [10, 10, 10],
  integrationCosts: [2, 2, 2],
  wacc: 0.1,
  taxRate: 0.34,
  revenueHaircut: 0.4,
  sharingCoefficient: 0.3,
};

Deno.test("legacy valuation compatibility delegates ratios and floors", () => {
  const leverage = legacyLeverageCalculation(50, 10);
  const coverage = legacyInterestCoverageCalculation(10, 5);
  const floor = legacyValuationFloorCalculation(105, 100);

  assertEquals(leverage.ok, true);
  assertEquals(coverage.ok, true);
  assertEquals(floor.ok, true);
  if (!leverage.ok || !coverage.ok || !floor.ok) return;
  assertEquals(leverage.value.ratio.value, 5);
  assertEquals(coverage.value.ratio.value, 2);
  assertEquals(floor.value.meetsFloor, true);
});

Deno.test("legacy synergy compatibility preserves typed deterministic output", () => {
  const first = legacySynergyPricing(synergyInput);
  const replay = legacySynergyPricing(synergyInput);

  assertEquals(replay, first);
  assertEquals(first.success, true);
  if (!first.success) return;
  assertEquals(first.netSynergyValue, 14.772);
  assertEquals(first.sellerPremium, 4.432);
  assertEquals(first.recommendedPurchasePrice, 104.432);
});

Deno.test("legacy synergy compatibility does not turn missing data into success", () => {
  const result = legacySynergyPricing({
    ...synergyInput,
    costSynergies: [],
  });

  assertEquals(result.success, false);
  if (result.success) return;
  assertEquals(result.error.code, "REQUIRED_DATA_UNAVAILABLE");
  assert(result.error.message.includes("costSynergies"));
});
