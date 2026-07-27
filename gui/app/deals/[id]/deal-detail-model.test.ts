import { describe, expect, it } from "vitest";
import type { DealDetail } from "@/lib/api-client";
import {
  draftFromDeal,
  editDraftToUpdate,
  fieldErrorsToEditErrors,
  nextSequentialPhase,
  selectablePhases,
  validateEditDraft,
} from "./deal-detail-model";

const detail: DealDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  code: "DEAL-1",
  title: "Project Horizon",
  dealType: "buy_side",
  status: "active",
  currentPhase: "due_diligence",
  target: {
    id: "00000000-0000-4000-8000-000000000099",
    legalName: "Target SA",
    sector: "Fintech",
    countryCode: "BR",
  },
  valuationRange: {
    min: { amountMinor: "12500", currency: "BRL" },
    max: { amountMinor: "25000", currency: "BRL" },
  },
  leadAdvisor: null,
  updatedAt: "2026-07-19T12:00:00.000Z",
  version: 3,
  phaseHistory: [],
  financialStructure: { internalNote: "Private note" },
  teamAssignments: [],
};

function expectDraftRoundTrip(): void {
  const draft = draftFromDeal(detail);
  expect(draft.valuationMin).toBe("125");
  expect(editDraftToUpdate(draft, detail.version)).toMatchObject({
    title: "Project Horizon",
    version: 3,
    financialStructure: { internalNote: "Private note" },
  });
}

function expectInvalidValuationErrors(): void {
  const errors = validateEditDraft({
    ...draftFromDeal(detail),
    valuationMin: "500",
    valuationMax: "100",
  });
  expect(errors.valuationMax).toContain("Maximum");
  expect(fieldErrorsToEditErrors({ title: ["Required"] })).toEqual({
    title: "Required",
  });
}

function expectSequentialPhaseOptions(): void {
  expect(nextSequentialPhase("negotiation")).toBe("closing");
  expect(selectablePhases("closing").map((option) => option.value)).not
    .toContain("closing");
}

describe("deal detail model", () => {
  it(
    "round-trips detail values through the edit draft contract",
    expectDraftRoundTrip,
  );
  it(
    "validates valuation ordering and maps server errors",
    expectInvalidValuationErrors,
  );
  it(
    "keeps phase options sequential and excludes the current phase",
    expectSequentialPhaseOptions,
  );
});
