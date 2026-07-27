import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClient } from "./api-client";

const deal = {
  id: "00000000-0000-4000-8000-000000000001",
  code: "HZ-2026",
  title: "Project Horizon",
  dealType: "buy_side",
  status: "active",
  currentPhase: "due_diligence",
  target: {
    id: "00000000-0000-4000-8000-000000000002",
    legalName: "Target S.A.",
    sector: "fintech",
    countryCode: "BR",
  },
  valuationRange: {
    min: { amountMinor: "45000000000", currency: "USD" },
    max: { amountMinor: "120000000000", currency: "USD" },
  },
  leadAdvisor: null,
  updatedAt: "2026-07-19T12:00:00Z",
  version: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

async function expectEncodedDealFilters(): Promise<void> {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      data: [deal],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const result = await ApiClient.listDeals({ search: "Horizon & Co", page: 1 });
  expect(result.data[0].title).toBe("Project Horizon");
  const requestedUrl = String(fetchMock.mock.calls[0][0]);
  expect(requestedUrl).toContain("search=Horizon+%26+Co");
  expect(requestedUrl).toContain("page=1");
}

async function expectRuntimeContractRejection(): Promise<void> {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ data: [{}] })),
  );
  await expect(ApiClient.listDeals()).rejects.toMatchObject({
    name: "APIError",
    kind: "contract",
  });
}

function stubConflictResponse(): void {
  const conflict = {
    error: {
      code: "LAYOUT_VERSION_CONFLICT",
      message: "Stale layout version",
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json(conflict, { status: 409 })),
  );
}

async function expectTypedConflictError(): Promise<void> {
  stubConflictResponse();
  await expect(ApiClient.getDashboardLayout("custom")).rejects.toMatchObject({
    status: 409,
    code: "LAYOUT_VERSION_CONFLICT",
    kind: "conflict",
  });
}

const responseDelta = {
  eventId: "00000000-0000-4000-8000-000000000010",
  threadId: "00000000-0000-4000-8000-000000000011",
  messageId: "00000000-0000-4000-8000-000000000012",
  data: { textDelta: "Analysis complete" },
};

function responseDeltaStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(
        `event: response.delta\nid: ${responseDelta.eventId}\n`,
      ));
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify(responseDelta)}\n\n`,
      ));
      controller.close();
    },
  });
}

function stubResponseDeltaStream(): void {
  const response = new Response(responseDeltaStream(), {
    headers: { "Content-Type": "text/event-stream" },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function chatRequest(): Parameters<typeof ApiClient.streamChat>[2] {
  return {
    agentId: "BrokerOrchestratorAgent" as const,
    message: "Assess the VDR",
    clientMessageId: "00000000-0000-4000-8000-000000000021",
  };
}

async function expectNamedSseEvent(): Promise<void> {
  stubResponseDeltaStream();
  const received: string[] = [];
  await ApiClient.streamChat(
    "00000000-0000-4000-8000-000000000020",
    responseDelta.threadId,
    chatRequest(),
    {
      onEvent: (event) => {
        if (event.event === "response.delta") {
          received.push(event.data.textDelta);
        }
      },
    },
  );
  expect(received).toEqual(["Analysis complete"]);
}

function abortableResponse(init: RequestInit): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      init.signal?.addEventListener("abort", () => {
        controller.error(new DOMException("Aborted", "AbortError"));
      });
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function stubAbortableFetch(): void {
  const fetchMock = vi.fn().mockImplementation(
    (_url: string, init: RequestInit) =>
      Promise.resolve(abortableResponse(init)),
  );
  vi.stubGlobal("fetch", fetchMock);
}

async function expectConnectedAbortSignal(): Promise<void> {
  stubAbortableFetch();
  const controller = new AbortController();
  const pending = ApiClient.streamChat(
    "00000000-0000-4000-8000-000000000020",
    responseDelta.threadId,
    chatRequest(),
    { signal: controller.signal, onEvent: () => undefined },
  );
  controller.abort();
  await expect(pending).rejects.toMatchObject({ kind: "aborted" });
}

function registerApiContractTests(): void {
  it(
    "encodes deal filters and parses the paginated response",
    expectEncodedDealFilters,
  );
  it(
    "rejects a successful HTTP response that violates the runtime contract",
    expectRuntimeContractRejection,
  );
  it(
    "maps the standard conflict envelope to a typed APIError",
    expectTypedConflictError,
  );
}

function registerApiStreamTests(): void {
  it(
    "parses named POST SSE events into the discriminated event union",
    expectNamedSseEvent,
  );
  it(
    "keeps AbortSignal connected while consuming the response body",
    expectConnectedAbortSignal,
  );
}

describe("ApiClient contract boundary", () => {
  registerApiContractTests();
  registerApiStreamTests();
});
