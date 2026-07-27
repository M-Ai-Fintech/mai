import { z } from "zod";

import {
  APIError,
  type ChatStreamEvent,
  chatStreamEventSchema,
} from "./api-client";

interface PendingEvent {
  name: string;
  id: string;
  dataLines: string[];
}

function parseEventPayload(pending: PendingEvent): ChatStreamEvent {
  const payload = parsePendingJson(pending);
  const objectPayload = typeof payload === "object" && payload !== null
    ? payload
    : {};
  return parseChatStreamPayload(pending, objectPayload);
}

function parsePendingJson(pending: PendingEvent): unknown {
  try {
    return JSON.parse(pending.dataLines.join("\n"));
  } catch (cause) {
    throw new APIError("Chat stream emitted invalid JSON", {
      kind: "contract",
      cause,
    });
  }
}

function parseChatStreamPayload(
  pending: PendingEvent,
  objectPayload: object,
): ChatStreamEvent {
  const parsed = chatStreamEventSchema.safeParse({
    ...objectPayload,
    event: pending.name ||
      ("event" in objectPayload ? objectPayload.event : undefined),
    eventId: "eventId" in objectPayload ? objectPayload.eventId : pending.id,
  });
  if (parsed.success) return parsed.data;
  throw new APIError(
    `Chat event contract mismatch: ${z.prettifyError(parsed.error)}`,
    {
      kind: "contract",
      cause: parsed.error,
    },
  );
}

function addEventField(pending: PendingEvent, line: string): void {
  if (line.startsWith(":")) return;
  const separator = line.indexOf(":");
  const field = separator < 0 ? line : line.slice(0, separator);
  const value = separator < 0
    ? ""
    : line.slice(separator + 1).replace(/^ /, "");
  if (field === "event") pending.name = value;
  if (field === "id") pending.id = value;
  if (field === "data") pending.dataLines.push(value);
}

function dispatchEvent(
  pending: PendingEvent,
  onEvent: (event: ChatStreamEvent) => void,
): void {
  if (pending.dataLines.length === 0) return;
  onEvent(parseEventPayload(pending));
  pending.name = "";
  pending.id = "";
  pending.dataLines = [];
}

function consumeCompleteLines(
  buffer: string,
  pending: PendingEvent,
  onEvent: (event: ChatStreamEvent) => void,
): string {
  let remaining = buffer;
  let newlineIndex = remaining.indexOf("\n");
  while (newlineIndex >= 0) {
    const line = remaining.slice(0, newlineIndex);
    remaining = remaining.slice(newlineIndex + 1);
    if (line === "") dispatchEvent(pending, onEvent);
    else addEventField(pending, line);
    newlineIndex = remaining.indexOf("\n");
  }
  return remaining;
}

function appendTrailingData(pending: PendingEvent, buffer: string): void {
  if (!buffer) return;
  const value = buffer.startsWith("data:")
    ? buffer.slice(5).trimStart()
    : buffer;
  pending.dataLines.push(value);
}

/**
 * Consumes a server-sent event response and validates every chat event.
 * Example: `await consumeEventStream(response, (event) => events.push(event))`.
 */
export async function consumeEventStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const reader = eventStreamReader(response);
  await consumeReaderEvents(reader, onEvent);
}

function eventStreamReader(response: Response) {
  if (response.body) return response.body.getReader();
  throw new APIError(
    "Chat response has no stream body; expected text/event-stream",
    {
      kind: "contract",
    },
  );
}

async function consumeReaderEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  const pending: PendingEvent = { name: "", id: "", dataLines: [] };
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    buffer = consumeCompleteLines(buffer, pending, onEvent);
    if (!done) continue;
    appendTrailingData(pending, buffer);
    dispatchEvent(pending, onEvent);
    return;
  }
}
