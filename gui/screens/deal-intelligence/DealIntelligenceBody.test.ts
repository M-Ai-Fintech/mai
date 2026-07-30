import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { routeRegistry } from "@/lib/shell/route-registry";
import { DealIntelligenceBody } from "./DealIntelligenceBody";

function resolution(routeId: string, permissions: readonly ("workspace" | "deal")[] = ["workspace", "deal"]): ReadyRouteResolution {
  const route = routeRegistry.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Missing route ${routeId}`);
  return { kind: "ready", route, routeParameters: { dealId: "demo-deal" }, permissions, organization: { name: "Demo Advisory" }, deal: { name: "Demo transaction", phase: "Review" } };
}
describe("MAI-100 deal intelligence bodies", () => {
  it("maps exactly the six approved routes to their own body", () => {
    const families = ["overview", "dossier", "documents", "diligence", "valuation", "matching"];
    for (const family of families) expect(renderToStaticMarkup(createElement(DealIntelligenceBody, { resolution: resolution(`deal.${family}`) }))).toContain(`data-screen-family="deal-${family}"`);
  });
  it("keeps the evidence-to-decision invalidation trace visible", () => {
    const html = renderToStaticMarkup(createElement(DealIntelligenceBody, { resolution: resolution("deal.overview") }));
    expect(html).toContain("DOC-120/v18 changed");
    expect(html).toContain("FAC-018 becomes stale");
    expect(html).toContain("FND-014 requires review");
  });
  it("does not construct protected values before permission is present", () => {
    const html = renderToStaticMarkup(createElement(DealIntelligenceBody, { resolution: resolution("deal.matching", ["workspace"]) }));
    expect(html).toContain("Deal access is required");
    expect(html).not.toContain("R$ 1.6bn");
    expect(html).not.toContain("CP-001");
  });
  it("keeps calculation, recommendation, and human approval distinct", () => {
    const valuation = renderToStaticMarkup(createElement(DealIntelligenceBody, { resolution: resolution("deal.valuation") }));
    const matching = renderToStaticMarkup(createElement(DealIntelligenceBody, { resolution: resolution("deal.matching") }));
    expect(valuation).toContain("Calculation CALC-31 is deterministic");
    expect(valuation).toContain("No AI-selected price");
    expect(matching).toContain("Shortlist approval does not authorize outreach");
  });
});
