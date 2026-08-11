import { afterEach, describe, expect, it, vi } from "vitest";

import { adapterCatalog, adapterFamilies, isAdapterFamily } from "./catalog";
import { adapterCanaryFor } from "./feature-flags";
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
  const demoEnvironment = {
    NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
  };

  it("defines all approved families exactly once", () => {
    expect(adapterFamilies).toHaveLength(25);
    expect(new Set(adapterFamilies).size).toBe(adapterFamilies.length);
    expect(adapterCatalog).toHaveLength(adapterFamilies.length);
    expect(adapterCatalog.every((item) => isAdapterFamily(item.family))).toBe(
      true,
    );
    expect(adapterCatalog.every((item) => item.states.length > 0)).toBe(true);
  });

  it("activates the explicit read-only demo path and keeps unfinished routes off", () => {
    expect(
      adapterCanaryFor("command-center", demoEnvironment).activation,
    ).toBe("v1");
    expect(
      adapterCanaryFor("new-deal-setup", {}).activation,
    ).toBe("off");
    for (
      const family of [
        "application-shell",
        "deal-overview",
        "documents-vdr",
        "diligence-decision-room",
        "valuation-lab",
        "matching-universe",
        "negotiation-room",
        "tasks-approvals",
        "deal-activity-audit",
        "deliverables-exports",
      ] as const
    ) {
      expect(adapterCanaryFor(family, demoEnvironment).activation).toBe("v1");
    }
    for (
      const family of [
        "closing-control-room",
        "deal-settings-archive",
      ] as const
    ) {
      expect(adapterCanaryFor(family, {}).activation).toBe("off");
    }
  });

  it("keeps demo-only routes off without explicit activation", () => {
    expect(adapterCanaryFor("command-center", {})).toMatchObject({
      mode: "off",
      activation: "off",
    });
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
          NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
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

    const result = await readGlobalFamily("new-deal-setup", {
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

    const result = await readAdapter("closing-control-room", z.object({}), {
      routeParameters: { workspaceId: "workspace-1" },
    });

    expect(result).toMatchObject({
      source: "v1",
      state: "unavailable",
      failure: { code: "ROUTE_UNAVAILABLE" },
    });
    expect(transport.requests).toHaveLength(0);
  });
});
