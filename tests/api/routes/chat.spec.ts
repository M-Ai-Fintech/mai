import { assert, assertEquals, assertMatch } from "@std/assert";
import { handleMvpRoute } from "../../../src/api/mvp_routes.ts";
import { MVP_SEED_IDS, MvpStore } from "../../../src/api/mvp_store.ts";
import { request, route } from "../support/route.ts";

Deno.test("MVP chat routes create threads, emit typed SSE lifecycle, and persist messages", async () => {
  const store = new MvpStore();
  const threadResponse = await route(
    store,
    `/api/deals/${MVP_SEED_IDS.dealAtlas}/chat/threads`,
    "POST",
    { title: "Atlas risk review", agentId: "FinancialRiskAgent" },
  );
  const thread = (await threadResponse.json()).data;
  assertEquals(threadResponse.status, 201);

  const streamResponse = await handleMvpRoute(
    request(
      `/api/deals/${MVP_SEED_IDS.dealAtlas}/chat/threads/${thread.id}/stream`,
      "POST",
      {
        agentId: "FinancialRiskAgent",
        message: "Summarize leverage risk",
        clientMessageId: "00000000-0000-4000-8000-000000000091",
      },
    ),
    {
      store,
      executeChat: () =>
        Promise.resolve({ content: "Moderate leverage risk.", citations: [] }),
    },
  );
  assert(streamResponse);
  assertMatch(
    streamResponse.headers.get("content-type")!,
    /^text\/event-stream/,
  );
  const streamText = await streamResponse.text();
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

  const messages = await (await route(
    store,
    `/api/deals/${MVP_SEED_IDS.dealAtlas}/chat/threads/${thread.id}/messages?limit=1`,
  )).json();
  assertEquals(messages.data.length, 1);
  assert(messages.meta.nextCursor);
  assertEquals(messages.data[0].role, "user");
});

Deno.test("MVP chat stream persists failure and emits response.failed", async () => {
  const store = new MvpStore();
  const thread = store.createChatThread(
    MVP_SEED_IDS.dealAtlas,
    "Failure path",
    "BrokerOrchestratorAgent",
  );
  const response = await handleMvpRoute(
    request(
      `/api/deals/${MVP_SEED_IDS.dealAtlas}/chat/threads/${thread.id}/stream`,
      "POST",
      {
        agentId: "BrokerOrchestratorAgent",
        message: "Fail safely",
        clientMessageId: "00000000-0000-4000-8000-000000000092",
      },
    ),
    {
      store,
      executeChat: () => Promise.reject(new Error("model unavailable")),
    },
  );
  assert(response);
  const text = await response.text();
  assertMatch(text, /event: response\.failed/);
  assertMatch(text, /CHAT_EXECUTION_FAILED/);
  assertEquals(store.listChatMessages(thread.id).data.length, 2);
});
