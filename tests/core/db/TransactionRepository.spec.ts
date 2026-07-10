import { assertEquals } from "@std/assert";
import { TransactionRepository } from "../../../src/core/db/TransactionRepository.ts";

Deno.test("TransactionRepository Integration Tests", async (t) => {
  const repo = new TransactionRepository();
  const connected = await repo.connect();

  if (!connected) {
    console.warn("[Test] Database not connected. Skipping repository integration tests.");
    await repo.close();
    return;
  }

  let testDealId: string;
  const testTitle = "Alpha Acquisitions Ltd";
  const testCode = "ALPHA_ACQ_" + Math.random().toString(36).substring(2, 7).toUpperCase();

  await t.step("should create a new deal with related entities", async () => {
    testDealId = await repo.createDeal(
      testTitle,
      testCode,
      "Acquisition",
      "Horizontal Integration",
      "Active",
      75000000.00
    );
    assertEquals(typeof testDealId, "string");
    assertEquals(testDealId.length > 0, true);
  });

  await t.step("should retrieve active deals including the newly created one", async () => {
    const deals = await repo.getDeals({ activeOnly: true });
    assertEquals(Array.isArray(deals), true);
    const createdDeal = deals.find((d) => d.id === testDealId);
    assertEquals(!!createdDeal, true);
    assertEquals(createdDeal.title, testTitle);
    assertEquals(createdDeal.code, testCode);
    assertEquals(createdDeal.status, "Active");
    assertEquals(createdDeal.currentPhase, "Sourcing & KYB");
  });

  await t.step("should retrieve a deal by ID with business and phase history", async () => {
    const deal = await repo.getDealById(testDealId);
    assertEquals(!!deal, true);
    assertEquals(deal.id, testDealId);
    assertEquals(deal.title, testTitle);
    assertEquals(deal.code, testCode);
    assertEquals(deal.business.name, testTitle);
    assertEquals(deal.phase_history.length, 1);
    assertEquals(deal.phase_history[0].phaseName, "Sourcing & KYB");
  });

  await t.step("should advance transaction phase and record history", async () => {
    await repo.updateDealPhase(
      testDealId,
      "NDA & Initial DD",
      "In Progress",
      "NDA signed by both parties."
    );

    const deal = await repo.getDealById(testDealId);
    assertEquals(deal.phase_history.length, 2);
    
    // Check old phase is marked completed (completedAt is not null)
    assertEquals(deal.phase_history[0].phaseName, "Sourcing & KYB");
    assertEquals(!!deal.phase_history[0].completedAt, true);

    // Check new phase is In Progress
    assertEquals(deal.phase_history[1].phaseName, "NDA & Initial DD");
    assertEquals(deal.phase_history[1].statusName, "In Progress");
    assertEquals(deal.phase_history[1].comments, "NDA signed by both parties.");
  });

  await t.step("should close repository connections gracefully", async () => {
    await repo.close();
  });
});
