import { describe, expect, it } from "vitest";
import {
  canReconnectStream,
  decideStreamAction,
  formatCompactMoney,
  MAX_STREAM_RECONNECTS,
  reduceStreamedReply,
  structureAssistantContent,
} from "./agentic-workspace-model";

const ids = {
  eventId: "00000000-0000-4000-8000-000000000001",
  threadId: "00000000-0000-4000-8000-000000000002",
  messageId: "00000000-0000-4000-8000-000000000003",
};

describe("agentic workspace state", () => {
  it("accumulates deltas and replaces them with the canonical completed response", () => {
    const streaming = reduceStreamedReply(
      { content: "Risk ", status: "streaming" },
      { ...ids, event: "response.delta", data: { textDelta: "is moderate" } },
    );
    expect(streaming).toEqual({ content: "Risk is moderate", status: "streaming" });

    const completed = reduceStreamedReply(streaming, {
      ...ids,
      event: "response.completed",
      data: { content: "Risk is moderate.", citations: [] },
    });
    expect(completed).toEqual({ content: "Risk is moderate.", status: "completed" });
  });

  it("preserves streamed content when the backend reports a failure", () => {
    const failed = reduceStreamedReply(
      { content: "Partial", status: "streaming" },
      {
        ...ids,
        event: "response.failed",
        data: { code: "AGENT_FAILED", message: "Engine unavailable", retryable: true },
      },
    );
    expect(failed).toEqual({ content: "Partial", status: "failed", error: "Engine unavailable" });
  });

  it("retains tool lifecycle and citations during a streamed response", () => {
    const toolId = "00000000-0000-4000-8000-000000000004";
    const documentId = "00000000-0000-4000-8000-000000000005";
    const started = reduceStreamedReply(
      { content: "", status: "streaming" },
      { ...ids, event: "tool.started", data: { toolCallId: toolId, toolName: "financial_risk", input: {} } },
    );
    const completed = reduceStreamedReply(started, {
      ...ids,
      event: "tool.completed",
      data: { toolCallId: toolId, toolName: "financial_risk", result: { score: 2.4 } },
    });
    const cited = reduceStreamedReply(completed, {
      ...ids,
      event: "citation",
      data: { id: ids.eventId, documentId, label: "Financial statements", excerpt: null, page: 4 },
    });

    expect(cited.tools).toEqual([{ id: toolId, name: "financial_risk", status: "completed", result: { score: 2.4 } }]);
    expect(cited.citations?.[0]).toMatchObject({ documentId, page: 4 });

    const afterDelta = reduceStreamedReply(cited, {
      ...ids,
      event: "response.delta",
      data: { textDelta: "Grounded result" },
    });
    expect(afterDelta.tools).toEqual(cited.tools);
    expect(afterDelta.citations).toEqual(cited.citations);
  });

  it("bounds automatic reconnects and respects non-retryable failures", () => {
    expect(canReconnectStream(0, true)).toBe(true);
    expect(canReconnectStream(MAX_STREAM_RECONNECTS - 1, true)).toBe(true);
    expect(canReconnectStream(MAX_STREAM_RECONNECTS, true)).toBe(false);
    expect(canReconnectStream(0, false)).toBe(false);
    expect(decideStreamAction("failed", false, 0)).toBe("fail");
    expect(decideStreamAction("failed", true, 0)).toBe("reconnect");
    expect(decideStreamAction("completed", false, MAX_STREAM_RECONNECTS)).toBe("complete");
    expect(decideStreamAction(null, true, MAX_STREAM_RECONNECTS)).toBe("fail");
  });

  it("formats valuation minor units without losing currency", () => {
    expect(formatCompactMoney("45000000000", "USD")).toMatch(/\$450(?:\.0)?M/);
  });

  it("projects assistant markdown-like text into safe approved structures", () => {
    expect(structureAssistantContent([
      "## Risk review",
      "The target remains inside the review band.",
      "",
      "- Confirm covenant headroom",
      "- Review liquidity",
      "",
      "| Metric | Value |",
      "| --- | --- |",
      "| Z-score | 2.4 |",
    ].join("\n"))).toEqual({
      heading: "Risk review",
      paragraphs: ["The target remains inside the review band."],
      bullets: ["Confirm covenant headroom", "Review liquidity"],
      table: { headers: ["Metric", "Value"], rows: [["Z-score", "2.4"]] },
    });
  });
});
