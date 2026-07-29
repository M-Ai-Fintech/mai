import { describe, expect, it } from "vitest";
import { externalFixture, fixtureFor } from "./fixtures";
import { resolveScreenFamily } from "./ScreenBody";
import { stateCoverage } from "./screen-contracts";
import { routeRegistry } from "@/lib/shell/route-registry";

describe("MAI-99 screen resolution", () => {
  it("maps all eleven approved families from registry-owned routes", () => {
    const route = (
      id: string,
      shellMode: "global" | "administration" | "external",
    ) => ({
      route: {
        id,
        shellMode,
        availability: "available",
        implementationStatus: "screen-body",
      },
    }) as never;
    expect(resolveScreenFamily(route("global.home", "global")).family).toBe(
      "command-center",
    );
    expect(resolveScreenFamily(route("global.deals", "global")).family).toBe(
      "deals-portfolio",
    );
    expect(resolveScreenFamily(route("global.new-deal", "global")).family).toBe(
      "new-deal-setup",
    );
    expect(resolveScreenFamily(route("global.tasks", "global")).family).toBe(
      "tasks-approvals",
    );
    expect(resolveScreenFamily(route("global.notifications", "global")).family)
      .toBe("notification-center");
    expect(resolveScreenFamily(route("global.search", "global")).family).toBe(
      "global-search",
    );
    expect(resolveScreenFamily(route("global.organizations", "global")).family)
      .toBe("organizations");
    expect(
      resolveScreenFamily(route("global.organization-detail", "global")).family,
    ).toBe("organization-detail");
    expect(resolveScreenFamily(route("global.team", "global")).family).toBe(
      "team-workspace",
    );
    expect(
      resolveScreenFamily(route("administration.profile", "administration"))
        .family,
    ).toBe("settings");
    expect(resolveScreenFamily(route("external.workspace", "external")).family)
      .toBe("external-participant");
  });
  it("does not resolve deferred deal routes to MAI-99 families", () => {
    const route = (id: string) => ({
      route: {
        id,
        shellMode: "deal",
        availability: "available",
        implementationStatus: "shell-placeholder",
      },
    }) as never;

    for (const definition of routeRegistry.filter((item) => item.id.startsWith("deal."))) {
      expect(resolveScreenFamily(route(definition.id))).toBeUndefined();
    }
  });
  it("resolves every approved screen-body registry route", () => {
    for (const definition of routeRegistry.filter((item) =>
      item.implementationStatus === "screen-body"
    )) {
      const resolution = {
        route: definition,
      } as never;
      expect(resolveScreenFamily(resolution)).toBeDefined();
    }
  });
  it("does not fall back unknown routes to Command Center", () => {
    const unknown = {
      route: {
        id: "unknown.route",
        shellMode: "global",
        availability: "available",
        implementationStatus: "screen-body",
      },
    } as never;

    expect(resolveScreenFamily(unknown)).toBeUndefined();
  });
  it("keeps fixture-only disclosure and external data exclusion structural", () => {
    expect(fixtureFor("command-center", "workspace").disclosure).toContain(
      "Local demonstration",
    );
    expect(externalFixture()).toEqual(
      expect.objectContaining({ role: "External Participant" }),
    );
    expect(Object.keys(externalFixture())).not.toContain("findings");
  });
  it("assigns required states to an owning family", () => {
    expect(Object.values(stateCoverage).flat()).toEqual(
      expect.arrayContaining([
        "loading",
        "empty",
        "partial-failure",
        "restricted",
        "unavailable",
        "sensitive",
        "long-content",
      ]),
    );
  });
});
