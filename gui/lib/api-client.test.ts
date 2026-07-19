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

describe("ApiClient contract boundary", () => {
  it("encodes deal filters and parses the paginated response", async () => {
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
  });

  it("rejects a successful HTTP response that violates the runtime contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: [{}] })));

    await expect(ApiClient.listDeals()).rejects.toMatchObject({
      name: "APIError",
      kind: "contract",
    });
  });

  it("maps the standard conflict envelope to a typed APIError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { error: { code: "LAYOUT_VERSION_CONFLICT", message: "Stale layout version" } },
          { status: 409 },
        ),
      ),
    );

    await expect(ApiClient.getDashboardLayout("custom")).rejects.toMatchObject({
      status: 409,
      code: "LAYOUT_VERSION_CONFLICT",
      kind: "conflict",
    });
  });

  it("parses named POST SSE events into the discriminated event union", async () => {
    const event = {
      eventId: "00000000-0000-4000-8000-000000000010",
      threadId: "00000000-0000-4000-8000-000000000011",
      messageId: "00000000-0000-4000-8000-000000000012",
      data: { textDelta: "Analysis complete" },
    };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(`event: response.delta\nid: ${event.eventId}\n`),
        );
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(stream, { headers: { "Content-Type": "text/event-stream" } }),
      ),
    );
    const received: string[] = [];

    await ApiClient.streamChat(
      "00000000-0000-4000-8000-000000000020",
      event.threadId,
      {
        agentId: "BrokerOrchestratorAgent",
        message: "Assess the VDR",
        clientMessageId: "00000000-0000-4000-8000-000000000021",
      },
      {
        onEvent: (parsed) => {
          if (parsed.event === "response.delta") received.push(parsed.data.textDelta);
        },
      },
    );

    expect(received).toEqual(["Analysis complete"]);
  });

  it("keeps AbortSignal connected while consuming the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            init.signal?.addEventListener("abort", () => {
              controller.error(new DOMException("Aborted", "AbortError"));
            });
          },
        });
        return Promise.resolve(
          new Response(stream, { headers: { "Content-Type": "text/event-stream" } }),
        );
      }),
    );
    const controller = new AbortController();
    const pending = ApiClient.streamChat(
      "00000000-0000-4000-8000-000000000020",
      "00000000-0000-4000-8000-000000000011",
      {
        agentId: "BrokerOrchestratorAgent",
        message: "Assess the VDR",
        clientMessageId: "00000000-0000-4000-8000-000000000021",
      },
      { signal: controller.signal, onEvent: () => undefined },
    );

    controller.abort();

    await expect(pending).rejects.toMatchObject({ kind: "aborted" });
  });
});
