import { afterEach, describe, expect, it, vi } from "vitest";

import { adapterCatalog, adapterFamilies, isAdapterFamily } from "./catalog";
import { adapterCanaryFor } from "./feature-flags";
import { readDealIntelligenceFamily } from "./deal-intelligence/adapter";
import { readGlobalFamily } from "./global/adapter";
import { readAdapter } from "./runtime";
import { z } from "zod";

class FakeAdapterTransport {
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

describe("frontend adapter catalog", () => {
  it("defines all approved families exactly once", () => {
    expect(adapterFamilies).toHaveLength(25);
    expect(new Set(adapterFamilies).size).toBe(adapterFamilies.length);
    expect(adapterCatalog).toHaveLength(adapterFamilies.length);
    expect(adapterCatalog.every((item) => isAdapterFamily(item.family))).toBe(
      true,
    );
    expect(adapterCatalog.every((item) => item.states.length > 0)).toBe(true);
  });

  it("turns unregistered and contract-pending routes off", () => {
    expect(
      adapterCanaryFor("command-center", {}).activation,
    ).toBe("off");
    expect(
      adapterCanaryFor("new-deal-setup", {}).activation,
    ).toBe("off");
    for (
      const family of [
        "deal-overview",
        "negotiation-room",
        "closing-control-room",
        "deal-activity-audit",
        "deliverables-exports",
        "deal-settings-archive",
      ] as const
    ) {
      expect(adapterCanaryFor(family, {}).activation).toBe("off");
    }
  });

  it("selects the previous adapter from the generic canary map", () => {
    const environment = {
      NEXT_PUBLIC_ADAPTER_CANARY_MAP: '{"new-deal-setup":"previous"}',
    };
    expect(adapterCanaryFor("new-deal-setup", environment)).toMatchObject({
      mode: "previous",
      activation: "previous",
    });
  });

  it("supports an explicit family shutdown", () => {
    expect(
      adapterCanaryFor("deal-overview", {
        NEXT_PUBLIC_ADAPTER_CANARY_MAP: '{"deal-overview":"off"}',
      }),
    ).toMatchObject({ mode: "off", activation: "off" });
  });

  it("fails closed when the canary map is malformed", () => {
    expect(adapterCanaryFor("command-center", {
      NEXT_PUBLIC_ADAPTER_CANARY_MAP: "{not-json",
    })).toMatchObject({ mode: "off", activation: "off" });
    expect(adapterCanaryFor("command-center", {
      NEXT_PUBLIC_ADAPTER_CANARY_MAP: '{"command-center":"invalid"}',
    })).toMatchObject({ mode: "off", activation: "off" });
  });

  it("selects an injected previous adapter during rollback", async () => {
    const result = await readAdapter(
      "deal-overview",
      z.object({ value: z.string() }),
      {
        environment: {
          NEXT_PUBLIC_ADAPTER_CANARY_MAP: '{"deal-overview":"previous"}',
        },
      },
      async () => ({
        source: "previous",
        state: "previous",
        failure: {
          code: "TEST_PREVIOUS",
          message: "Previous adapter selected.",
          retryable: false,
        },
      }),
    );

    expect(result).toMatchObject({
      source: "previous",
      state: "previous",
      failure: { code: "TEST_PREVIOUS" },
    });
  });

  it("fails closed without making a fixture request for an unavailable family", async () => {
    const transport = new FakeAdapterTransport(Response.json({}));
    transport.install();

    const result = await readGlobalFamily("command-center", {
      environment: {},
    });

    expect(result).toMatchObject({
      source: "v1",
      state: "unavailable",
      failure: { code: "ROUTE_UNAVAILABLE" },
    });
    expect(transport.requests).toHaveLength(0);
  });

  it("does not send generic live requests for a pending domain contract", async () => {
    const transport = new FakeAdapterTransport(Response.json({}));
    transport.install();

    const result = await readDealIntelligenceFamily("deal-overview", {
      routeParameters: { dealId: "deal-1" },
    });

    expect(result).toMatchObject({
      source: "v1",
      state: "unavailable",
      failure: { code: "ROUTE_UNAVAILABLE" },
    });
    expect(transport.requests).toHaveLength(0);
  });
});
