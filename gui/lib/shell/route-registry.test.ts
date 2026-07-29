import { describe, expect, it } from "vitest";
import {
  breadcrumbs,
  matchRoute,
  navigationRoutes,
  routePath,
  routePatternConflicts,
  routeRegistry,
  shellEntryRoutes,
} from "./route-registry";
import { navigationForResolution, resolveRouteContext } from "./route-context";

describe("MAI-98 route architecture", () => {
  it("has unique IDs and all four shell modes", () => {
    expect(new Set(routeRegistry.map((route) => route.id)).size).toBe(routeRegistry.length);
    expect(new Set(routeRegistry.map((route) => route.shellMode))).toEqual(
      new Set(["global", "deal", "administration", "external"]),
    );
  });

  it("has no ambiguous pathname patterns", () => {
    expect(routePatternConflicts()).toEqual([]);
  });

  it("derives navigation from the route registry in deterministic order", () => {
    expect(navigationRoutes("global").map((route) => route.id)).toEqual([
      "global.home",
      "global.deals",
      "global.organizations",
      "global.tasks",
      "global.team",
      "administration.profile",
    ]);
    expect(navigationRoutes("external").map((route) => route.id)).toEqual([
      "external.workspace",
      "external.requests",
      "external.approvals",
    ]);
  });

  it("registers actionable utility entry routes", () => {
    expect(shellEntryRoutes().map((route) => [route.id, routePath(route)])).toEqual([
      ["global.search", "/search"],
      ["global.tasks", "/tasks"],
      ["global.approvals", "/approvals"],
      ["global.notifications", "/notifications"],
    ]);
  });

  it("preserves the exact deal identifier across modules", () => {
    const route = matchRoute(["deals", "demo-deal", "documents"]);
    expect(route?.id).toBe("deal.documents");
    expect(route && routePath(route, { dealId: "demo-deal" })).toBe("/deals/demo-deal/documents");
  });

  it("distinguishes malformed, unavailable, and unknown context", async () => {
    await expect(resolveRouteContext(["deals", "BAD!", "documents"])).resolves.toMatchObject({ kind: "invalid-context" });
    await expect(resolveRouteContext(["deals", "missing-deal", "documents"])).resolves.toMatchObject({ kind: "unavailable" });
    await expect(resolveRouteContext(["missing"])).resolves.toMatchObject({ kind: "not-found" });
  });

  it("builds breadcrumbs without leaking unavailable context", () => {
    const route = matchRoute(["deals", "demo-deal", "documents"]);
    expect(route && breadcrumbs(route, "Fixture organization", "Fixture deal")).toEqual([
      "Fixture organization",
      "Fixture deal",
      "Documents",
    ]);
  });

  it("keeps administration navigation non-actionable without permission", async () => {
    const result = await resolveRouteContext(["home"]);
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const restrictedResult = { ...result, permissions: ["workspace", "deal"] as const };
    expect(navigationForResolution(restrictedResult)).toContainEqual({
      routeId: "administration.profile",
      label: "Administration",
      state: "restricted",
      section: "secondary",
    });
  });

  it("does not construct protected external props or internal navigation", async () => {
    const result = await resolveRouteContext(["portal", "project", "fixture-workspace"]);
    expect(result).toMatchObject({ kind: "ready" });
    if (result.kind !== "ready") return;
    expect(result.organization).toBeUndefined();
    expect(result.deal).toBeUndefined();
    expect(result.counts).toBeUndefined();
    expect(navigationForResolution(result).every((entry) => entry.routeId.startsWith("external."))).toBe(true);
  });
});
