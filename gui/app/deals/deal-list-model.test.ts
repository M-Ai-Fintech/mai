import { describe, expect, it } from "vitest";
import type { DealSummary } from "@/lib/api-client";
import {
  buildDealListQuery,
  collectVisibleAdvisors,
  hasActiveDealFilters,
  keepLoadedSelection,
  phaseBadgeVariant,
} from "./deal-list-model";

const dealTarget: DealSummary["target"] = {
  id: "00000000-0000-4000-8000-000000000099",
  legalName: "Target",
  sector: "Fintech",
  countryCode: "BR",
};

const baseDeal = (id: string): DealSummary => ({
  id,
  code: `DEAL-${id}`,
  title: "Project Horizon",
  dealType: "buy_side",
  status: "active",
  currentPhase: "sourcing",
  target: dealTarget,
  valuationRange: {
    min: { amountMinor: "10000", currency: "BRL" },
    max: { amountMinor: "20000", currency: "BRL" },
  },
  leadAdvisor: {
    id: "00000000-0000-4000-8000-000000000001",
    displayName: "Maria Silva",
    avatarUrl: null,
  },
  updatedAt: "2026-07-19T12:00:00.000Z",
  version: 1,
});

function expectFilteredDealQuery(): void {
  const filters = {
    search: "target",
    phase: "all" as const,
    status: "active" as const,
    assigneeId: "all",
  };
  expect(buildDealListQuery(filters, 2, 10)).toEqual({
    page: 2,
    pageSize: 10,
    search: "target",
    phase: undefined,
    status: "active",
    assigneeId: undefined,
    sort: "-updatedAt",
  });
}

function expectAdvisorDeduplication(): void {
  const deals = [baseDeal("a"), baseDeal("b")];
  expect(collectVisibleAdvisors(deals)).toHaveLength(1);
  expect(keepLoadedSelection(["a", "missing"], deals)).toEqual(["a"]);
}

function expectDefaultDealFilters(): void {
  const filters = {
    search: "",
    phase: "all" as const,
    status: "active" as const,
    assigneeId: "all",
  };
  expect(hasActiveDealFilters(filters, "active")).toBe(false);
  expect(phaseBadgeVariant("negotiation")).toBe("orange");
}

describe("deal list model", () => {
  it(
    "builds API queries without leaking all-filter sentinels",
    expectFilteredDealQuery,
  );
  it(
    "deduplicates visible advisors and drops stale selections",
    expectAdvisorDeduplication,
  );
  it(
    "compares filters against the route default status",
    expectDefaultDealFilters,
  );
});
