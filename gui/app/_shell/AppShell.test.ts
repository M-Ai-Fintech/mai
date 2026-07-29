import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { routeRegistry } from "@/lib/shell/route-registry";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { AppShell } from "./AppShell";

function deferredDealResolution(): ReadyRouteResolution {
  const route = routeRegistry.find((item) => item.id === "deal.overview");
  if (!route) throw new Error("Expected deal.overview in the route registry.");
  return {
    kind: "ready",
    route,
    routeParameters: { dealId: "demo-deal" },
    permissions: ["workspace", "deal"],
    organization: { name: "Demo Advisory" },
    deal: { name: "Demo transaction", phase: "Review" },
  };
}

describe("MAI-99 AppShell screen boundary", () => {
  it("keeps MAI-100 deal routes on the neutral deferred placeholder", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, { resolution: deferredDealResolution() }),
    );

    expect(html).toContain('data-deferred-screen-owner="MAI-100"');
    expect(html).toContain("This screen is deferred to MAI-100.");
    expect(html).not.toContain('data-screen-family="command-center"');
  });
});
