import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { routeRegistry } from "@/lib/shell/route-registry";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { AppShell } from "./AppShell";

function dealResolution(routeId: string): ReadyRouteResolution {
  const route = routeRegistry.find((item) => item.id === routeId);
  if (!route) throw new Error(`Expected ${routeId} in the route registry.`);
  return {
    kind: "ready",
    route,
    routeParameters: { dealId: "demo-deal" },
    permissions: ["workspace", "deal"],
    organization: { name: "Demo Advisory" },
    deal: { name: "Demo transaction", phase: "Review" },
  };
}

describe("MAI-100 and MAI-101 AppShell screen boundary", () => {
  it("selects the explicit MAI-100 deal body without a MAI-99 fallback", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, { resolution: dealResolution("deal.overview") }),
    );

    expect(html).toContain('data-screen-family="deal-overview"');
    expect(html).not.toContain('data-screen-family="command-center"');
  });

  it("selects the explicit MAI-101 body without a MAI-99 fallback", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, {
        resolution: dealResolution("deal.negotiation"),
      }),
    );
    expect(html).toContain('data-screen-family="deal-negotiation"');
    expect(html).not.toContain('data-deferred-screen-owner="MAI-101"');
  });
});
