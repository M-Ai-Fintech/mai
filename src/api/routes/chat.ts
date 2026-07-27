import { z } from "zod";
import { jsonSuccess } from "../contracts.ts";
import { createChatStreamResponse } from "./chat_stream.ts";
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

export async function handleChatRoutes(
  context: MvpRouteContext,
): Promise<Response | null> {
  return await handleThreads(context) ??
    handleMessages(context) ??
    await handleStream(context);
}

async function handleThreads(
  context: MvpRouteContext,
): Promise<Response | null> {
  const match = context.path.match(/^\/api\/deals\/([^/]+)\/chat\/threads$/);
  if (!match) return null;
  const dealId = routeId(match[1], "dealId");
  if (context.method === "GET") {
    return jsonSuccess(context.store.listChatThreads(dealId));
  }
  if (context.method !== "POST") return methodNotAllowed(["GET", "POST"]);
  const input = createThread.parse(await bodyAsJson(context.request));
  return jsonSuccess(
    context.store.createChatThread(dealId, input.title, input.agentId),
    { status: 201 },
  );
}

function handleMessages(context: MvpRouteContext): Response | null {
  const match = context.path.match(
    /^\/api\/deals\/([^/]+)\/chat\/threads\/([^/]+)\/messages$/,
  );
  if (!match) return null;
  const [dealId, threadId] = threadRouteIds(match);
  if (context.method !== "GET") return methodNotAllowed(["GET"]);
  assertThreadExists(context, dealId, threadId);
  const result = context.store.listChatMessages(
    threadId,
    context.url.searchParams.get("cursor") || undefined,
    parseLimit(context.url.searchParams.get("limit"), 50),
  );
  return jsonResult(result);
}

async function handleStream(
  context: MvpRouteContext,
): Promise<Response | null> {
  const match = context.path.match(
    /^\/api\/deals\/([^/]+)\/chat\/threads\/([^/]+)\/stream$/,
  );
  if (!match) return null;
  const [dealId, threadId] = threadRouteIds(match);
  if (context.method !== "POST") return methodNotAllowed(["POST"]);
  assertThreadExists(context, dealId, threadId);
  const input = streamChat.parse(await bodyAsJson(context.request));
  return createChatStreamResponse(context, dealId, threadId, input);
}

function assertThreadExists(
  context: MvpRouteContext,
  dealId: string,
  threadId: string,
): void {
  const exists = context.store.listChatThreads(dealId).some(
    (thread) => thread.id === threadId,
  );
  if (exists) return;
  throw new HttpRouteError(
    404,
    "CHAT_THREAD_NOT_FOUND",
    `Chat thread "${threadId}" was not found for deal "${dealId}"`,
  );
}

function threadRouteIds(match: RegExpMatchArray): [string, string] {
  return [routeId(match[1], "dealId"), routeId(match[2], "threadId")];
}

function routeId(value: string, field: string): string {
  return validateId(decodeURIComponent(value), field);
}

function jsonResult(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
