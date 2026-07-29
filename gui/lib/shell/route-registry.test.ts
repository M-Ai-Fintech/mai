import { describe, expect, it } from "vitest";
import { breadcrumbs, matchRoute, routePatternConflicts, routeRegistry } from "./route-registry";
import { resolveRouteContext } from "./route-context";

describe("MAI-98 route architecture", () => {
  it("has unique IDs and all four shell modes", () => { expect(new Set(routeRegistry.map((route) => route.id)).size).toBe(routeRegistry.length); expect(new Set(routeRegistry.map((route) => route.shellMode))).toEqual(new Set(["global", "deal", "administration", "external"])); });
  it("has no ambiguous pathname patterns", () => { expect(routePatternConflicts()).toEqual([]); });
  it("preserves the exact deal identifier across modules", () => { expect(matchRoute(["deals", "demo-deal", "documents"])?.id).toBe("deal.documents"); });
  it("distinguishes malformed, unavailable, and unknown context", async () => { await expect(resolveRouteContext(["deals", "BAD!", "documents"])).resolves.toMatchObject({ kind: "invalid-context" }); await expect(resolveRouteContext(["deals", "missing-deal", "documents"])).resolves.toMatchObject({ kind: "unavailable" }); await expect(resolveRouteContext(["missing"])).resolves.toMatchObject({ kind: "not-found" }); });
  it("builds breadcrumbs without leaking unavailable context", () => { const route = matchRoute(["deals", "demo-deal", "documents"]); expect(route && breadcrumbs(route, "Fixture organization", "Fixture deal")).toEqual(["Fixture organization", "Fixture deal", "documents"]); });
  it("does not construct protected external props", async () => { const result = await resolveRouteContext(["portal", "project", "fixture-workspace"]); expect(result).toMatchObject({ kind: "ready" }); if (result.kind === "ready") { expect(result.organization).toBeUndefined(); expect(result.counts).toBeUndefined(); } });
});
