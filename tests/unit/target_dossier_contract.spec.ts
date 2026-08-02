import { assertEquals, assertThrows } from "@std/assert";
import { targetDossierDraftSchema } from "../../src/shared/schemas/target-dossier.ts";

const TARGET_DOSSIER_FIXTURE = {
  dealId: "deal_fixture-1",
  targetIdentity: {
    companyName: "Fixture Target",
    cnpj: "00.000.000/0001-00",
  },
  cultureProfile: {},
  completeness: {
    isIncomplete: true,
    completionRatio: 0.25,
  },
};

Deno.test("Target Dossier fixture is explicitly proposed and non-authoritative", () => {
  const draft = targetDossierDraftSchema.parse(TARGET_DOSSIER_FIXTURE);

  assertEquals(draft.proposalStatus.isProposed, true);
  assertEquals(draft.proposalStatus.isApproved, false);
  assertEquals(draft.proposalStatus.isAuthoritative, false);
});

Deno.test("Target Dossier fixture rejects an authoritative proposal claim", () => {
  assertThrows(() =>
    targetDossierDraftSchema.parse({
      ...TARGET_DOSSIER_FIXTURE,
      proposalStatus: {
        isProposed: true,
        isApproved: true,
        isAuthoritative: false,
      },
    })
  );
});
