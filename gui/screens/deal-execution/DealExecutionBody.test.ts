import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { routeBodyOwner, routeRegistry } from "@/lib/shell/route-registry";
import { DealExecutionBody } from "./DealExecutionBody";
import { AppShell } from "@/app/_shell/AppShell";
function resolution(
  routeId: string,
  permissions: readonly ("workspace" | "deal")[] = ["workspace", "deal"],
): ReadyRouteResolution {
  const route = routeRegistry.find((item) => item.id === routeId);
  if (!route) throw new Error(`Missing ${routeId}`);
  return {
    kind: "ready",
    route,
    routeParameters: { dealId: "horizon-01" },
    permissions,
    organization: { name: "Atlas" },
    deal: { name: "Project Horizon", phase: "Negotiation" },
  };
}
describe("MAI-101 execution boundary", () => {
  it("owns exactly seven routes while preserving MAI-99 and MAI-100", () => {
    const owned = routeRegistry.filter((route) =>
      routeBodyOwner(route) === "MAI-101"
    ).map((route) => route.id);
    expect(owned).toEqual([
      "deal.negotiation",
      "deal.closing",
      "deal.workspace",
      "deal.activity",
      "deal.team",
      "deal.deliverables",
      "deal.settings",
    ]);
    expect(
      routeBodyOwner(
        routeRegistry.find((route) => route.id === "deal.overview")!,
      ),
    ).toBe("MAI-100");
    expect(
      routeBodyOwner(
        routeRegistry.find((route) => route.id === "global.home")!,
      ),
    ).toBe("MAI-99");
  });
  it("preserves deal identity and side-aware communication boundary", () => {
    const html = renderToStaticMarkup(
      createElement(DealExecutionBody, {
        resolution: resolution("deal.negotiation"),
        dataSource: "fixture",
      }),
    );
    expect(html).toContain("Deal horizon-01");
    expect(html).toContain("Buy-side position");
    expect(html).toContain("No external communication before approval");
  });

  it("renders the negotiation operational hierarchy and integrated shell", () => {
    const body = renderToStaticMarkup(
      createElement(DealExecutionBody, {
        resolution: resolution("deal.negotiation"),
        dataSource: "fixture",
      }),
    );
    const integrated = renderToStaticMarkup(
      createElement(AppShell, {
        resolution: resolution("deal.negotiation"),
        dataSource: "fixture",
      }),
    );
    expect(body).toContain("Proposal and round registry");
    expect(body).toContain("Normalized terms and economics");
    expect(body).toContain("Risk-adjusted value");
    expect(body).toContain("Restricted authority context");
    expect(body).toContain("Submit counterproposal for approval");
    expect(integrated).toContain("Deal navigation");
    expect(integrated).toContain('data-screen-family="deal-negotiation"');
    expect(integrated).toContain("Deal horizon-01");
  });
  it("does not construct protected execution props before permission", () => {
    const html = renderToStaticMarkup(
      createElement(DealExecutionBody, {
        resolution: resolution("deal.team", ["workspace"]),
        dataSource: "fixture",
      }),
    );
    expect(html).toContain("Deal access is required");
    expect(html).not.toContain("PAR-022");
    expect(html).not.toContain("Counsel observer");
  });
  it("keeps approval, signature, audit, release, archive, and deletion distinct", () => {
    const html = renderToStaticMarkup(
      createElement(DealExecutionBody, {
        resolution: resolution("deal.settings"),
        dataSource: "fixture",
      }),
    );
    expect(html).toContain("Archive is not deletion");
    expect(html).toContain("NDA and data-protection boundary");
    expect(
      renderToStaticMarkup(
        createElement(DealExecutionBody, {
          resolution: resolution("deal.closing"),
          dataSource: "fixture",
        }),
      ),
    ).toContain("separate from signature");
  });
});
