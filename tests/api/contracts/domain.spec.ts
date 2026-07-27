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

Deno.test(
  "contract DTOs preserve the frozen deal and stream discriminants",
  verifyFrozenContractDiscriminants,
);

function verifyFrozenContractDiscriminants(): void {
  const deal = frozenDealSummary();
  const event = responseDeltaEvent();
  assertEquals(deal.valuationRange.min.amountMinor, "45000000000");
  assertEquals(event.event, "response.delta");
  assertEquals(event.data.textDelta, "Partial response");
  assertEquals(EntityRole.Institution, "institution");
  assertEquals(DashboardWidgetType.Kpi, "kpi");
}

function frozenDealSummary(): DealSummary {
  return {
    id: "deal-id",
    code: "HZ-2026",
    title: "Project Horizon",
    dealType: DealType.BuySide,
    status: DealStatus.Active,
    currentPhase: DealPhase.DueDiligence,
    target: dealTarget(),
    valuationRange: dealValuationRange(),
    leadAdvisor: null,
    updatedAt: "2026-07-19T12:00:00Z",
    version: 1,
  };
}

function dealTarget(): DealSummary["target"] {
  return {
    id: "target-id",
    legalName: "Target S.A.",
    sector: "fintech",
    countryCode: "BR",
  };
}

function dealValuationRange(): DealSummary["valuationRange"] {
  return {
    min: { amountMinor: "45000000000", currency: Currency.USD },
    max: { amountMinor: "120000000000", currency: Currency.USD },
  };
}

function responseDeltaEvent(): Extract<
  ChatStreamEvent,
  { event: "response.delta" }
> {
  return {
    event: "response.delta",
    eventId: "event-id",
    threadId: "thread-id",
    messageId: "message-id",
    data: { textDelta: "Partial response" },
  };
}
