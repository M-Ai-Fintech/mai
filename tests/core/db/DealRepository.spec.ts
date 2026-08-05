import { assertEquals, assertExists } from "@std/assert";
import { DealRepository } from "../../../src/core/db/DealRepository.ts";

interface RepositoryTestState {
  readonly repo: DealRepository;
  readonly title: string;
  readonly code: string;
  dealId: string;
}

function createTestState(): RepositoryTestState {
  return {
    repo: new DealRepository(),
    title: "Alpha Acquisitions Ltd",
    code: "ALPHA_ACQ_" +
      Math.random().toString(36).substring(2, 7).toUpperCase(),
    dealId: "",
  };
}

async function connectRepository(
  repo: DealRepository,
): Promise<boolean> {
  const connected = await repo.connect();
  if (connected) return true;
  console.warn(
    "[Test] Database not connected. Skipping repository integration tests.",
  );
  await repo.close();
  return false;
}

async function createDealStep(
  context: Deno.TestContext,
  state: RepositoryTestState,
): Promise<void> {
  await context.step(
    "should create a new deal with related entities",
    async () => {
      state.dealId = await state.repo.createDeal(
        state.title,
        state.code,
        "Acquisition",
        "Horizontal Integration",
        "Active",
        75000000.00,
      );
      assertEquals(typeof state.dealId, "string");
      assertEquals(state.dealId.length > 0, true);
    },
  );
}

async function retrieveActiveDealsStep(
  context: Deno.TestContext,
  state: RepositoryTestState,
): Promise<void> {
  await context.step(
    "should retrieve active deals including the newly created one",
    async () => {
      const deals = await state.repo.getDeals({ activeOnly: true });
      const createdDeal = deals.find((deal) => deal.id === state.dealId);
      assertEquals(Array.isArray(deals), true);
      assertExists(createdDeal);
      assertEquals(createdDeal.title, state.title);
      assertEquals(createdDeal.code, state.code);
      assertEquals(createdDeal.status, "Active");
      assertEquals(createdDeal.currentPhase, "Sourcing & KYB");
    },
  );
}

async function retrieveDealDetailsStep(
  context: Deno.TestContext,
  state: RepositoryTestState,
): Promise<void> {
  await context.step(
    "should retrieve a deal by ID with business and phase history",
    async () => {
      const deal = await state.repo.getDealById(state.dealId);
      assertExists(deal);
      assertEquals(deal.id, state.dealId);
      assertEquals(deal.title, state.title);
      assertEquals(deal.code, state.code);
      assertExists(deal.business);
      assertEquals(deal.business.name, state.title);
      assertEquals(deal.phase_history.length, 1);
      assertEquals(deal.phase_history[0].phaseName, "Sourcing & KYB");
    },
  );
}

function assertAdvancedPhase(
  deal: NonNullable<Awaited<ReturnType<DealRepository["getDealById"]>>>,
): void {
  assertEquals(deal.phase_history.length, 2);
  // Check old phase is marked completed (completedAt is not null)
  assertEquals(deal.phase_history[0].phaseName, "Sourcing & KYB");
  assertEquals(!!deal.phase_history[0].completedAt, true);
  // Check new phase is In Progress
  assertEquals(deal.phase_history[1].phaseName, "NDA & Initial DD");
  assertEquals(deal.phase_history[1].statusName, "In Progress");
  assertEquals(deal.phase_history[1].comments, "NDA signed by both parties.");
}

async function advancePhaseStep(
  context: Deno.TestContext,
  state: RepositoryTestState,
): Promise<void> {
  await context.step(
    "should advance deal phase and record history",
    async () => {
      await state.repo.updateDealPhase(
        state.dealId,
        "NDA & Initial DD",
        "In Progress",
        "NDA signed by both parties.",
      );
      const deal = await state.repo.getDealById(state.dealId);
      assertExists(deal);
      assertAdvancedPhase(deal);
    },
  );
}

async function runRepositorySteps(
  context: Deno.TestContext,
  state: RepositoryTestState,
): Promise<void> {
  await createDealStep(context, state);
  await retrieveActiveDealsStep(context, state);
  await retrieveDealDetailsStep(context, state);
  await advancePhaseStep(context, state);
  await context.step(
    "should close repository connections gracefully",
    async () => {
      await state.repo.close();
    },
  );
}

Deno.test("DealRepository Integration Tests", async (context) => {
  const state = createTestState();
  if (!await connectRepository(state.repo)) return;
  await runRepositorySteps(context, state);
});
