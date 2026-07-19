import { describe, expect, it } from "vitest";
import type { DealSummary } from "./api-client";
import {
  EMPTY_DEAL_DRAFT,
  groupDealsByPhase,
  toDealCreate,
  validateDealDraft,
} from "../components/screens/dashboard/dashboard-model";
import { parseDashboardRouteState } from "../components/screens/dashboard/dashboard-route-state";

const deal = (phase: DealSummary["currentPhase"], id: string): DealSummary => ({
  id,
  code: `CODE-${id}`,
  title: `Deal ${id}`,
  dealType: "buy_side",
  status: "active",
  currentPhase: phase,
  target: {
    id: "00000000-0000-4000-8000-000000000099",
    legalName: "Target",
    sector: "Fintech",
    countryCode: "BR",
  },
  valuationRange: {
    min: { amountMinor: "10000", currency: "BRL" },
    max: { amountMinor: "20000", currency: "BRL" },
  },
  leadAdvisor: null,
  updatedAt: "2026-07-19T12:00:00.000Z",
  version: 1,
});

describe("dashboard model", () => {
  it("parses linked create and success states without accepting unknown notices", () => {
    expect(parseDashboardRouteState("?create=deal")).toEqual({
      createDeal: true,
      notice: null,
    });
    expect(parseDashboardRouteState("?notice=deal-archived").notice).toBe(
      "deal-archived",
    );
    expect(parseDashboardRouteState("?notice=phase-transitioned").notice).toBe(
      "phase-transitioned",
    );
    expect(parseDashboardRouteState("?notice=unknown").notice).toBeNull();
  });

  it("groups populated deals without losing empty phases", () => {
    const grouped = groupDealsByPhase([
      deal("sourcing", "00000000-0000-4000-8000-000000000001"),
      deal("closing", "00000000-0000-4000-8000-000000000002"),
    ]);

    expect(grouped.sourcing).toHaveLength(1);
    expect(grouped.due_diligence).toEqual([]);
    expect(grouped.negotiation).toEqual([]);
    expect(grouped.closing).toHaveLength(1);
  });

  it("keeps invalid create state in validation", () => {
    expect(validateDealDraft(EMPTY_DEAL_DRAFT)).toEqual({
      title: "Enter a deal title.",
      targetId: "Select a target entity.",
      valuationMin: "Enter a valuation greater than zero.",
      valuationMax: "Enter a valuation greater than zero.",
    });
  });

  it("rejects a maximum below the minimum", () => {
    expect(
      validateDealDraft({
        ...EMPTY_DEAL_DRAFT,
        title: "Project Horizon",
        targetId: "00000000-0000-4000-8000-000000000099",
        valuationMin: "250",
        valuationMax: "200",
      }).valuationMax,
    ).toBe("Maximum valuation must be at least the minimum.");
  });

  it("maps valid major-unit input to the frozen minor-unit contract", () => {
    const result = toDealCreate(
      {
        ...EMPTY_DEAL_DRAFT,
        title: "  Project Horizon  ",
        targetId: "00000000-0000-4000-8000-000000000099",
        valuationMin: "125.50",
        valuationMax: "500",
      },
      "MAI-20260719",
    );

    expect(result.title).toBe("Project Horizon");
    expect(result.valuationRange.min.amountMinor).toBe("12550");
    expect(result.valuationRange.max.amountMinor).toBe("50000");
    expect(result.leadAdvisorId).toBeNull();
  });
});
