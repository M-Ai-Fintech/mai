import { assert, assertEquals, assertMatch } from "@std/assert";
import { handleMvpRoute } from "../../../src/api/mvp_routes.ts";
import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { request, route } from "../support/route.ts";

type ChatThread = ReturnType<MvpStore["createChatThread"]>;

Deno.test(
  "MVP chat routes create threads, emit typed SSE lifecycle, and persist messages",
  verifySuccessfulChatLifecycle,
);

Deno.test(
  "MVP chat stream persists failure and emits response.failed",
  verifyFailedChatLifecycle,
);

async function verifySuccessfulChatLifecycle(): Promise<void> {
  const store = new MvpStore();
  const thread = await createRiskReviewThread(store);
  const streamResponse = await requestSuccessfulStream(store, thread);
  assertSuccessfulStream(await streamResponse.text());
  await assertPersistedUserMessage(store, thread);
}

async function createRiskReviewThread(store: MvpStore): Promise<ChatThread> {
  const response = await route(store, chatThreadsPath(), "POST", {
    title: "Atlas risk review",
    agentId: "FinancialRiskAgent",
  });
  assertEquals(response.status, 201);
  return (await response.json()).data;
}

async function requestSuccessfulStream(
  store: MvpStore,
  thread: ChatThread,
): Promise<Response> {
  const response = await executeSuccessfulStream(store, thread.id);
  assert(response);
  assertMatch(
    response.headers.get("content-type")!,
    /^text\/event-stream/,
  );
  return response;
}

function executeSuccessfulStream(
  store: MvpStore,
  threadId: string,
): Promise<Response | null> {
  return handleMvpRoute(
    request(
      `${chatThreadsPath()}/${threadId}/stream`,
      "POST",
      successfulMessageInput(),
    ),
    {
      store,
      executeChat: () =>
        Promise.resolve({ content: "Moderate leverage risk.", citations: [] }),
    },
  );
}

function assertSuccessfulStream(streamText: string): void {
  const events = streamText.split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
  assertEquals(events[0].event, "message.accepted");
  assertEquals(
    events.filter((item) => item.event === "response.delta").length,
    2,
  );
  assertEquals(events.at(-1).event, "response.completed");
  assertEquals(events.at(-1).data.content, "Moderate leverage risk.");
}

async function assertPersistedUserMessage(
  store: MvpStore,
  thread: ChatThread,
): Promise<void> {
  const response = await route(
    store,
    `${chatThreadsPath()}/${thread.id}/messages?limit=1`,
  );
  const messages = await response.json();
  assertEquals(messages.data.length, 1);
  assert(messages.meta.nextCursor);
  assertEquals(messages.data[0].role, "user");
}

async function verifyFailedChatLifecycle(): Promise<void> {
  const store = new MvpStore();
  const thread = store.createChatThread(
    MVP_SEED_IDS.dealAtlas,
    "Failure path",
    "BrokerOrchestratorAgent",
  );
  const response = await requestFailedStream(store, thread);
  assertFailedStream(await response.text());
  assertEquals(store.listChatMessages(thread.id).data.length, 2);
}

async function requestFailedStream(
  store: MvpStore,
  thread: ChatThread,
): Promise<Response> {
  const response = await handleMvpRoute(
    request(
      `${chatThreadsPath()}/${thread.id}/stream`,
      "POST",
      failedMessageInput(),
    ),
    {
      store,
      executeChat: () => Promise.reject(new Error("model unavailable")),
    },
  );
  assert(response);
  return response;
}

function assertFailedStream(text: string): void {
  assertMatch(text, /event: response\.failed/);
  assertMatch(text, /CHAT_EXECUTION_FAILED/);
}

function chatThreadsPath(): string {
  return `/api/deals/${MVP_SEED_IDS.dealAtlas}/chat/threads`;
}

function successfulMessageInput(): Record<string, string> {
  return {
    agentId: "FinancialRiskAgent",
    message: "Summarize leverage risk",
    clientMessageId: "00000000-0000-4000-8000-000000000091",
  };
}

function failedMessageInput(): Record<string, string> {
  return {
    agentId: "BrokerOrchestratorAgent",
    message: "Fail safely",
    clientMessageId: "00000000-0000-4000-8000-000000000092",
  };
}
