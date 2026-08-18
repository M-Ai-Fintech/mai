import { afterEach, describe, expect, it, vi } from "vitest";

import { createWorkspaceShellAdapter } from "./workspace-shell-adapter";
import { APIError } from "@/lib/api-client/errors";

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
          organization: {
            id: "institution_local",
            name: "M&Ai local institution",
          },
          workspace: { id: "workspace_local", name: "M&Ai local workspace" },
          principal: {
            actorId: "actor_local",
            identityId: "identity_local",
            tenantId: "tenant_local",
          },
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
      id: "institution_local",
      name: "M&Ai local institution",
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

  it("keeps forbidden shell access distinct from an empty projection", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(Response.json({
        error: {
          code: "ACTION_FORBIDDEN",
          message: "Action is forbidden.",
          correlationId: "cor_forbidden",
          retryable: false,
        },
      }, { status: 403 })));
    const adapter = createWorkspaceShellAdapter({ headers: {} });

    await expect(adapter.resolveAccess("global")).rejects.toMatchObject({
      kind: "forbidden",
      code: "ACTION_FORBIDDEN",
    } satisfies Partial<APIError>);
  });

  it("maps only protected absence to an inaccessible Deal", async () => {
    vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
      if (String(input).includes("workspace-shell")) {
        return Promise.resolve(localWorkspaceShellResponse());
      }
      return Promise.resolve(Response.json({
        error: {
          code: "PROTECTED_NOT_FOUND",
          message: "Protected resource was not found.",
          correlationId: "cor_missing",
          retryable: false,
        },
      }, { status: 404 }));
    });
    const adapter = createWorkspaceShellAdapter({ headers: {} });

    await expect(adapter.resolveDeal("deal_missing")).resolves.toBe(
      "inaccessible",
    );
  });
});

function localWorkspaceShellResponse(): Response {
  return Response.json({
    data: {
      organization: { id: "institution_local", name: "Atlas" },
      workspace: { id: "workspace_local", name: "Local workspace" },
      principal: {
        actorId: "actor_local",
        identityId: "identity_local",
        tenantId: "tenant_local",
      },
      permissions: ["workspace", "deal"],
      counts: {},
    },
    meta: { correlationId: "cor_shell", freshness: "current" },
  });
}
