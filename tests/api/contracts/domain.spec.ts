import {
  type ChatStreamEvent,
  Currency,
  DashboardWidgetType,
  DealPhase,
  DealStatus,
  type DealSummary,
  DealType,
  EntityRole,
} from "../../../src/api/contracts.ts";
import { assertEquals } from "@std/assert";

Deno.test("contract DTOs preserve the frozen deal and stream discriminants", () => {
  const deal: DealSummary = {
    id: "deal-id",
    code: "HZ-2026",
    title: "Project Horizon",
    dealType: DealType.BuySide,
    status: DealStatus.Active,
    currentPhase: DealPhase.DueDiligence,
    target: {
      id: "target-id",
      legalName: "Target S.A.",
      sector: "fintech",
      countryCode: "BR",
    },
    valuationRange: {
      min: { amountMinor: "45000000000", currency: Currency.USD },
      max: { amountMinor: "120000000000", currency: Currency.USD },
    },
    leadAdvisor: null,
    updatedAt: "2026-07-19T12:00:00Z",
    version: 1,
  };
  const event: ChatStreamEvent = {
    event: "response.delta",
    eventId: "event-id",
    threadId: "thread-id",
    messageId: "message-id",
    data: { textDelta: "Partial response" },
  };

  assertEquals(deal.valuationRange.min.amountMinor, "45000000000");
  assertEquals(event.event, "response.delta");
  if (event.event === "response.delta") {
    assertEquals(event.data.textDelta, "Partial response");
  }
  assertEquals(EntityRole.Institution, "institution");
  assertEquals(DashboardWidgetType.Kpi, "kpi");
});
