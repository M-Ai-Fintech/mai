import { assertEquals, assertRejects } from "@std/assert";
import { memorySchema } from "../../src/agent/agents/broker-orchestrator/schemas/memory.ts";
import { BrokerOrchestratorService } from "../../src/agent/agents/broker-orchestrator/index.ts";
import { databaseMemoryServiceTool } from "../../src/agent/tools/memory_tools.ts";
import {
  targetDossierDraftSchema,
} from "../../src/shared/schemas/target-dossier.ts";

Deno.test("MAI-75 Memory & Target Dossier Boundary Tests", async (t) => {
  await t.step("1. memorySchema accepts domain_knowledge", () => {
    const valid = memorySchema.safeParse({
      category: "domain_knowledge",
      subCategory: "tax_law",
      content: "LC 214/2025 rules",
      confidence: 0.95,
    });
    assertEquals(valid.success, true);
  });

  await t.step("2. memorySchema accepts user_preference", () => {
    const valid = memorySchema.safeParse({
      category: "user_preference",
      subCategory: "wacc",
      content: "WACC = 11.5%",
      confidence: 1.0,
    });
    assertEquals(valid.success, true);
  });

  await t.step("3. memorySchema rejects company_culture", () => {
    const invalid = memorySchema.safeParse({
      category: "company_culture",
      subCategory: "culture",
      content: "Aggressive seller",
      confidence: 0.8,
    });
    assertEquals(invalid.success, false);
  });

  await t.step(
    "4. Active memory tools expose no company-culture action",
    () => {
      const actions = (databaseMemoryServiceTool as unknown as {
        inputSchema: { shape: { action: { _def: { values: string[] } } } };
      }).inputSchema.shape.action._def.values;
      assertEquals(actions.includes("get_company_culture"), false);
      assertEquals(actions.includes("save_company_culture"), false);
    },
  );

  await t.step(
    "5. BrokerOrchestrator rejects company_culture corrections",
    async () => {
      const service = new BrokerOrchestratorService();
      await assertRejects(
        async () => {
          await service.processUserCorrection(
            "user1",
            "company_culture" as unknown as "user_preference",
            "culture",
            { key: "val" },
          );
        },
        Error,
        "Invalid memory correction category",
      );
    },
  );

  await t.step(
    "6. Domain knowledge and user preferences still work",
    async () => {
      const service = new BrokerOrchestratorService();
      const resultPref = await service.processUserCorrection(
        "test_user",
        "user_preference",
        "wacc",
        { value: 0.12 },
      );
      assertEquals(resultPref.success, true);

      const resultDomain = await service.processUserCorrection(
        "test_user",
        "domain_knowledge",
        "tax",
        { rule: "LC214" },
      );
      assertEquals(resultDomain.success, true);
    },
  );

  await t.step("7. Target Dossier draft requires dealId", () => {
    const invalid = targetDossierDraftSchema.safeParse({
      targetIdentity: { companyName: "Test Co", cnpj: "00.000.000/0001-00" },
      cultureProfile: {},
      completeness: {
        isIncomplete: true,
        missingSources: [],
        completionRatio: 0,
      },
    });
    assertEquals(invalid.success, false);
  });

  await t.step(
    "8. Target Dossier draft contains source/document references",
    () => {
      const valid = targetDossierDraftSchema.parse({
        dealId: "deal_123",
        targetIdentity: { companyName: "Test Co", cnpj: "00.000.000/0001-00" },
        documentReferences: [{ documentId: "doc_1", fileName: "dred.pdf" }],
        cultureProfile: {},
        completeness: {
          isIncomplete: false,
          missingSources: [],
          completionRatio: 1,
        },
        provenance: [{
          field: "companyName",
          source: "SERPRO",
          timestamp: "2026-07-31T09:00:00Z",
        }],
      });
      assertEquals(valid.documentReferences.length, 1);
      assertEquals(valid.provenance.length, 1);
    },
  );

  await t.step("9. Company Culture exists only inside the dossier", () => {
    const dossier = targetDossierDraftSchema.parse({
      dealId: "deal_123",
      targetIdentity: { companyName: "Test Co", cnpj: "00.000.000/0001-00" },
      cultureProfile: {
        negotiatorStyle: "Analytical",
        founderDependency: "High",
      },
      completeness: {
        isIncomplete: false,
        missingSources: [],
        completionRatio: 1,
      },
    });
    assertEquals(dossier.cultureProfile.negotiatorStyle, "Analytical");
  });

  await t.step("10. A dossier proposal is clearly non-authoritative", () => {
    const dossier = targetDossierDraftSchema.parse({
      dealId: "deal_123",
      targetIdentity: { companyName: "Test Co", cnpj: "00.000.000/0001-00" },
      cultureProfile: {},
      completeness: {
        isIncomplete: false,
        missingSources: [],
        completionRatio: 1,
      },
    });
    assertEquals(dossier.proposalStatus.isProposed, true);
    assertEquals(dossier.proposalStatus.isApproved, false);
    assertEquals(dossier.proposalStatus.isAuthoritative, false);
  });

  await t.step(
    "11. Missing sources produce an incomplete/proposed state rather than invented facts",
    () => {
      const dossier = targetDossierDraftSchema.parse({
        dealId: "deal_123",
        targetIdentity: { companyName: "Test Co", cnpj: "00.000.000/0001-00" },
        cultureProfile: {},
        completeness: {
          isIncomplete: true,
          missingSources: [
            "VDR Financial Statements",
            "CEIS Sanction Registry",
          ],
          completionRatio: 0.4,
        },
      });
      assertEquals(dossier.completeness.isIncomplete, true);
      assertEquals(dossier.completeness.missingSources.length, 2);
    },
  );

  await t.step(
    "12. No active code path persists company culture as memory",
    async () => {
      const service = new BrokerOrchestratorService();
      await assertRejects(
        async () => {
          await service.processUserCorrection(
            "u",
            "company_culture" as unknown as "user_preference",
            "cat",
            {},
          );
        },
      );
    },
  );
});
