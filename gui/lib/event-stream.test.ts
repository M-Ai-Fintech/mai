import { describe, expect, it } from "vitest";

import { consumeEventStream } from "./event-stream";

const EVENT_ID = "00000000-0000-4000-8000-000000000010";
const THREAD_ID = "00000000-0000-4000-8000-000000000011";
const MESSAGE_ID = "00000000-0000-4000-8000-000000000012";

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function deltaPayload(textDelta: string): string {
  return JSON.stringify({
    eventId: EVENT_ID,
    threadId: THREAD_ID,
    messageId: MESSAGE_ID,
    data: { textDelta },
  });
}

async function expectSplitEventParsing(): Promise<void> {
  const received: string[] = [];
  const response = streamResponse([
    "event: response.",
    `delta\r\nid: ${EVENT_ID}\r\ndata: ${deltaPayload("complete")}\r\n`,
    "\r\n",
  ]);

  await consumeEventStream(response, (event) => {
    if (event.event === "response.delta") received.push(event.data.textDelta);
  });

  expect(received).toEqual(["complete"]);
}

async function expectMultilineDataParsing(): Promise<void> {
  const payload = deltaPayload("multiline");
  const splitAt = payload.indexOf('"data"');
  const response = streamResponse([
    "event: response.delta\n",
    `data: ${payload.slice(0, splitAt)}\n`,
    `data: ${payload.slice(splitAt)}\n\n`,
  ]);
  const received: string[] = [];

  await consumeEventStream(response, (event) => {
    if (event.event === "response.delta") received.push(event.data.textDelta);
  });

  expect(received).toEqual(["multiline"]);
}

async function expectMalformedJsonRejection(): Promise<void> {
  const response = streamResponse([
    "event: response.delta\ndata: {broken}\n\n",
  ]);

  await expect(consumeEventStream(response, () => undefined)).rejects
    .toMatchObject({
      kind: "contract",
      message: "Chat stream emitted invalid JSON",
    });
}

async function expectInvalidEventRejection(): Promise<void> {
  const response = streamResponse([
    `event: response.delta\ndata: ${
      JSON.stringify({
        eventId: EVENT_ID,
        threadId: THREAD_ID,
        messageId: MESSAGE_ID,
        data: { textDelta: 42 },
      })
    }\n\n`,
  ]);

  await expect(consumeEventStream(response, () => undefined)).rejects
    .toMatchObject({
      kind: "contract",
    });
}

async function expectMissingStreamRejection(): Promise<void> {
  const response = new Response(null);

  await expect(consumeEventStream(response, () => undefined)).rejects
    .toMatchObject({
      kind: "contract",
      message: "Chat response has no stream body; expected text/event-stream",
    });
}

describe("consumeEventStream", () => {
  it(
    "parses an event split across arbitrary response chunks",
    expectSplitEventParsing,
  );
  it("joins multiline data before parsing JSON", expectMultilineDataParsing);
  it(
    "rejects malformed JSON with a contract error",
    expectMalformedJsonRejection,
  );
  it(
    "rejects an event that violates the chat event schema",
    expectInvalidEventRejection,
  );
  it("rejects responses without a stream body", expectMissingStreamRejection);
});
