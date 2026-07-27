import { describe, expect, it } from "vitest";
import type { DealDetail, EngineRun } from "@/lib/api-client";
import {
  canReconnectStream,
  decideStreamAction,
  formatCompactMoney,
  MAX_STREAM_RECONNECTS,
  reduceStreamedReply,
  structureAssistantContent,
} from "./agentic-workspace-model";
import {
  dealValuationLabel,
  financialRiskSummary,
  messageContent,
} from "./agentic-workspace-view-model";

const ids = {
  eventId: "00000000-0000-4000-8000-000000000001",
  threadId: "00000000-0000-4000-8000-000000000002",
  messageId: "00000000-0000-4000-8000-000000000003",
};

const dealDetail: DealDetail = {
  id: ids.threadId,
  code: "DL-1",
  title: "Project Aurora",
  dealType: "buy_side",
  status: "active",
  currentPhase: "due_diligence",
  target: {
    id: ids.messageId,
    legalName: "Aurora SA",
    sector: "Energy",
    countryCode: "BR",
  },
  valuationRange: {
    min: { amountMinor: "25000000000", currency: "USD" },
    max: { amountMinor: "45000000000", currency: "USD" },
  },
  leadAdvisor: null,
  updatedAt: "2026-01-02T00:00:00.000Z",
  version: 1,
  phaseHistory: [],
  financialStructure: null,
  teamAssignments: [],
};

const financialRiskRun: EngineRun = {
  id: ids.messageId,
  dealId: ids.threadId,
  engine: "financial_risk",
  status: "completed",
  result: { score: 3.25 },
  error: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-01T00:01:00.000Z",
};

function expectCompletedCanonicalResponse(): void {
  const streaming = reduceStreamedReply(
    { content: "Risk ", status: "streaming" },
    { ...ids, event: "response.delta", data: { textDelta: "is moderate" } },
  );
  expect(streaming).toEqual({
    content: "Risk is moderate",
    status: "streaming",
  });
  const completed = reduceStreamedReply(streaming, {
    ...ids,
    event: "response.completed",
    data: { content: "Risk is moderate.", citations: [] },
  });
  expect(completed).toEqual({
    content: "Risk is moderate.",
    status: "completed",
  });
}

function expectPreservedFailedContent(): void {
  const failed = reduceStreamedReply(
    { content: "Partial", status: "streaming" },
    {
      ...ids,
      event: "response.failed",
      data: {
        code: "AGENT_FAILED",
        message: "Engine unavailable",
        retryable: true,
      },
    },
  );
  expect(failed).toEqual({
    content: "Partial",
    status: "failed",
    error: "Engine unavailable",
  });
}

const toolId = "00000000-0000-4000-8000-000000000004";
const documentId = "00000000-0000-4000-8000-000000000005";

function completedToolReply(): ReturnType<typeof reduceStreamedReply> {
  const started = reduceStreamedReply(
    { content: "", status: "streaming" },
    {
      ...ids,
      event: "tool.started",
      data: { toolCallId: toolId, toolName: "financial_risk", input: {} },
    },
  );
  return reduceStreamedReply(started, {
    ...ids,
    event: "tool.completed",
    data: {
      toolCallId: toolId,
      toolName: "financial_risk",
      result: { score: 2.4 },
    },
  });
}

function citedToolReply(): ReturnType<typeof reduceStreamedReply> {
  return reduceStreamedReply(completedToolReply(), {
    ...ids,
    event: "citation",
    data: {
      id: ids.eventId,
      documentId,
      label: "Financial statements",
      excerpt: null,
      page: 4,
    },
  });
}

function expectToolLifecycleAndCitations(): void {
  const cited = citedToolReply();
  expect(cited.tools).toEqual([{
    id: toolId,
    name: "financial_risk",
    status: "completed",
    result: { score: 2.4 },
  }]);
  expect(cited.citations?.[0]).toMatchObject({ documentId, page: 4 });
  const afterDelta = reduceStreamedReply(cited, {
    ...ids,
    event: "response.delta",
    data: { textDelta: "Grounded result" },
  });
  expect(afterDelta.tools).toEqual(cited.tools);
  expect(afterDelta.citations).toEqual(cited.citations);
}

