import { z } from "zod";

import { consumeEventStream } from "../event-stream";
import {
  chatMessageSchema,
  chatStreamRequestSchema,
  chatThreadSchema,
  createChatThreadSchema,
} from "./chat-schemas";
import { APIError } from "./errors";
import {
  apiErrorFromResponse,
  createEnvelopeSchema,
  jsonOptions,
  pathSegment,
  request,
  requestSignal,
  withQuery,
} from "./transport";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ChatThread,
  StreamChatOptions,
} from "./types";

export async function listChatThreads(dealId: string): Promise<ChatThread[]> {
  const response = await request(
    `/api/deals/${pathSegment(dealId)}/chat/threads`,
    createEnvelopeSchema(z.array(chatThreadSchema)),
  );
  return response.data;
}

export async function createChatThread(
  dealId: string,
  data: z.infer<typeof createChatThreadSchema>,
  signal?: AbortSignal,
): Promise<ChatThread> {
  const body = createChatThreadSchema.parse(data);
  const response = await request(
    `/api/deals/${pathSegment(dealId)}/chat/threads`,
    createEnvelopeSchema(chatThreadSchema),
    jsonOptions("POST", body, signal),
  );
  return response.data;
}

export function listChatMessages(
  dealId: string,
  threadId: string,
  cursor?: string,
): Promise<{
  data: z.infer<typeof chatMessageSchema>[];
  meta: { nextCursor: string | null };
}> {
  return request(
    withQuery(chatMessagesPath(dealId, threadId), { cursor }),
    chatMessagesPageSchema(),
  );
}

function chatMessagesPath(dealId: string, threadId: string): string {
  return `/api/deals/${pathSegment(dealId)}/chat/threads/${
    pathSegment(threadId)
  }/messages`;
}

function chatMessagesPageSchema() {
  return z.object({
    data: z.array(chatMessageSchema),
    meta: z.object({ nextCursor: z.string().nullable() }),
  });
}

export async function streamChat(
  dealId: string,
  threadId: string,
  data: ChatStreamRequest,
  options: StreamChatOptions,
): Promise<void> {
  const body = chatStreamRequestSchema.parse(data);
  const composed = requestSignal(options.signal, 120_000);
  try {
    await consumeCheckedEventStream(
      await postChatStream(dealId, threadId, body, options, composed.signal),
      options.onEvent,
    );
  } catch (error) {
    throw streamError(error, options.signal, composed.signal);
  } finally {
    composed.cleanup();
  }
}

function postChatStream(
  dealId: string,
  threadId: string,
  body: ChatStreamRequest,
  options: StreamChatOptions,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(chatStreamUrl(dealId, threadId), {
    method: "POST",
    headers: streamHeaders(options),
    body: JSON.stringify(body),
    signal,
  });
}

function chatStreamUrl(dealId: string, threadId: string): string {
  return withQuery(
    `/api/deals/${pathSegment(dealId)}/chat/threads/${
      pathSegment(threadId)
    }/stream`,
  );
}

function streamHeaders(options: StreamChatOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.lastEventId) headers["Last-Event-ID"] = options.lastEventId;
  return headers;
}

async function consumeCheckedEventStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  if (!response.ok) throw await apiErrorFromResponse(response);
  if (!isEventStreamResponse(response)) {
    throw new APIError("Chat endpoint did not return an event stream", {
      kind: "contract",
    });
  }
  await consumeEventStream(response, onEvent);
}

function isEventStreamResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/event-stream");
}

function streamError(
  error: unknown,
  external: AbortSignal | undefined,
  composed: AbortSignal,
): APIError {
  if (error instanceof APIError) return error;
  if (external?.aborted) return abortedStreamError(error);
  if (composed.aborted) return timeoutStreamError(error);
  return networkStreamError(error);
}

function abortedStreamError(cause: unknown): APIError {
  return new APIError("Request aborted", { kind: "aborted", cause });
}

function timeoutStreamError(cause: unknown): APIError {
  return new APIError("Chat stream timed out", {
    status: 408,
    kind: "timeout",
    cause,
  });
}

function networkStreamError(cause: unknown): APIError {
  const message = cause instanceof Error ? cause.message : "Chat stream failed";
  return new APIError(message, { kind: "network", cause });
}

export function chatStream(
  dealId: string,
  query: string,
  onMessage: (message: string) => void,
  onError: (error: APIError) => void,
): () => void {
  const controller = new AbortController();
  void runLegacyChatStream(dealId, query, onMessage, onError, controller);
  return () => controller.abort();
}

async function runLegacyChatStream(
  dealId: string,
  query: string,
  onMessage: (message: string) => void,
  onError: (error: APIError) => void,
  controller: AbortController,
): Promise<void> {
  try {
    const thread = await createLegacyThread(dealId, query, controller.signal);
    await streamChat(dealId, thread.id, legacyChatBody(query), {
      signal: controller.signal,
      onEvent: legacyChatEventSink(onMessage, onError),
    });
  } catch (error) {
    handleLegacyChatError(error, onError);
  }
}

function createLegacyThread(
  dealId: string,
  query: string,
  signal: AbortSignal,
): Promise<ChatThread> {
  return createChatThread(
    dealId,
    { title: query.slice(0, 80), agentId: "BrokerOrchestratorAgent" },
    signal,
  );
}

function legacyChatBody(query: string): ChatStreamRequest {
  return {
    agentId: "BrokerOrchestratorAgent",
    message: query,
    clientMessageId: crypto.randomUUID(),
  };
}

function legacyChatEventSink(
  onMessage: (message: string) => void,
  onError: (error: APIError) => void,
): (event: ChatStreamEvent) => void {
  return (event) => {
    if (event.event === "response.delta") onMessage(event.data.textDelta);
    if (event.event === "response.failed") onError(chatFailureError(event));
  };
}

function chatFailureError(event: ChatStreamEvent): APIError {
  if (event.event !== "response.failed") {
    return new APIError("Expected response.failed chat event", {
      kind: "contract",
    });
  }
  return new APIError(event.data.message, {
    code: event.data.code,
    kind: "server",
  });
}

function handleLegacyChatError(
  error: unknown,
  onError: (error: APIError) => void,
): void {
  if (error instanceof APIError && error.kind === "aborted") return;
  onError(error instanceof APIError ? error : fallbackLegacyChatError(error));
}

function fallbackLegacyChatError(error: unknown): APIError {
  const message = error instanceof Error ? error.message : "Chat stream failed";
  return new APIError(message, { cause: error });
}
