import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AdapterReadModel, AdapterResult } from "@/lib/adapters/contracts";
import { routeRegistry } from "@/lib/shell/route-registry";
import { externalFixture, fixtureFor } from "./fixtures";
import { resolveScreenFamily, ScreenBody } from "./ScreenBody";
import { stateCoverage } from "./screen-contracts";

function resolution(
  id: string,
  shellMode: "global" | "administration" | "external" = "global",
) {
  return {
    route: {
      id,
      label: id.replaceAll(".", " "),
      shellMode,
      availability: "available",
      implementationStatus: "screen-body",
    },
    routeParameters: {},
    permissions: shellMode === "external"
      ? ["external"]
      : shellMode === "administration"
      ? ["administration"]
      : ["workspace"],
    organization: { id: "fixture-org", name: "Demo Advisory" },
    counts: { tasks: 3, approvals: 1, notifications: 2 },
  } as never;
}

function html(
  id: string,
  shellMode: "global" | "administration" | "external" = "global",
) {
  return renderToStaticMarkup(
    createElement(ScreenBody, {
      resolution: resolution(id, shellMode),
      dataSource: "fixture",
    }),
  );
}

describe("MAI-99 screen resolution", () => {
  it("maps all eleven approved families from registry-owned routes", () => {
    expect(resolveScreenFamily(resolution("global.home")).family).toBe(
      "command-center",
    );
    expect(resolveScreenFamily(resolution("global.deals")).family).toBe(
      "deals-portfolio",
    );
    expect(resolveScreenFamily(resolution("global.new-deal")).family).toBe(
      "new-deal-setup",
    );
    expect(resolveScreenFamily(resolution("global.tasks")).family).toBe(
      "tasks-approvals",
    );
    expect(resolveScreenFamily(resolution("global.notifications")).family)
      .toBe("notification-center");
    expect(resolveScreenFamily(resolution("global.search")).family).toBe(
      "global-search",
    );
    expect(resolveScreenFamily(resolution("global.organizations")).family)
      .toBe("organizations");
    expect(resolveScreenFamily(resolution("global.organization-detail")).family)
      .toBe("organization-detail");
    expect(resolveScreenFamily(resolution("global.team")).family).toBe(
      "team-workspace",
    );
    expect(
      resolveScreenFamily(resolution("administration.profile", "administration"))
        .family,
    ).toBe("settings");
    expect(resolveScreenFamily(resolution("external.workspace", "external")).family)
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

    for (
      const definition of routeRegistry.filter((item) =>
        item.id.startsWith("deal.")
      )
    ) {
      expect(resolveScreenFamily(route(definition.id))).toBeUndefined();
    }
  });

  it("resolves every approved screen-body registry route", () => {
    for (
      const definition of routeRegistry.filter((item) =>
        item.implementationStatus === "screen-body"
      )
    ) {
      expect(resolveScreenFamily({ route: definition } as never)).toBeDefined();
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

describe("MAI-102 MAI-99 conformance compositions", () => {
  it("renders four required-work items and a selected context", () => {
    const result = html("global.home");
    expect(result).toContain('data-conformance-layout="list-detail"');
    expect(result).toContain("Approve diligence scope");
    expect(result).toContain("Buyer list changes");
    expect(result).toContain("Valuation range");
    expect(result).toContain("Missing evidence");
    expect(result).toContain('aria-label="Selected context"');
  });

  it("renders the governed task queue and exact decision destination", () => {
    const result = html("global.tasks");
    expect(result).toContain("Review returned submission");
    expect(result).toContain("Assign valuation check");
    expect(result).toContain("Completed decision");
    expect(result).toContain("/deals/demo-deal/diligence");
  });

  it("renders four permission-safe deal rows and a separate inspector", () => {
    const result = html("global.deals");
    expect(result).toContain("Project Horizon");
    expect(result).toContain("Project Copper");
    expect(result).toContain("Project Summit");
    expect(result).toContain("Restricted deal");
    expect(result).toContain('aria-label="Selected deal preview"');
  });

  it("keeps settings proposals, effective policy and secrets distinct", () => {
    const result = html("administration.profile", "administration");
    expect(result).toContain("Role policy matrix");
    expect(result).toContain("Integrations");
    expect(result).toContain("Security policy");
    expect(result).toContain("Developer access");
    expect(result).toContain("Propose change");
    expect(result).not.toContain("webhook signing secret:");
  });

  it("keeps external work purpose-bound and omits internal strategy", () => {
    const result = html("external.workspace", "external");
    expect(result).toContain("Access expires Friday");
    expect(result).toContain("Information request");
    expect(result).toContain("Submission draft");
    expect(result).toContain("Approval request");
    expect(result).toContain("External access envelope");
    expect(result).not.toContain("BATNA");
    expect(result).not.toContain("internal position");
  });

  it("renders direct state fixtures instead of a blank Storybook body", () => {
    const result = renderToStaticMarkup(
      createElement(ScreenBody, {
        resolution: resolution("global.search"),
        state: "empty",
        dataSource: "fixture",
      }),
    );
    expect(result).toContain("No matching local demonstration data");
    expect(result).toContain('data-conformance-layout="state"');
  });

  it("renders v1 data without falling back to the local fixture", () => {
    const adapter: AdapterResult<AdapterReadModel> = {
      source: "v1",
      state: "ready",
      data: {
        family: "command-center",
        items: [{
          id: "work-1",
          title: "Authoritative work item",
          summary: "Returned by the v1 read model",
          status: "Ready",
        }],
      },
      meta: { correlationId: "correlation-live" },
    };
    const result = renderToStaticMarkup(
      createElement(ScreenBody, {
        resolution: resolution("global.home"),
        dataSource: "v1",
        adapter,
      }),
    );

    expect(result).toContain("Authoritative work item");
    expect(result).toContain("v1 adapter");
    expect(result).not.toContain("Approve diligence scope");
    expect(result).not.toContain('data-fixture-only="true"');
  });
});