function expectBoundedReconnects(): void {
  expect(canReconnectStream(0, true)).toBe(true);
  expect(canReconnectStream(MAX_STREAM_RECONNECTS - 1, true)).toBe(true);
  expect(canReconnectStream(MAX_STREAM_RECONNECTS, true)).toBe(false);
  expect(canReconnectStream(0, false)).toBe(false);
  expect(decideStreamAction("failed", false, 0)).toBe("fail");
  expect(decideStreamAction("failed", true, 0)).toBe("reconnect");
  expect(decideStreamAction("completed", false, MAX_STREAM_RECONNECTS)).toBe(
    "complete",
  );
  expect(decideStreamAction(null, true, MAX_STREAM_RECONNECTS)).toBe("fail");
}

function expectCompactValuationCurrency(): void {
  expect(formatCompactMoney("45000000000", "USD")).toMatch(/\$450(?:\.0)?M/);
}

function expectStructuredAssistantContent(): void {
  const content = [
    "## Risk review",
    "The target remains inside the review band.",
    "",
    "- Confirm covenant headroom",
    "- Review liquidity",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    "| Z-score | 2.4 |",
  ].join("\n");
  expect(structureAssistantContent(content)).toEqual({
    heading: "Risk review",
    paragraphs: ["The target remains inside the review band."],
    bullets: ["Confirm covenant headroom", "Review liquidity"],
    table: { headers: ["Metric", "Value"], rows: [["Z-score", "2.4"]] },
  });
}

function expectParagraphAfterTable(): void {
  const structured = structureAssistantContent([
    "| Item | Status |",
    "| --- | --- |",
    "| VDR | Reviewed |",
    "",
    "Follow up with counsel.",
  ].join("\n"));
  expect(structured.table?.rows).toEqual([["VDR", "Reviewed"]]);
  expect(structured.paragraphs).toEqual(["Follow up with counsel."]);
}

function expectDealValuationLabel(): void {
  expect(dealValuationLabel(null)).toBe("—");
  expect(dealValuationLabel(dealDetail)).toMatch(
    /\$250(?:\.0)?M–\$450(?:\.0)?M/,
  );
}

function expectFinancialRiskSummary(): void {
  expect(financialRiskSummary([financialRiskRun], false, null)).toMatchObject({
    run: financialRiskRun,
    running: false,
    failure: null,
    score: "3.3",
  });
  expect(financialRiskSummary([], true, null).running).toBe(true);
}

function expectToolMessageLabel(): void {
  expect(messageContent({
    id: ids.messageId,
    threadId: ids.threadId,
    role: "tool",
    toolName: "financial_risk",
    status: "completed",
    content: {},
    createdAt: "2026-01-01T00:00:00.000Z",
  })).toBe("financial_risk: completed");
}

function registerStreamingStateTests(): void {
  it(
    "accumulates deltas and replaces them with the canonical completed response",
    expectCompletedCanonicalResponse,
  );
  it(
    "preserves streamed content when the backend reports a failure",
    expectPreservedFailedContent,
  );
  it(
    "retains tool lifecycle and citations during a streamed response",
    expectToolLifecycleAndCitations,
  );
  it(
    "bounds automatic reconnects and respects non-retryable failures",
    expectBoundedReconnects,
  );
}

function registerAssistantContentTests(): void {
  it(
    "formats valuation minor units without losing currency",
    expectCompactValuationCurrency,
  );
  it(
    "projects assistant markdown-like text into safe approved structures",
    expectStructuredAssistantContent,
  );
  it(
    "continues paragraph parsing after a markdown table",
    expectParagraphAfterTable,
  );
}

function registerWorkspaceViewModelTests(): void {
  it(
    "formats deal valuation labels for the workspace header",
    expectDealValuationLabel,
  );
  it(
    "summarizes financial risk engine state for the side panel",
    expectFinancialRiskSummary,
  );
  it(
    "labels tool messages with their tool name and status",
    expectToolMessageLabel,
  );
}

describe("agentic workspace state", () => {
  registerStreamingStateTests();
  registerAssistantContentTests();
  registerWorkspaceViewModelTests();
});
