import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoReadinessShellAdapter } from "./demo-readiness-adapter";

afterEach(() => vi.unstubAllGlobals());

describe("demo readiness shell adapter", () => {
  it("resolves shell scope only through the protected v1 projection", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({
      data: {
        organization: { id: "workspace_investor-demo", name: "M&Ai demo" },
        deal: {
          id: "deal_serra-azul",
          name: "Serra Azul",
          phase: "diligence",
        },
        permissions: ["workspace", "deal"],
        counts: { tasks: 1, approvals: 1, notifications: 0 },
      },
      meta: { correlationId: "corr_demo-shell" },
    }));
    vi.stubGlobal("fetch", fetch);
    const adapter = createDemoReadinessShellAdapter("deal_serra-azul", {
      headers: {
        Authorization: "Bearer session_demo-banker",
        "X-Deal-Id": "deal_serra-azul",
      },
    });

    await expect(adapter.resolveDeal("deal_serra-azul")).resolves.toEqual({
      id: "deal_serra-azul",
      name: "Serra Azul",
      phase: "diligence",
    });
    await expect(adapter.resolveAccess("workspace")).resolves.toEqual({
      permissions: ["workspace", "deal"],
    });
    expect(fetch).toHaveBeenCalledOnce();
    const [, request] = fetch.mock.calls[0];
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer session_demo-banker",
    );
  });

  it("does not substitute fixture shell data after an API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 },
      )),
    );
    const adapter = createDemoReadinessShellAdapter("deal_serra-azul", {});

    await expect(adapter.resolveOrganization()).rejects.toThrow();
  });
});
