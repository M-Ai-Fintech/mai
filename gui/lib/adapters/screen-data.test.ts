import { afterEach, describe, expect, it, vi } from "vitest";

import { routeRegistry } from "@/lib/shell/route-registry";
import { readScreenAdapter } from "./screen-data";

class FakeScreenTransport {
  readonly requests: Array<RequestInfo | URL> = [];

  constructor(private readonly response: Response) {}

  install(): void {
    vi.stubGlobal("fetch", this.fetch.bind(this));
  }

  private fetch(input: RequestInfo | URL): Promise<Response> {
    this.requests.push(input);
    return Promise.resolve(this.response.clone());
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function resolution(routeId: string, routeParameters = {}) {
  const route = routeRegistry.find((candidate) => candidate.id === routeId);
  if (route === undefined) throw new Error(`Missing route ${routeId}.`);
  return {
    kind: "ready" as const,
    route,
    routeParameters,
    permissions: [route.permission],
  };
}

describe("screen adapter integration", () => {
  it("keeps an unregistered global route unavailable without a request", async () => {
    const transport = new FakeScreenTransport(Response.json({}));
    transport.install();

    const result = await readScreenAdapter(resolution("global.home"));

    expect(result).toMatchObject({
      state: "unavailable",
      failure: { code: "ROUTE_UNAVAILABLE" },
    });
    expect(transport.requests).toHaveLength(0);
  });

  it("passes route parameters to a registered deal adapter", async () => {
    const transport = new FakeScreenTransport(
      Response.json({
        data: { family: "deal-overview", items: [] },
        meta: { correlationId: "correlation-screen" },
      }),
    );
    transport.install();

    const result = await readScreenAdapter(
      resolution("deal.overview", { dealId: "deal-1" }),
    );

    expect(result).toMatchObject({ state: "ready", data: { family: "deal-overview" } });
    expect(String(transport.requests[0])).toContain("/api/v1/deals/deal-1");
  });

  it("does not request a registered route when its required identifier is absent", async () => {
    const transport = new FakeScreenTransport(Response.json({}));
    transport.install();

    const result = await readScreenAdapter(resolution("deal.closing"));

    expect(result).toMatchObject({
      state: "unavailable",
      failure: { code: "ROUTE_PARAMETER_MISSING" },
    });
    expect(transport.requests).toHaveLength(0);
  });
});
