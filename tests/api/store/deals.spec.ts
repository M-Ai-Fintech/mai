import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import {
  Currency,
  DealPhase,
  DealStatus,
  DealType,
} from "../../../src/api/contracts.ts";
import { assertEquals } from "@std/assert";
import { expectStoreError } from "../support/store.ts";

Deno.test(
  "MvpStore lists deal summaries with search, filters, and pagination",
  verifyDealSummaryListing,
);

Deno.test(
  "MvpStore creates, updates, and archives a full versioned deal aggregate",
  verifyVersionedDealLifecycle,
);

Deno.test(
  "MvpStore enforces sequential deal phase transitions and stale versions",
  verifyDealPhaseTransitions,
);

function verifyDealSummaryListing(): void {
  const store = new MvpStore();
  const page = store.listDeals({
    search: "atlas",
    status: DealStatus.Active,
    phase: DealPhase.Sourcing,
    page: 1,
    pageSize: 1,
  });
  assertDealPage(page);
  page.data[0].title = "external mutation";
  assertEquals(
    store.getDealDetail(MVP_SEED_IDS.dealAtlas).title,
    "Project Atlas",
  );
}

function assertDealPage(page: ReturnType<MvpStore["listDeals"]>): void {
  assertEquals(page.meta, {
    page: 1,
    pageSize: 1,
    total: 1,
    totalPages: 1,
  });
  assertEquals(page.data[0].id, MVP_SEED_IDS.dealAtlas);
  assertEquals("phaseHistory" in page.data[0], false);
}

function verifyVersionedDealLifecycle(): void {
  const store = new MvpStore();
  const created = store.createDeal(cobaltDealInput());
  assertCreatedDeal(store, created);
  const updated = updateCreatedDeal(store, created);
  assertStaleDealUpdate(store, created.id);
  assertArchivedDeal(store, created.id, updated.version);
}

function cobaltDealInput(): Parameters<MvpStore["createDeal"]>[0] {
  return {
    code: "CB-2026",
    title: "Project Cobalt",
    dealType: DealType.BuySide,
    targetId: MVP_SEED_IDS.entityNexus,
    valuationRange: {
      min: { amountMinor: "2500000000", currency: Currency.USD },
      max: { amountMinor: "5000000000", currency: Currency.USD },
    },
    leadAdvisorId: MVP_SEED_IDS.advisorAna,
    financialStructure: { cashPercentage: 70 },
  };
}

function assertCreatedDeal(
  store: MvpStore,
  created: ReturnType<MvpStore["createDeal"]>,
): void {
  assertEquals(created.version, 1);
  assertEquals(created.currentPhase, DealPhase.Sourcing);
  assertEquals(created.phaseHistory.length, 1);
  assertEquals(created.teamAssignments[0].isLead, true);
  assertEquals("targetId" in created, false);
  assertEquals(store.getDealDetail(created.id), created);
}

function updateCreatedDeal(
  store: MvpStore,
  created: ReturnType<MvpStore["createDeal"]>,
): ReturnType<MvpStore["updateDeal"]> {
  const updated = store.updateDeal(created.id, {
    title: "Project Cobalt Prime",
    leadAdvisorId: null,
    version: created.version,
  });
  assertEquals(updated.title, "Project Cobalt Prime");
  assertEquals(updated.leadAdvisor, null);
  assertEquals(
    updated.teamAssignments.some((assignment) => assignment.isLead),
    false,
  );
  assertEquals(updated.version, 2);
  return updated;
}

function assertStaleDealUpdate(store: MvpStore, dealId: string): void {
  expectStoreError(
    () => store.updateDeal(dealId, { title: "stale", version: 1 }),
    "RESOURCE_VERSION_CONFLICT",
    409,
  );
}

function assertArchivedDeal(
  store: MvpStore,
  dealId: string,
  version: number,
): void {
  const archived = store.archiveDeal(dealId, version);
  assertEquals(archived.status, DealStatus.Archived);
  assertEquals(archived.version, 3);
  assertEquals(
    store.listDeals({ status: DealStatus.Archived }).data[0].id,
    dealId,
  );
}

function verifyDealPhaseTransitions(): void {
  const store = new MvpStore();
  assertValidTransition(store);
  assertStaleTransition(store);
  assertSkippedTransition();
}

function assertValidTransition(store: MvpStore): void {
  const transitioned = store.transitionDealPhase(MVP_SEED_IDS.dealAtlas, {
    toPhase: DealPhase.DueDiligence,
    comment: "Data room opened",
    version: 1,
  });
  assertEquals(transitioned.currentPhase, DealPhase.DueDiligence);
  assertEquals(transitioned.version, 2);
  assertEquals(transitioned.phaseHistory.at(-1)?.comment, "Data room opened");
}

function assertStaleTransition(store: MvpStore): void {
  expectStoreError(
    () =>
      store.transitionDealPhase(MVP_SEED_IDS.dealAtlas, {
        toPhase: DealPhase.Negotiation,
        comment: "stale request",
        version: 1,
      }),
    "RESOURCE_VERSION_CONFLICT",
    409,
  );
}

function assertSkippedTransition(): void {
  const freshStore = new MvpStore();
  expectStoreError(
    () =>
      freshStore.transitionDealPhase(MVP_SEED_IDS.dealAtlas, {
        toPhase: DealPhase.Closing,
        comment: "skip intermediate phases",
        version: 1,
      }),
    "DEAL_PHASE_TRANSITION_INVALID",
    422,
  );
}
