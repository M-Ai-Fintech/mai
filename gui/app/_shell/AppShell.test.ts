import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { routeRegistry } from "@/lib/shell/route-registry";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { AppShell } from "./AppShell";
import {
  capabilityDefinitions,
  type CapabilityReadinessSnapshot,
} from "../../../src/api/contracts/capability_readiness";

function dealResolution(routeId: string): ReadyRouteResolution {
  const route = routeRegistry.find((item) => item.id === routeId);
  if (!route) throw new Error(`Expected ${routeId} in the route registry.`);
  return {
    kind: "ready",
    route,
    routeParameters: { dealId: "demo-deal" },
    permissions: ["workspace", "deal"],
    organization: { id: "demo-advisory", name: "Demo Advisory" },
    deal: { id: "demo-deal", name: "Demo transaction", phase: "Review" },
  };
}

describe("MAI-100 and MAI-101 AppShell screen boundary", () => {
  it("selects the explicit MAI-100 deal body without a MAI-99 fallback", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, {
        resolution: dealResolution("deal.overview"),
        dataSource: "fixture",
      }),
    );

    expect(html).toContain('data-screen-family="deal-overview"');
    expect(html).not.toContain('data-screen-family="command-center"');
  });

  it("selects the explicit MAI-101 body without a MAI-99 fallback", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, {
        resolution: dealResolution("deal.negotiation"),
        dataSource: "fixture",
      }),
    );
    expect(html).toContain('data-screen-family="deal-negotiation"');
    expect(html).not.toContain('data-deferred-screen-owner="MAI-101"');
  });

  it("uses one readiness state for navigation and the direct route", () => {
    const snapshot = deferredSnapshot();
    const activeCapability = snapshot.capabilities.find(
      ({ family }) => family === "deal-overview",
    );
    const html = renderToStaticMarkup(createElement(AppShell, {
      resolution: dealResolution("deal.overview"),
      dataSource: "v1",
      capabilitySnapshot: snapshot,
      activeCapability,
    }));

    expect(html).toContain('data-capability-state="deferred"');
    expect(html).toContain("Deal Overview: Deferred");
    expect(html).toContain("Deferred");
    expect(html).not.toContain("href=\"/deals/demo-deal/overview\"");
    expect(html).not.toContain("cor_secret");
  });
});

function deferredSnapshot(): CapabilityReadinessSnapshot {
  return {
    schemaVersion: 1,
    capabilities: capabilityDefinitions.map(({ family, name, ownerAction }) => ({
      family,
      name,
      state: "deferred",
      detail: "No executable capability contract is published yet.",
      action: ownerAction,
    })),
  };
}
