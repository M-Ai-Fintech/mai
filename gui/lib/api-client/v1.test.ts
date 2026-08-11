import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { requestV1, requestV1Accepted } from "./v1";

class FakeV1Transport {
  readonly requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> =
    [];

  constructor(private readonly response: Response) {}

  install(): void {
    vi.stubGlobal("fetch", this.fetch.bind(this));
  }

  private fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    this.requests.push({ input, init });
    return Promise.resolve(this.response.clone());
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("v1 API client contract", () => {
  it("preserves same-origin command paths in the browser", async () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
    const transport = new FakeV1Transport(Response.json({
      data: { id: "receipt-1" },
      meta: { correlationId: "cor_browser", freshness: "current" },
    }));
    transport.install();

    await requestV1(
      "/commands/demo-readiness/execute",
      z.object({ id: z.string() }),
      { query: { source: "banker" } },
    );

    expect(transport.requests[0].input).toBe(
      "/commands/demo-readiness/execute?source=banker",
    );
  });

  it("sends correlation, concurrency, and idempotency headers", async () => {
    const transport = new FakeV1Transport(
      Response.json(
        {
          data: { id: "deal-1" },
          meta: { correlationId: "correlation-1", freshness: "current" },
        },
        { headers: { ETag: '"version-4"' } },
      ),
    );
    transport.install();

    const result = await requestV1(
      "/api/v1/deals/deal-1",
      z.object({ id: z.string() }),
      {
        method: "GET",
        ifMatch: '"version-3"',
        idempotencyKey: "request-1",
        correlationId: "correlation-1",
      },
    );

    const request = transport.requests[0];
    expect(String(request.input)).toContain("/api/v1/deals/deal-1");
    expect(new Headers(request.init?.headers).get("Accept")).toBe(
      "application/json",
    );
    expect(new Headers(request.init?.headers).get("If-Match")).toBe(
      '"version-3"',
    );
    expect(new Headers(request.init?.headers).get("Idempotency-Key")).toBe(
      "request-1",
    );
    expect(new Headers(request.init?.headers).get("X-Correlation-Id")).toBe(
      "correlation-1",
    );
    expect(result).toMatchObject({
      data: { id: "deal-1" },
      meta: { correlationId: "correlation-1" },
      etag: '"version-4"',
    });
  });

  it("maps v1 forbidden responses to a typed API error", async () => {
    const transport = new FakeV1Transport(
      Response.json(
        { error: { code: "ACTION_FORBIDDEN", message: "Access denied" } },
        { status: 403 },
      ),
    );
    transport.install();

    await expect(
      requestV1("/api/v1/deals/deal-1", z.object({ id: z.string() })),
    ).rejects.toMatchObject({
      name: "APIError",
      code: "ACTION_FORBIDDEN",
      kind: "forbidden",
      status: 403,
    });
  });

  it("retains legacy string field errors while accepting structured issues", async () => {
    const transport = new FakeV1Transport(
      Response.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "The request is invalid.",
            retryable: false,
            fieldErrors: { dealId: ["Deal ID is required."] },
          },
        },
        { status: 422 },
      ),
    );
    transport.install();

    await expect(
      requestV1("/api/v1/deals/deal-1", z.object({ id: z.string() })),
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      kind: "validation",
      fieldErrors: { dealId: ["Deal ID is required."] },
    });
  });

  it("rejects a successful response without v1 metadata", async () => {
    const transport = new FakeV1Transport(
      Response.json({ data: { id: "deal-1" } }),
    );
    transport.install();

    await expect(
      requestV1("/api/v1/deals/deal-1", z.object({ id: z.string() })),
    ).rejects.toMatchObject({ name: "APIError", kind: "contract" });
  });

  it("preserves stale projection metadata on a successful read", async () => {
    const transport = new FakeV1Transport(
      Response.json({
        data: { id: "deal-1" },
        meta: { correlationId: "correlation-3", freshness: "stale" },
      }),
    );
    transport.install();

    await expect(
      requestV1("/api/v1/deals/deal-1", z.object({ id: z.string() })),
    ).resolves.toMatchObject({
      data: { id: "deal-1" },
      meta: { freshness: "stale" },
    });
  });

  it("parses accepted asynchronous command receipts", async () => {
    const transport = new FakeV1Transport(
      Response.json(
        {
          data: {
            operationId: "operation-1",
            jobId: "job-1",
            status: "queued",
            statusUrl: "/api/v1/jobs/job-1",
          },
          meta: { correlationId: "correlation-4" },
        },
        { status: 202 },
      ),
    );
    transport.install();

    await expect(
      requestV1Accepted("/api/v1/deliverables/deliverable-1/exports", {
        method: "POST",
        idempotencyKey: "request-2",
        ifMatch: '"version-1"',
      }),
    ).resolves.toMatchObject({
      status: 202,
      data: { jobId: "job-1" },
      meta: { correlationId: "correlation-4" },
    });
  });

  it("does not treat a terminal async error envelope as successful data", async () => {
    const transport = new FakeV1Transport(
      Response.json({
        error: {
          code: "ASYNC_OPERATION_FAILED",
          message: "The operation failed.",
        },
      }),
    );
    transport.install();

    await expect(
      requestV1("/api/v1/jobs/job-1", z.object({ id: z.string() })),
    ).rejects.toMatchObject({
      code: "ASYNC_OPERATION_FAILED",
      kind: "async_failed",
    });
  });
});
