import { afterEach, describe, expect, it, vi } from "vitest";

import { createWorkspaceShellAdapter } from "./workspace-shell-adapter";

class WorkspaceShellTransport {
  readonly requests: string[] = [];

  install(): void {
    vi.stubGlobal("fetch", this.fetch.bind(this));
  }

  private fetch(input: RequestInfo | URL): Promise<Response> {
    const url = String(input);
    this.requests.push(url);
    if (url.includes("workspace-shell")) {
      return Promise.resolve(Response.json({
        data: {
          organization: { id: "workspace_local", name: "M&Ai local workspace" },
          permissions: ["workspace", "deal"],
          counts: {},
        },
        meta: { correlationId: "cor_shell", freshness: "current" },
      }));
    }
    return Promise.resolve(Response.json({
      data: { id: "deal_local", name: "Local deal", state: "draft" },
      meta: { correlationId: "cor_deal", freshness: "current" },
    }));
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("workspace shell adapter", () => {
  it("resolves persisted workspace access and Deal identity", async () => {
    const transport = new WorkspaceShellTransport();
    transport.install();
    const adapter = createWorkspaceShellAdapter({
      headers: { Authorization: "Bearer session_local-banker" },
    });

    await expect(adapter.resolveOrganization()).resolves.toEqual({
      id: "workspace_local",
      name: "M&Ai local workspace",
    });
    await expect(adapter.resolveAccess("global")).resolves.toEqual({
      permissions: ["workspace", "deal"],
    });
    await expect(adapter.resolveCounts()).resolves.toEqual({});
    await expect(adapter.resolveDeal("deal_local")).resolves.toEqual({
      id: "deal_local",
      name: "Local deal",
      phase: "draft",
    });
    expect(
      transport.requests.some((url) => url.includes("/api/v1/workspace-shell")),
    ).toBe(true);
    expect(
      transport.requests.some((url) => url.includes("/api/v1/deals/deal_local")),
    ).toBe(true);
  });
});
