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
  const demoEnvironment = {
    NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
  };

  it("loads the registered command center through the typed demo route", async () => {
    const transport = new FakeScreenTransport(Response.json({
      data: { family: "command-center", items: [] },
      meta: { correlationId: "correlation-screen", freshness: "current" },
    }));
    transport.install();

    const result = await readScreenAdapter(resolution("global.home"), {
      environment: demoEnvironment,
      routeParameters: { dealId: "deal_serra-azul" },
    });

    expect(result).toMatchObject({ state: "ready", source: "v1" });
    expect(transport.requests).toHaveLength(1);
  });

  it("loads the registered deal overview through its exact contract", async () => {
    const transport = new FakeScreenTransport(
      Response.json({
        data: { family: "deal-overview", items: [] },
        meta: { correlationId: "correlation-screen", freshness: "current" },
      }),
    );
    transport.install();

    const result = await readScreenAdapter(
      resolution("deal.overview", { dealId: "deal-1" }),
      { environment: demoEnvironment },
    );

    expect(result).toMatchObject({ state: "ready", source: "v1" });
    expect(transport.requests).toHaveLength(1);
  });

  it("maps every approved global route to its named family adapter", async () => {
    const routeIds = [
      "global.deals",
      "global.new-deal",
      "global.tasks",
      "global.approvals",
      "global.notifications",
      "global.search",
      "global.organizations",
      "global.organization-detail",
      "global.team",
    ];

    for (const routeId of routeIds) {
      const result = await readScreenAdapter(resolution(routeId));
      expect(result.failure?.code).toBeDefined();
      expect(result.failure?.code).not.toBe("SCREEN_ADAPTER_UNAVAILABLE");
    }
  });

  it("does not request a contract-pending route when its identifier is absent", async () => {
    const transport = new FakeScreenTransport(Response.json({}));
    transport.install();

    const result = await readScreenAdapter(resolution("deal.closing"));

    expect(result).toMatchObject({
      state: "unavailable",
      failure: { code: "ROUTE_UNAVAILABLE" },
    });
    expect(transport.requests).toHaveLength(0);
  });

  it("injects an explicitly registered previous adapter through screen composition", async () => {
    const transport = new FakeScreenTransport(Response.json({}));
    transport.install();
    const previous: AdapterResult<AdapterReadModel> = {
      source: "previous",
      state: "previous",
      failure: {
        code: "EXPLICIT_PREVIOUS",
        message: "Explicit previous adapter selected.",
        retryable: false,
      },
    };

    await expect(readScreenAdapter(resolution("global.home"), {
      environment: {
        NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
        NEXT_PUBLIC_ADAPTER_CANARY_MAP: '{"command-center":"previous"}',
      },
      previousAdapters: { "command-center": async () => previous },
    })).resolves.toEqual(previous);
    expect(transport.requests).toHaveLength(0);
  });
});
