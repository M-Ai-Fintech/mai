import { z } from "zod";
import { ChatStreamEvent, jsonSuccess } from "../contracts.ts";
import { AgentId } from "../mvp_store.ts";
import {
  bodyAsJson,
  HttpRouteError,
  methodNotAllowed,
  MvpRouteContext,
  parseLimit,
  uuid,
  validateId,
} from "./shared.ts";

const agentId = z.enum([
  "BrokerOrchestratorAgent",
  "FinancialRiskAgent",
  "LegalDueDiligenceAgent",
  "NegotiationAgent",
]);

const createThread = z.object({
  title: z.string().trim().min(1),
  agentId,
}).strict();

const streamChat = z.object({
  agentId,
  message: z.string().trim().min(1),
  clientMessageId: uuid,
}).strict();

function splitDeltas(content: string): [string, string] {
  const midpoint = Math.max(1, Math.ceil(content.length / 2));
  return [content.slice(0, midpoint), content.slice(midpoint)];
}

function sseEvent(event: ChatStreamEvent): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `id: ${event.eventId}\nevent: ${event.event}\ndata: ${
      JSON.stringify(event)
    }\n\n`,
  );
}

function createChatStreamResponse(
  context: MvpRouteContext,
  dealId: string,
  threadId: string,
  input: z.infer<typeof streamChat>,
): Response {
  const { store, executeChat } = context;
  const userMessage = store.appendUserMessage(dealId, threadId, input);
  const assistant = store.startAssistantMessage(threadId, input.agentId);
  const event = <T extends ChatStreamEvent>(
    value: Omit<T, "eventId" | "threadId" | "messageId">,
  ): T => ({
    ...value,
    eventId: crypto.randomUUID(),
    threadId,
    messageId: assistant.id,
  } as T);

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sseEvent(event({
        event: "message.accepted",
        data: { clientMessageId: userMessage.clientMessageId! },
      })));
      void (async () => {
        try {
          const result = await executeChat({
            dealId,
            threadId,
            agentId: input.agentId as AgentId,
            message: input.message,
          });
          for (const textDelta of splitDeltas(result.content)) {
            store.appendAssistantDelta(threadId, assistant.id, textDelta);
            controller.enqueue(
              sseEvent(event({ event: "response.delta", data: { textDelta } })),
            );
          }
          const completed = store.completeAssistantMessage(
            threadId,
            assistant.id,
            result.citations ?? [],
          );
          controller.enqueue(sseEvent(event({
            event: "response.completed",
            data: {
              content: completed.content,
              citations: completed.citations,
            },
          })));
        } catch (cause) {
          const message = cause instanceof Error
            ? cause.message
            : "Chat execution failed";
          store.failAssistantMessage(threadId, assistant.id, message);
          controller.enqueue(sseEvent(event({
            event: "response.failed",
            data: { code: "CHAT_EXECUTION_FAILED", message, retryable: true },
          })));
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

export async function handleChatRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  const { request, url, path, method, store } = context;

  const threadsMatch = path.match(/^\/api\/deals\/([^/]+)\/chat\/threads$/);
  if (threadsMatch) {
    const dealId = validateId(decodeURIComponent(threadsMatch[1]), "dealId");
    if (method === "GET") return jsonSuccess(store.listChatThreads(dealId));
    if (method === "POST") {
      const input = createThread.parse(await bodyAsJson(request));
      return jsonSuccess(
        store.createChatThread(dealId, input.title, input.agentId),
        { status: 201 },
      );
    }
    return methodNotAllowed(["GET", "POST"]);
  }

  const messagesMatch = path.match(
    /^\/api\/deals\/([^/]+)\/chat\/threads\/([^/]+)\/messages$/,
  );
  if (messagesMatch) {
    const dealId = validateId(decodeURIComponent(messagesMatch[1]), "dealId");
    const threadId = validateId(
      decodeURIComponent(messagesMatch[2]),
      "threadId",
    );
    if (method !== "GET") return methodNotAllowed(["GET"]);
    if (
      !store.listChatThreads(dealId).some((thread) => thread.id === threadId)
    ) {
      throw new HttpRouteError(
        404,
        "CHAT_THREAD_NOT_FOUND",
        "Chat thread not found",
      );
    }
    const result = store.listChatMessages(
      threadId,
      url.searchParams.get("cursor") || undefined,
      parseLimit(url.searchParams.get("limit"), 50),
    );
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const streamMatch = path.match(
    /^\/api\/deals\/([^/]+)\/chat\/threads\/([^/]+)\/stream$/,
  );
  if (streamMatch) {
    const dealId = validateId(decodeURIComponent(streamMatch[1]), "dealId");
    const threadId = validateId(
      decodeURIComponent(streamMatch[2]),
      "threadId",
    );
    if (method !== "POST") return methodNotAllowed(["POST"]);
    if (
      !store.listChatThreads(dealId).some((thread) => thread.id === threadId)
    ) {
      throw new HttpRouteError(
        404,
        "CHAT_THREAD_NOT_FOUND",
        "Chat thread not found",
      );
    }
    const input = streamChat.parse(await bodyAsJson(request));
    return createChatStreamResponse(context, dealId, threadId, input);
  }

  return null;
}
