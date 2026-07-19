import type { ChatStreamEvent } from "@/lib/api-client";

export const AGENTS = [
  "BrokerOrchestratorAgent",
  "FinancialRiskAgent",
  "LegalDueDiligenceAgent",
  "NegotiationAgent",
] as const;

export type AgentId = (typeof AGENTS)[number];

export interface StreamedReply {
  content: string;
  status: "idle" | "streaming" | "reconnecting" | "completed" | "failed" | "stopped";
  error?: string;
  tools?: Array<{ id: string; name: string; status: "running" | "completed"; result?: unknown }>;
  citations?: Array<{ id: string; documentId: string; label: string; excerpt: string | null; page: number | null }>;
}

export interface StructuredAssistantContent {
  heading: string | null;
  paragraphs: string[];
  bullets: string[];
  table: { headers: string[]; rows: string[][] } | null;
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

export function structureAssistantContent(content: string): StructuredAssistantContent {
  const lines = content.split(/\r?\n/);
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  const paragraphBuffer: string[] = [];
  let heading: string | null = null;
  let table: StructuredAssistantContent["table"] = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length) paragraphs.push(paragraphBuffer.splice(0).join(" "));
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch && !heading) {
      flushParagraph();
      heading = headingMatch[1].trim();
      continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      bullets.push(bulletMatch[1].trim());
      continue;
    }
    if (!table && line.includes("|") && index + 1 < lines.length) {
      const headers = tableCells(line);
      const separator = tableCells(lines[index + 1]);
      if (headers.length > 1 && separator.length === headers.length && separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        flushParagraph();
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length && lines[index].includes("|")) {
          const row = tableCells(lines[index]);
          if (row.length === headers.length) rows.push(row);
          index += 1;
        }
        index -= 1;
        table = { headers, rows };
        continue;
      }
    }
    paragraphBuffer.push(line);
  }
  flushParagraph();

  return { heading, paragraphs, bullets, table };
}

export const MAX_STREAM_RECONNECTS = 2;

export function canReconnectStream(
  reconnectCount: number,
  retryable: boolean,
): boolean {
  return retryable && reconnectCount < MAX_STREAM_RECONNECTS;
}

export function decideStreamAction(
  terminal: "completed" | "failed" | null,
  retryable: boolean,
  reconnectCount: number,
): "complete" | "reconnect" | "fail" {
  if (terminal === "completed") return "complete";
  return canReconnectStream(reconnectCount, terminal === "failed" ? retryable : true)
    ? "reconnect"
    : "fail";
}

export function reduceStreamedReply(
  reply: StreamedReply,
  event: ChatStreamEvent,
): StreamedReply {
  switch (event.event) {
    case "message.accepted":
      return { ...reply, status: "streaming" };
    case "tool.started":
      return { ...reply, status: "streaming", tools: [...(reply.tools ?? []), { id: event.data.toolCallId, name: event.data.toolName, status: "running" }] };
    case "tool.completed":
      return { ...reply, status: "streaming", tools: (reply.tools ?? []).map((tool) => tool.id === event.data.toolCallId ? { ...tool, status: "completed", result: event.data.result } : tool) };
    case "citation":
      return { ...reply, status: "streaming", citations: [...(reply.citations ?? []), event.data] };
    case "response.delta":
      return {
        ...reply,
        content: reply.content + event.data.textDelta,
        status: "streaming",
      };
    case "response.completed":
      return {
        content: event.data.content || reply.content,
        status: "completed",
        tools: reply.tools,
        citations: event.data.citations.length ? event.data.citations : reply.citations,
      };
    case "response.failed":
      return {
        ...reply,
        status: "failed",
        error: event.data.message,
      };
  }
}

export function formatCompactMoney(amountMinor: string, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(amountMinor) / 100);
}
