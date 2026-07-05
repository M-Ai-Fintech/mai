import { assertEquals, assertThrows } from "@std/assert";
import { MADealLifecycle } from "../src/core/ma_flow.ts";

Deno.test("Smoke Test: MADealLifecycle flow completes in < 2s offline", () => {
  const start = performance.now();

  const deal = MADealLifecycle.createDeal("Buyer A", "Seller B", "Target C", 1000000);
  assertEquals(deal.currentState, "INITIATED");

  MADealLifecycle.transitionTo(deal, "NDA_SIGNED", "System");
  assertEquals(deal.currentState, "NDA_SIGNED");

  MADealLifecycle.transitionTo(deal, "DUE_DILIGENCE_ACTIVE", "System");
  assertEquals(deal.currentState, "DUE_DILIGENCE_ACTIVE");
  assertEquals(deal.complianceVerified, true);

  MADealLifecycle.transitionTo(deal, "VALUATION_COMPLETE", "System");
  assertEquals(deal.currentState, "VALUATION_COMPLETE");

  MADealLifecycle.transitionTo(deal, "TERM_SHEET_NEGOTIATING", "System");
  assertEquals(deal.currentState, "TERM_SHEET_NEGOTIATING");

  MADealLifecycle.transitionTo(deal, "TERM_SHEET_APPROVED", "System");
  assertEquals(deal.currentState, "TERM_SHEET_APPROVED");

  MADealLifecycle.transitionTo(deal, "COMPLETED", "System");
  assertEquals(deal.currentState, "COMPLETED");

  const end = performance.now();
  const duration = end - start;
  
  // Verify execution is fast (< 2 seconds)
  assertEquals(duration < 2000, true);
});

Deno.test("Smoke Test: MADealLifecycle invalid transition throws", () => {
  const deal = MADealLifecycle.createDeal("Buyer A", "Seller B", "Target C", 1000000);
  
  assertThrows(() => {
    MADealLifecycle.transitionTo(deal, "COMPLETED", "System");
  });
});
