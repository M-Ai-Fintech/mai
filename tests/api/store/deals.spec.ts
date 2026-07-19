import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import {
  Currency,
  DealPhase,
  DealStatus,
  DealType,
} from "../../../src/api/contracts.ts";
import { assertEquals } from "@std/assert";
import { expectStoreError } from "../support/store.ts";

Deno.test("MvpStore lists deal summaries with search, filters, and pagination", () => {
  const store = new MvpStore();
  const page = store.listDeals({
    search: "atlas",
    status: DealStatus.Active,
    phase: DealPhase.Sourcing,
    page: 1,
    pageSize: 1,
  });

  assertEquals(page.meta, {
    page: 1,
    pageSize: 1,
    total: 1,
    totalPages: 1,
  });
  assertEquals(page.data[0].id, MVP_SEED_IDS.dealAtlas);
  assertEquals("phaseHistory" in page.data[0], false);
  page.data[0].title = "external mutation";
  assertEquals(
    store.getDealDetail(MVP_SEED_IDS.dealAtlas).title,
    "Project Atlas",
  );
});

Deno.test("MvpStore creates, updates, and archives a full versioned deal aggregate", () => {
  const store = new MvpStore();
  const created = store.createDeal({
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
  });

  assertEquals(created.version, 1);
  assertEquals(created.currentPhase, DealPhase.Sourcing);
  assertEquals(created.phaseHistory.length, 1);
  assertEquals(created.teamAssignments[0].isLead, true);
  assertEquals("targetId" in created, false);
  assertEquals(store.getDealDetail(created.id), created);

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

  expectStoreError(
    () => store.updateDeal(created.id, { title: "stale", version: 1 }),
    "RESOURCE_VERSION_CONFLICT",
    409,
  );

  const archived = store.archiveDeal(created.id, updated.version);
  assertEquals(archived.status, DealStatus.Archived);
  assertEquals(archived.version, 3);
  assertEquals(
    store.listDeals({ status: DealStatus.Archived }).data[0].id,
    created.id,
  );
});

Deno.test("MvpStore enforces sequential deal phase transitions and stale versions", () => {
  const store = new MvpStore();
  const transitioned = store.transitionDealPhase(MVP_SEED_IDS.dealAtlas, {
    toPhase: DealPhase.DueDiligence,
    comment: "Data room opened",
    version: 1,
  });
  assertEquals(transitioned.currentPhase, DealPhase.DueDiligence);
  assertEquals(transitioned.version, 2);
  assertEquals(transitioned.phaseHistory.at(-1)?.comment, "Data room opened");

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
});
