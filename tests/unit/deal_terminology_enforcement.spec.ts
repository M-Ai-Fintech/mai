import { assertEquals, assertExists } from "@std/assert";
import { DealRepository } from "../../src/core/db/DealRepository.ts";
import { synergySchema } from "../../src/agent/agents/deal-matching/schemas/synergy.ts";
import { valuationSchema } from "../../src/agent/agents/deal-matching/schemas/valuation.ts";
import { riskmatrixSchema } from "../../src/agent/agents/general-dd/schemas/risk-matrix.ts";
import { vdrrequestSchema } from "../../src/agent/agents/general-dd/schemas/vdr-request.ts";
import { nashequilibriumSchema } from "../../src/agent/agents/negotiation/schemas/nash-equilibrium.ts";
import { conditionsprecedentSchema } from "../../src/agent/agents/legal-closing/schemas/conditions-precedent.ts";
import { targetDossierDraftSchema } from "../../src/shared/schemas/target-dossier.ts";
import { bindingTermSheetSchema } from "../../src/agent/agents/legal-closing/schemas/term-sheet.ts";
import { negotiationProposalSchema } from "../../src/agent/agents/negotiation/schemas/term-sheet.ts";
import { domainAreaSchema } from "../../src/shared/schemas/domain-area.ts";
import { OutboxRepository } from "../../src/platform/events/v1.ts";
import { PostgresTransactionRunner } from "../../src/platform/persistence/v1.ts";

/**
 * MAI-72 Terminology Enforcement Test Suite
 *
 * Governed Domain Authority: MAI-103
 * @see backlog/docs/architecture/backend-redesign/domain-workflows/doc-20 - MAI-103-Bounded-Contexts-Aggregates-and-Workflow-State-Machines.md
 */

Deno.test("MAI-72 Enforcement - Active business-domain TS APIs use Deal / DealId", () => {
  const repo = DealRepository.getRepoInstance();
  assertExists(repo.createDeal);
  assertExists(repo.getDeals);
  assertExists(repo.getDealById);
  assertExists(repo.updateDealPhase);
});

Deno.test("MAI-72 Enforcement - No active TransactionRepository class remains", async () => {
  let hasLegacyClass = false;
  try {
    // @ts-ignore testing absence of legacy export
    const module = await import("../../src/core/db/DealRepository.ts");
    // @ts-ignore check for TransactionRepository
    if (module.TransactionRepository) {
      hasLegacyClass = true;
    }
  } catch {
    hasLegacyClass = false;
  }
  assertEquals(hasLegacyClass, false, "TransactionRepository must not be exported");
});

Deno.test("MAI-72 Enforcement - Agent and domain schemas use clean DealId descriptions", () => {
  const synergyDealDesc = synergySchema.shape.dealId.description;
  const valuationDealDesc = valuationSchema.shape.dealId.description;
  const riskmatrixDealDesc = riskmatrixSchema.shape.dealId.description;
  const vdrrequestDealDesc = vdrrequestSchema.shape.dealId.description;
  const nashDealDesc = nashequilibriumSchema.shape.dealId.description;
  const conditionsDealDesc = conditionsprecedentSchema.shape.dealId.description;

  assertEquals(synergyDealDesc, "Unique identifier of the deal.");
  assertEquals(valuationDealDesc, "Unique identifier of the deal.");
  assertEquals(riskmatrixDealDesc, "Unique identifier of the deal.");
  assertEquals(vdrrequestDealDesc, "Unique identifier of the deal.");
  assertEquals(nashDealDesc, "Unique identifier of the deal.");
  assertEquals(conditionsDealDesc, "Unique deal ID.");
});

Deno.test("MAI-72 Enforcement - MAI-74 schemas preserve Deal & Term Sheet contract split", () => {
  assertExists(negotiationProposalSchema.shape.dealId);
  assertExists(bindingTermSheetSchema.shape.dealId);
});

Deno.test("MAI-72 Enforcement - MAI-75 Target Dossier contracts use DealId", () => {
  assertExists(targetDossierDraftSchema.shape.dealId);
});

Deno.test("MAI-72 Enforcement - MAI-77 Domain Area taxonomy schema integrates cleanly", () => {
  const parsedArea = domainAreaSchema.parse("financial");
  assertEquals(parsedArea, "financial");
});

Deno.test("MAI-72 Enforcement - Platform transaction runner & transactional outbox/inbox terminology remains unchanged", () => {
  assertExists(PostgresTransactionRunner);
  assertExists(OutboxRepository);
});

Deno.test("MAI-72 Enforcement - Legacy SQL table naming is isolated and documented behind repository", async () => {
  const fileContent = await Deno.readTextFile(new URL("../../src/core/db/deals/write_operations.ts", import.meta.url));
  const containsSqlIsolationDoc = fileContent.includes("Legacy SQL table compatibility evidence");
  const containsTransactionSqlTable = fileContent.includes("INSERT INTO transaction (");
  assertEquals(containsSqlIsolationDoc, true);
  assertEquals(containsTransactionSqlTable, true);
});

Deno.test("MAI-72 Enforcement - No universal Deal aggregate or cross-context mega-object introduced", () => {
  // MAI-103 architecture check: targetDossierDraftSchema and bindingTermSheetSchema are separate aggregate/contract types
  const dossierShapeKeys = Object.keys(targetDossierDraftSchema.shape);
  const termSheetShapeKeys = Object.keys(bindingTermSheetSchema.shape);

  // Ensure target dossier does not incorporate term sheet legal binding structures as a mega-object
  assertEquals(dossierShapeKeys.includes("bindingSignatures"), false);
  assertEquals(termSheetShapeKeys.includes("marketAnalysis"), false);
});
