import { describe, expect, it } from "vitest";
import {
  matchRoute,
  navigationRoutes,
  routePath,
  routePatternConflicts,
  routeRegistry,
  shellEntryRoutes,
} from "./route-registry";
import {
  breadcrumbsForResolution,
  navigationForResolution,
  resolveRouteContext,
} from "./route-context";
import { fixtureShellAdapter } from "./adapters";
import { APIError } from "@/lib/api-client/errors";

describe("MAI-98 route architecture", () => {
  it("has unique IDs and all four shell modes", () => {
    expect(new Set(routeRegistry.map((route) => route.id)).size).toBe(
      routeRegistry.length,
    );
    expect(new Set(routeRegistry.map((route) => route.shellMode))).toEqual(
      new Set(["global", "deal", "administration", "external"]),
    );
  });

  it("has no ambiguous pathname patterns", () => {
    expect(routePatternConflicts()).toEqual([]);
  });

  it("keeps six MAI-100 routes and seven explicit MAI-101 routes", () => {
    const implemented = routeRegistry.filter((route) =>
      route.implementationStatus === "deal-intelligence"
    );
    const execution = routeRegistry.filter((route) =>
      route.id.startsWith("deal.") &&
      route.implementationStatus === "deal-execution"
    );

    expect(implemented.map((route) => route.id)).toEqual([
      "deal.overview",
      "deal.dossier",
      "deal.documents",
      "deal.diligence",
      "deal.valuation",
      "deal.matching",
    ]);
    expect(execution.map((route) => route.id)).toEqual([
      "deal.negotiation",
      "deal.closing",
      "deal.workspace",
      "deal.activity",
      "deal.team",
      "deal.deliverables",
      "deal.settings",
    ]);
    expect(execution.every((route) => route.deferredScreenOwner === "MAI-101"))
      .toBe(true);
  });

  it("keeps MAI-99 global, administration, and external routes as screen bodies", () => {
    const screenBodyRoutes = routeRegistry
      .filter((route) => route.implementationStatus === "screen-body")
      .map((route) => route.id);

    expect(screenBodyRoutes).toEqual(
      routeRegistry
        .filter((route) => !route.id.startsWith("deal."))
        .map((route) => route.id),
    );
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
    expect(shellEntryRoutes().map((route) => [route.id, routePath(route)]))
      .toEqual([
        ["global.search", "/search"],
        ["global.tasks", "/tasks"],
        ["global.approvals", "/approvals"],
        ["global.notifications", "/notifications"],
      ]);
  });

  it("preserves the exact deal identifier across modules", () => {
    const route = matchRoute(["deals", "demo-deal", "documents"]);
    expect(route?.id).toBe("deal.documents");
    expect(route && routePath(route, { dealId: "demo-deal" })).toBe(
      "/deals/demo-deal/documents",
    );
  });

  it("distinguishes malformed, unavailable, and unknown context", async () => {
    await expect(
      resolveRouteContext(["deals", "BAD!", "documents"], {
        dataSource: "fixture",
      }),
    ).resolves
      .toMatchObject({ kind: "invalid-context" });
    await expect(
      resolveRouteContext(["deals", "missing-deal", "documents"], {
        dataSource: "fixture",
      }),
    )
      .resolves.toMatchObject({ kind: "unavailable" });
    await expect(resolveRouteContext(["missing"], { dataSource: "fixture" }))
      .resolves.toMatchObject({
        kind: "not-found",
      });
  });

  it("keeps the production route context unavailable until the v1 shell is registered", async () => {
    await expect(resolveRouteContext(["home"], { dataSource: "v1" })).resolves
      .toMatchObject({ kind: "unavailable" });
  });

  it("distinguishes protected-not-found from forbidden shell failures", async () => {
    const cases = [
      [new APIError("hidden", { status: 404, code: "PROTECTED_NOT_FOUND" }), "protected-not-found"],
      [new APIError("denied", { status: 403, code: "DEMO_ACCESS_DENIED" }), "forbidden"],
    ] as const;
    for (const [error, kind] of cases) {
      await expect(resolveRouteContext(["home"], {
        dataSource: "v1",
        environment: { NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true" },
        v1ShellAdapter: {
          resolveAccess: () => Promise.reject(error),
          resolveOrganization: () => Promise.reject(error),
          resolveDeal: () => Promise.reject(error),
          resolveCounts: () => Promise.reject(error),
        },
      })).resolves.toMatchObject({ kind });
    }
  });

  it("uses the shell fixture only for an explicit previous canary", async () => {
    const result = await resolveRouteContext(["home"], {
      dataSource: "v1",
      environment: {
        NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
        NEXT_PUBLIC_ADAPTER_CANARY_MAP: '{"application-shell":"previous"}',
      },
      previousShellAdapter: fixtureShellAdapter,
    });

    expect(result).toMatchObject({
      kind: "ready",
      organization: { id: "fixture-org" },
    });
  });

  it("does not select the shell fixture without an explicit previous adapter", async () => {
    await expect(resolveRouteContext(["home"], {
      dataSource: "v1",
      environment: {
        NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
        NEXT_PUBLIC_ADAPTER_CANARY_MAP: '{"application-shell":"previous"}',
      },
    })).resolves.toMatchObject({
      kind: "unavailable",
      reason: "The previous shell adapter is not registered for global.home.",
    });
  });

  it("builds linked breadcrumbs with the exact deal context", async () => {
    const result = await resolveRouteContext([
      "deals",
      "demo-deal",
      "documents",
    ], { dataSource: "fixture" });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;

    expect(breadcrumbsForResolution(result)).toEqual([
      {
        routeId: "global.home",
        label: "Demo Advisory",
        current: false,
        href: "/home",
      },
      {
        routeId: "deal.overview",
        label: "Demo transaction",
        current: false,
        href: "/deals/demo-deal/overview",
      },
      {
        routeId: "deal.documents",
        label: "Documents",
        current: true,
      },
    ]);
  });

  it("omits breadcrumb links when their permission is absent", async () => {
    const result = await resolveRouteContext([
      "deals",
      "demo-deal",
      "documents",
    ], { dataSource: "fixture" });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;

    expect(breadcrumbsForResolution({ ...result, permissions: ["deal"] }))
      .toEqual([
        {
          routeId: "deal.overview",
          label: "Demo transaction",
          current: false,
          href: "/deals/demo-deal/overview",
        },
        {
          routeId: "deal.documents",
          label: "Documents",
          current: true,
        },
      ]);
  });

  it("keeps administration navigation non-actionable without permission", async () => {
    const result = await resolveRouteContext(["home"], {
      dataSource: "fixture",
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    const restrictedResult = {
      ...result,
      permissions: ["workspace", "deal"] as const,
    };
    expect(navigationForResolution(restrictedResult)).toContainEqual({
      routeId: "administration.profile",
      label: "Administration",
      state: "forbidden",
      section: "secondary",
    });
  });

  it("does not construct protected external props or internal navigation", async () => {
    const result = await resolveRouteContext([
      "portal",
      "project",
      "fixture-workspace",
    ], { dataSource: "fixture" });
    expect(result).toMatchObject({ kind: "ready" });
    if (result.kind !== "ready") return;
    expect(result.organization).toBeUndefined();
    expect(result.deal).toBeUndefined();
    expect(result.counts).toBeUndefined();
    expect(
      navigationForResolution(result).every((entry) =>
        entry.routeId.startsWith("external.")
      ),
    ).toBe(true);
    expect(breadcrumbsForResolution(result)).toEqual([
      {
        routeId: "external.workspace",
        label: "Shared workspace",
        current: true,
      },
    ]);
  });
});
