import { assertEquals } from "@std/assert";
import { MVP_SEED_IDS, MvpStore } from "../src/api/mvp_store.ts";
import { Currency, DealPhase, DealType } from "../src/api/contracts.ts";
import { expectStoreError } from "./api/support/store.ts";

type SmokeDeal = ReturnType<MvpStore["createDeal"]>;

interface SmokeTransition {
  phase: DealPhase;
  comment: string;
}

const SMOKE_TRANSITIONS: SmokeTransition[] = [
  {
    phase: DealPhase.DueDiligence,
    comment: "NDA signed, opening VDR",
  },
  {
    phase: DealPhase.Negotiation,
    comment: "Due diligence complete, entering negotiation",
  },
  {
    phase: DealPhase.Closing,
    comment: "Term sheet approved",
  },
];

function createSmokeDeal(
  store: MvpStore,
  code: string,
  title: string,
  leadAdvisorId: string | null,
): SmokeDeal {
  return store.createDeal({
    code,
    title,
    dealType: DealType.BuySide,
    targetId: MVP_SEED_IDS.entityNexus,
    valuationRange: {
      min: { amountMinor: "100000000", currency: Currency.USD },
      max: { amountMinor: "200000000", currency: Currency.USD },
    },
    leadAdvisorId,
    financialStructure: null,
  });
}

function transitionSmokeDeal(
  store: MvpStore,
  deal: SmokeDeal,
  toPhase: DealPhase,
  comment: string,
): SmokeDeal {
  return store.transitionDealPhase(deal.id, {
    toPhase,
    comment,
    version: deal.version,
  });
}

function createLifecycleDeal(store: MvpStore): SmokeDeal {
  return createSmokeDeal(
    store,
    "SMOKE-001",
    "Smoke Test Deal",
    MVP_SEED_IDS.advisorAna,
  );
}

function applySmokeTransition(
  store: MvpStore,
  deal: SmokeDeal,
  transition: SmokeTransition,
): SmokeDeal {
  return transitionSmokeDeal(store, deal, transition.phase, transition.comment);
}

Deno.test("Smoke Test: MvpStore deal lifecycle flow completes quickly offline", () => {
  const start = performance.now();
  const store = new MvpStore();
  let deal = createLifecycleDeal(store);
  assertEquals(deal.currentPhase, DealPhase.Sourcing);
  assertEquals(deal.version, 1);
  for (const transition of SMOKE_TRANSITIONS) {
    deal = applySmokeTransition(store, deal, transition);
    assertEquals(deal.currentPhase, transition.phase);
  }
  // Verify execution is fast (< 2 seconds)
  assertEquals(performance.now() - start < 2000, true);
});

Deno.test("Smoke Test: MvpStore invalid transition throws", () => {
  const store = new MvpStore();
  const deal = createSmokeDeal(
    store,
    "SMOKE-002",
    "Smoke Test Invalid Deal",
    null,
  );
  expectStoreError(
    () => {
      store.transitionDealPhase(deal.id, {
        toPhase: DealPhase.Closing,
        comment: "Skip to closing",
        version: deal.version,
      });
    },
    "DEAL_PHASE_TRANSITION_INVALID",
    422,
  );
});
