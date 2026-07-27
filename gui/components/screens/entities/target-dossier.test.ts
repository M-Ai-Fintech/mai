import { describe, expect, it } from "vitest";

import { targetDossierPayload } from "./target-dossier-payload";

function expectEditableDossierPayload(): void {
  const dossier = {
    entityId: "00000000-0000-4000-8000-000000000010",
    executiveSummary: "Strong cross-sell base",
    corporateStructure: "Holding company",
    financialHealth: "Profitable",
    litigationRisks: "Low",
    marketPosition: "Regional leader",
    lastUpdated: "2026-07-20T12:00:00Z",
    version: 3,
  };
  expect(targetDossierPayload(dossier)).toEqual({
    executiveSummary: "Strong cross-sell base",
    corporateStructure: "Holding company",
    financialHealth: "Profitable",
    litigationRisks: "Low",
    marketPosition: "Regional leader",
  });
}

describe("target dossier model", () => {
  it(
    "keeps only editable dossier text fields in the update payload",
    expectEditableDossierPayload,
  );
});
