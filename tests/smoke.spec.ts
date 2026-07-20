import { assertEquals, assertThrows } from "@std/assert";
import { MVP_SEED_IDS, MvpStore } from "../src/api/mvp_store.ts";
import { Currency, DealPhase, DealType } from "../src/api/contracts.ts";
import { expectStoreError } from "./api/support/store.ts";

Deno.test("Smoke Test: MvpStore deal lifecycle flow completes quickly offline", () => {
  const start = performance.now();
  const store = new MvpStore();

  let deal = store.createDeal({
    code: "SMOKE-001",
    title: "Smoke Test Deal",
    dealType: DealType.BuySide,
    targetId: MVP_SEED_IDS.entityNexus,
    valuationRange: {
      min: { amountMinor: "100000000", currency: Currency.USD },
      max: { amountMinor: "200000000", currency: Currency.USD },
    },
    leadAdvisorId: MVP_SEED_IDS.advisorAna,
    financialStructure: null,
  });
  
  assertEquals(deal.currentPhase, DealPhase.Sourcing);
  assertEquals(deal.version, 1);

  deal = store.transitionDealPhase(deal.id, {
    toPhase: DealPhase.DueDiligence,
    comment: "NDA signed, opening VDR",
    version: deal.version,
  });
  assertEquals(deal.currentPhase, DealPhase.DueDiligence);

  deal = store.transitionDealPhase(deal.id, {
    toPhase: DealPhase.Negotiation,
    comment: "Due diligence complete, entering negotiation",
    version: deal.version,
  });
  assertEquals(deal.currentPhase, DealPhase.Negotiation);

  deal = store.transitionDealPhase(deal.id, {
    toPhase: DealPhase.Closing,
    comment: "Term sheet approved",
    version: deal.version,
  });
  assertEquals(deal.currentPhase, DealPhase.Closing);

  const end = performance.now();
  const duration = end - start;
  
  // Verify execution is fast (< 2 seconds)
  assertEquals(duration < 2000, true);
});

Deno.test("Smoke Test: MvpStore invalid transition throws", () => {
  const store = new MvpStore();
  const deal = store.createDeal({
    code: "SMOKE-002",
    title: "Smoke Test Invalid Deal",
    dealType: DealType.BuySide,
    targetId: MVP_SEED_IDS.entityNexus,
    valuationRange: {
      min: { amountMinor: "100000000", currency: Currency.USD },
      max: { amountMinor: "200000000", currency: Currency.USD },
    },
    leadAdvisorId: null,
    financialStructure: null,
  });
  
  expectStoreError(
    () => {
      store.transitionDealPhase(deal.id, {
        toPhase: DealPhase.Closing,
        comment: "Skip to closing",
        version: deal.version,
      });
    },
    "DEAL_PHASE_TRANSITION_INVALID",
    422
  );
});
