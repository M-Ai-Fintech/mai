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
  status:
    | "idle"
    | "streaming"
    | "reconnecting"
    | "completed"
    | "failed"
    | "stopped";
  error?: string;
  tools?: Array<
    {
      id: string;
      name: string;
      status: "running" | "completed";
      result?: unknown;
    }
  >;
  citations?: Array<
    {
      id: string;
      documentId: string;
      label: string;
      excerpt: string | null;
      page: number | null;
    }
  >;
}

export interface StructuredAssistantContent {
  heading: string | null;
  paragraphs: string[];
  bullets: string[];
  table: { headers: string[]; rows: string[][] } | null;
}

interface AssistantContentParser {
  lines: string[];
  index: number;
  heading: string | null;
  paragraphs: string[];
  bullets: string[];
  paragraphBuffer: string[];
  table: StructuredAssistantContent["table"];
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((
    cell,
  ) => cell.trim());
}

export function structureAssistantContent(
  content: string,
): StructuredAssistantContent {
  const parser = newAssistantContentParser(content);
  while (parser.index < parser.lines.length) {
    consumeAssistantLine(parser);
    parser.index += 1;
  }
  flushAssistantParagraph(parser);
  return parserResult(parser);
}

function newAssistantContentParser(content: string): AssistantContentParser {
  return {
    lines: content.split(/\r?\n/),
    index: 0,
    heading: null,
    paragraphs: [],
    bullets: [],
    paragraphBuffer: [],
    table: null,
  };
}

function consumeAssistantLine(parser: AssistantContentParser) {
  const line = parser.lines[parser.index].trim();
  if (!line) return flushAssistantParagraph(parser);
  if (consumeHeadingLine(parser, line)) return;
  if (consumeBulletLine(parser, line)) return;
  if (consumeTableLines(parser, line)) return;
  parser.paragraphBuffer.push(line);
}

function consumeHeadingLine(
  parser: AssistantContentParser,
  line: string,
): boolean {
  const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
  if (!headingMatch || parser.heading) return false;
  flushAssistantParagraph(parser);
  parser.heading = headingMatch[1].trim();
  return true;
}

function consumeBulletLine(
  parser: AssistantContentParser,
  line: string,
): boolean {
  const bulletMatch = line.match(/^[-*]\s+(.+)$/);
  if (!bulletMatch) return false;
  flushAssistantParagraph(parser);
  parser.bullets.push(bulletMatch[1].trim());
  return true;
}

function consumeTableLines(
  parser: AssistantContentParser,
  line: string,
): boolean {
  const tableHeader = readTableHeader(parser, line);
  if (!tableHeader) return false;
  flushAssistantParagraph(parser);
  parser.index += 2;
  parser.table = {
    headers: tableHeader,
    rows: readTableRows(parser, tableHeader),
  };
  parser.index -= 1;
  return true;
}

function readTableHeader(
  parser: AssistantContentParser,
  line: string,
): string[] | null {
  if (
    parser.table || !line.includes("|") ||
    parser.index + 1 >= parser.lines.length
  ) {
    return null;
  }
  const headers = tableCells(line);
  const separator = tableCells(parser.lines[parser.index + 1]);
  return isMarkdownTableSeparator(headers, separator) ? headers : null;
}

function isMarkdownTableSeparator(
  headers: string[],
  separator: string[],
): boolean {
  return headers.length > 1 && separator.length === headers.length &&
    separator.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function readTableRows(
  parser: AssistantContentParser,
  headers: string[],
): string[][] {
  const rows: string[][] = [];
  while (
    parser.index < parser.lines.length &&
    parser.lines[parser.index].includes("|")
  ) {
    const row = tableCells(parser.lines[parser.index]);
    if (row.length === headers.length) rows.push(row);
    parser.index += 1;
  }
  return rows;
}

function flushAssistantParagraph(parser: AssistantContentParser) {
  if (!parser.paragraphBuffer.length) return;
  parser.paragraphs.push(parser.paragraphBuffer.splice(0).join(" "));
}

function parserResult(
  parser: AssistantContentParser,
): StructuredAssistantContent {
  return {
    heading: parser.heading,
    paragraphs: parser.paragraphs,
    bullets: parser.bullets,
    table: parser.table,
  };
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
  return canReconnectStream(
      reconnectCount,
      terminal === "failed" ? retryable : true,
    )
    ? "reconnect"
    : "fail";
}

export function reduceStreamedReply(
  reply: StreamedReply,
  event: ChatStreamEvent,
): StreamedReply {
  if (event.event.startsWith("tool.")) return reduceToolEvent(reply, event);
  if (event.event.startsWith("response.")) {
    return reduceResponseEvent(reply, event);
  }
  return reduceWorkspaceEvent(reply, event);
}

function reduceWorkspaceEvent(
  reply: StreamedReply,
  event: ChatStreamEvent,
): StreamedReply {
  switch (event.event) {
    case "message.accepted":
      return { ...reply, status: "streaming" };
    case "citation":
      return appendStreamCitation(reply, event.data);
    default:
      return reply;
  }
}

function reduceToolEvent(
  reply: StreamedReply,
  event: ChatStreamEvent,
): StreamedReply {
  switch (event.event) {
    case "tool.started":
      return addStartedTool(reply, event.data.toolCallId, event.data.toolName);
    case "tool.completed":
      return completeStreamTool(
        reply,
        event.data.toolCallId,
        event.data.result,
      );
    default:
      return reply;
  }
}

function reduceResponseEvent(
  reply: StreamedReply,
  event: ChatStreamEvent,
): StreamedReply {
  switch (event.event) {
    case "response.delta":
      return appendStreamDelta(reply, event.data.textDelta);
    case "response.completed":
      return completeStreamReply(
        reply,
        event.data.content,
        event.data.citations,
      );
    case "response.failed":
      return { ...reply, status: "failed", error: event.data.message };
    default:
      return reply;
  }
}

function addStartedTool(
  reply: StreamedReply,
  id: string,
  name: string,
): StreamedReply {
  return {
    ...reply,
    status: "streaming",
    tools: [...(reply.tools ?? []), { id, name, status: "running" }],
  };
}

function completeStreamTool(
  reply: StreamedReply,
  id: string,
  result: unknown,
): StreamedReply {
  return {
    ...reply,
    status: "streaming",
    tools: (reply.tools ?? []).map((tool) =>
      tool.id === id ? { ...tool, status: "completed", result } : tool
    ),
  };
}

function appendStreamCitation(
  reply: StreamedReply,
  citation: NonNullable<StreamedReply["citations"]>[number],
): StreamedReply {
  return {
    ...reply,
    status: "streaming",
    citations: [...(reply.citations ?? []), citation],
  };
}

function appendStreamDelta(
  reply: StreamedReply,
  textDelta: string,
): StreamedReply {
  return {
    ...reply,
    content: reply.content + textDelta,
    status: "streaming",
  };
}

function completeStreamReply(
  reply: StreamedReply,
  content: string,
  citations: NonNullable<StreamedReply["citations"]>,
): StreamedReply {
  return {
    content: content || reply.content,
    status: "completed",
    tools: reply.tools,
    citations: citations.length ? citations : reply.citations,
  };
}

export function formatCompactMoney(
  amountMinor: string,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(amountMinor) / 100);
}
