import { assertEquals } from "@std/assert";
import {
  handleWorkspaceShellRoute,
} from "../../src/api/workspace_shell_routes.ts";
import type {
  WorkspaceShellProjection,
  WorkspaceShellProjectionPort,
} from "../../src/api/workspace_shell_repository.ts";
import {
  actorId,
  sessionId,
  tenantId,
  userIdentityId,
  workspaceId,
} from "../../src/identity_access/v1.ts";
import {
  type DealAuthenticationPort,
  DealAuthenticationUnavailableError,
} from "../../src/deal_management/v1.ts";
import {
  DenyingDealAuthorization,
  RecordingDealAuthorization,
} from "../deal_management/support.ts";

class FixedAuthentication implements DealAuthenticationPort {
  authenticate() {
    return Promise.resolve({
      actor: {
        id: actorId("actor_shell"),
        kind: "human" as const,
        state: "active" as const,
      },
      sessionId: sessionId("session_shell"),
      identityId: userIdentityId("identity_shell"),
      tenantId: tenantId("tenant_shell"),
      workspaceId: workspaceId("workspace_shell"),
    });
  }
}

class UnavailableAuthentication implements DealAuthenticationPort {
  authenticate(): never {
    throw new DealAuthenticationUnavailableError();
  }
}

class RecordingWorkspaceProjection implements WorkspaceShellProjectionPort {
  readonly scopes: string[] = [];

  constructor(private readonly present = true) {}

  find(
    tenant: ReturnType<typeof tenantId>,
    workspace: ReturnType<typeof workspaceId>,
  ) {
    this.scopes.push(`${tenant}/${workspace}`);
    const projection: WorkspaceShellProjection = {
      organization: { id: "institution_shell", name: "Shell institution" },
      workspace: { id: workspace, name: "Shell workspace" },
    };
    return Promise.resolve(this.present ? projection : undefined);
  }
}

function request(authorization = "Bearer session_shell"): Request {
  return new Request("http://localhost/api/v1/workspace-shell", {
    headers: {
      Authorization: authorization,
      "X-Correlation-Id": "cor_workspace-shell",
    },
  });
}

Deno.test("workspace shell reads the authenticated persisted workspace", async () => {
  const projection = new RecordingWorkspaceProjection();
  const authorization = new RecordingDealAuthorization();
  const response = await handleWorkspaceShellRoute(request(), {
    authentication: new FixedAuthentication(),
    authorization,
    now: () => "2026-08-12T08:00:00.000Z",
    projection,
    nextCorrelationId: () => "cor_workspace-shell" as never,
  });

  assertEquals(response?.status, 200);
  assertEquals((await response!.json()).data, {
    organization: { id: "institution_shell", name: "Shell institution" },
    workspace: { id: "workspace_shell", name: "Shell workspace" },
    principal: {
      actorId: "actor_shell",
      identityId: "identity_shell",
      tenantId: "tenant_shell",
    },
    permissions: ["workspace", "deal"],
    counts: {},
  });
  assertEquals(authorization.calls.length, 1);
  assertEquals(projection.scopes, ["tenant_shell/workspace_shell"]);
});

Deno.test("workspace shell distinguishes authentication and protected absence", async () => {
  const projection = new RecordingWorkspaceProjection();
  const dependencies = {
    authentication: new FixedAuthentication(),
    authorization: new RecordingDealAuthorization(),
    now: () => "2026-08-12T08:00:00.000Z",
    projection,
    nextCorrelationId: () => "cor_workspace-shell" as never,
  };
  assertEquals(
    (await handleWorkspaceShellRoute(request(""), dependencies))?.status,
    401,
  );
  assertEquals(
    (await handleWorkspaceShellRoute(request(), {
      ...dependencies,
      authorization: new DenyingDealAuthorization(),
    }))?.status,
    404,
  );
  assertEquals(
    (await handleWorkspaceShellRoute(request(), {
      ...dependencies,
      projection: new RecordingWorkspaceProjection(false),
    }))?.status,
    404,
  );
});

Deno.test("workspace shell maps missing or failed dependencies to 503", async () => {
  assertEquals(
    (await handleWorkspaceShellRoute(request(), undefined))?.status,
    503,
  );
  assertEquals(
    (await handleWorkspaceShellRoute(request(), {
      authentication: new UnavailableAuthentication(),
      authorization: new RecordingDealAuthorization(),
      now: () => "2026-08-12T08:00:00.000Z",
      projection: new RecordingWorkspaceProjection(),
      nextCorrelationId: () => "cor_workspace-shell" as never,
    }))?.status,
    503,
  );
});
