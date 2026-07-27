import { ChatStreamEvent } from "../contracts.ts";
import { AgentId } from "../mvp_store.ts";
import { MvpRouteContext } from "./shared.ts";

export interface ChatStreamInput {
  agentId: AgentId;
  message: string;
  clientMessageId: string;
}

interface ChatStreamSession {
  context: MvpRouteContext;
  dealId: string;
  threadId: string;
  assistantId: string;
  clientMessageId: string;
  input: ChatStreamInput;
}

export function createChatStreamResponse(
  context: MvpRouteContext,
  dealId: string,
  threadId: string,
  input: ChatStreamInput,
): Response {
  const session = createSession(context, dealId, threadId, input);
  const body = new ReadableStream<Uint8Array>({
    start: (controller) => startChatStream(controller, session),
  });
  return new Response(body, { status: 200, headers: streamHeaders() });
}

function createSession(
  context: MvpRouteContext,
  dealId: string,
  threadId: string,
  input: ChatStreamInput,
): ChatStreamSession {
  const user = context.store.appendUserMessage(dealId, threadId, input);
  const assistant = context.store.startAssistantMessage(
    threadId,
    input.agentId,
  );
  return {
    context,
    dealId,
    threadId,
    input,
    assistantId: assistant.id,
    clientMessageId: user.clientMessageId!,
  };
}

function startChatStream(
  controller: ReadableStreamDefaultController<Uint8Array>,
  session: ChatStreamSession,
): void {
  enqueueEvent(controller, session, {
    event: "message.accepted",
    data: { clientMessageId: session.clientMessageId },
  });
  void streamAssistant(controller, session);
}

async function streamAssistant(
  controller: ReadableStreamDefaultController<Uint8Array>,
  session: ChatStreamSession,
): Promise<void> {
  try {
    await executeAssistant(controller, session);
  } catch (cause: unknown) {
    failAssistant(controller, session, cause);
  } finally {
    controller.close();
  }
}

async function executeAssistant(
  controller: ReadableStreamDefaultController<Uint8Array>,
  session: ChatStreamSession,
): Promise<void> {
  const result = await session.context.executeChat({
    dealId: session.dealId,
    threadId: session.threadId,
    agentId: session.input.agentId,
    message: session.input.message,
  });
  for (const delta of splitDeltas(result.content)) {
    appendDelta(controller, session, delta);
  }
  completeAssistant(controller, session, result.citations ?? []);
}

function appendDelta(
  controller: ReadableStreamDefaultController<Uint8Array>,
  session: ChatStreamSession,
  textDelta: string,
): void {
  session.context.store.appendAssistantDelta(
    session.threadId,
    session.assistantId,
    textDelta,
  );
  enqueueEvent(controller, session, {
    event: "response.delta",
    data: { textDelta },
  });
}

function completeAssistant(
  controller: ReadableStreamDefaultController<Uint8Array>,
  session: ChatStreamSession,
  citations: Parameters<
    MvpRouteContext["store"]["completeAssistantMessage"]
  >[2],
): void {
  const completed = session.context.store.completeAssistantMessage(
    session.threadId,
    session.assistantId,
    citations,
  );
  enqueueEvent(controller, session, {
    event: "response.completed",
    data: { content: completed.content, citations: completed.citations },
  });
}

function failAssistant(
  controller: ReadableStreamDefaultController<Uint8Array>,
  session: ChatStreamSession,
  cause: unknown,
): void {
  const message = cause instanceof Error
    ? cause.message
    : "Chat execution failed";
  session.context.store.failAssistantMessage(
    session.threadId,
    session.assistantId,
    message,
  );
  enqueueEvent(controller, session, {
    event: "response.failed",
    data: { code: "CHAT_EXECUTION_FAILED", message, retryable: true },
  });
}

function enqueueEvent<T extends ChatStreamEvent>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  session: ChatStreamSession,
  event: Omit<T, "eventId" | "threadId" | "messageId">,
): void {
  const identified = {
    ...event,
    eventId: crypto.randomUUID(),
    threadId: session.threadId,
    messageId: session.assistantId,
  } as T;
  controller.enqueue(encodeEvent(identified));
}

function encodeEvent(event: ChatStreamEvent): Uint8Array {
  const payload = JSON.stringify(event);
  return new TextEncoder().encode(
    `id: ${event.eventId}\nevent: ${event.event}\ndata: ${payload}\n\n`,
  );
}

function splitDeltas(content: string): [string, string] {
  const midpoint = Math.max(1, Math.ceil(content.length / 2));
  return [content.slice(0, midpoint), content.slice(midpoint)];
}

function streamHeaders(): HeadersInit {
  return {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive",
  };
}
