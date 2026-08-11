import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AdapterReadModel, AdapterResult } from "@/lib/adapters/contracts";
import type { ReadyRouteResolution } from "@/lib/shell/route-context";
import { routeRegistry } from "@/lib/shell/route-registry";
import {
  DealIntelligenceBody,
  humanReviewFailure,
} from "./DealIntelligenceBody";
import { APIError } from "@/lib/api-client/errors";

function resolution(
  routeId: string,
  permissions: readonly ("workspace" | "deal")[] = ["workspace", "deal"],
): ReadyRouteResolution {
  const route = routeRegistry.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Missing route ${routeId}`);
  return {
    kind: "ready",
    route,
    routeParameters: { dealId: "demo-deal" },
    permissions,
    organization: { name: "Demo Advisory" },
    deal: { name: "Demo transaction", phase: "Review" },
  };
}
describe("MAI-100 deal intelligence bodies", () => {
  it("maps exactly the six approved routes to their own body", () => {
    const families = [
      "overview",
      "dossier",
      "documents",
      "diligence",
      "valuation",
      "matching",
    ];
    for (const family of families) {
      expect(
        renderToStaticMarkup(
          createElement(DealIntelligenceBody, {
            resolution: resolution(`deal.${family}`),
            dataSource: "fixture",
          }),
        ),
      ).toContain(`data-screen-family="deal-${family}"`);
    }
  });
  it("keeps the evidence-to-decision invalidation trace visible", () => {
    const html = renderToStaticMarkup(
      createElement(DealIntelligenceBody, {
        resolution: resolution("deal.overview"),
        dataSource: "fixture",
      }),
    );
    expect(html).toContain("DOC-120/v18 changed");
    expect(html).toContain("FAC-018 becomes stale");
    expect(html).toContain("FND-014 requires review");
  });
  it("does not construct protected values before permission is present", () => {
    const html = renderToStaticMarkup(
      createElement(DealIntelligenceBody, {
        resolution: resolution("deal.matching", ["workspace"]),
        dataSource: "fixture",
      }),
    );
    expect(html).toContain("Deal access is required");
    expect(html).not.toContain("R$ 1.6bn");
    expect(html).not.toContain("CP-001");
  });
  it("keeps calculation, recommendation, and human approval distinct", () => {
    const valuation = renderToStaticMarkup(
      createElement(DealIntelligenceBody, {
        resolution: resolution("deal.valuation"),
        dataSource: "fixture",
      }),
    );
    const matching = renderToStaticMarkup(
      createElement(DealIntelligenceBody, {
        resolution: resolution("deal.matching"),
        dataSource: "fixture",
      }),
    );
    expect(valuation).toContain("Calculation CALC-31 is deterministic");
    expect(valuation).toContain("No AI-selected price");
    expect(matching).toContain(
      "Shortlist approval does not authorize outreach",
    );
  });

  it("warns before rendering stale v1 deal intelligence content", () => {
    const adapter: AdapterResult<AdapterReadModel> = {
      source: "v1",
      state: "stale",
      data: {
        family: "deal-overview",
        items: [{
          id: "overview-stale",
          title: "Stale overview",
          summary: "Refresh required",
          status: "Review",
        }],
      },
      meta: { correlationId: "correlation-stale", freshness: "stale" },
    };
    const html = renderToStaticMarkup(createElement(DealIntelligenceBody, {
      resolution: resolution("deal.overview"),
      dataSource: "v1",
      adapter,
    }));

    expect(html).toContain("Data requires freshness review");
    expect(html).toContain("not current authoritative content");
    expect(html).toContain("Stale overview");
  });

  it("wires the persisted human review command into the live diligence path", () => {
    const adapter: AdapterResult<AdapterReadModel> = {
      source: "v1",
      state: "ready",
      data: {
        family: "diligence-decision-room",
        items: [{
          id: "finding_demo",
          title: "Synthetic diligence finding",
          summary: "Human review required",
          status: "proposed",
        }],
      },
      meta: { correlationId: "cor_demo-review", freshness: "current" },
    };
    const html = renderToStaticMarkup(createElement(DealIntelligenceBody, {
      resolution: resolution("deal.diligence"),
      dataSource: "v1",
      adapter,
    }));

    expect(html).toContain("Record authorized human review");
    expect(html).toContain("requires the authenticated banker session");
    expect(html).not.toContain("local demonstration action is not persisted");
  });

  it("keeps protected and dependency command failures truthful", () => {
    expect(humanReviewFailure(new APIError("hidden", { status: 404 }))).toBe(
      "restricted",
    );
    expect(humanReviewFailure(new APIError("denied", { status: 403 }))).toBe(
      "restricted",
    );
    expect(humanReviewFailure(new APIError("offline", { status: 503 }))).toBe(
      "unavailable",
    );
  });
});
