import { assertEquals } from "@std/assert";
import {
  handleWorkspaceShellRoute,
  type WorkspaceShellQueryPort,
} from "../../src/api/workspace_shell_routes.ts";
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

class RecordingWorkspaceQuery implements WorkspaceShellQueryPort {
  readonly queries: string[] = [];

  constructor(private readonly present = true) {}

  query<T>(text: string) {
    this.queries.push(text);
    return Promise.resolve(
      this.present
        ? {
          rows: [{
            workspaceId: "workspace_shell",
            document: { name: "Shell workspace" },
          } as T],
          rowCount: 1,
        }
        : { rows: [] as T[], rowCount: 0 },
    );
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
  const query = new RecordingWorkspaceQuery();
  const authorization = new RecordingDealAuthorization();
  const response = await handleWorkspaceShellRoute(request(), {
    authentication: new FixedAuthentication(),
    authorization,
    now: () => "2026-08-12T08:00:00.000Z",
    query,
    nextCorrelationId: () => "cor_workspace-shell" as never,
  });

  assertEquals(response?.status, 200);
  assertEquals((await response!.json()).data, {
    organization: { id: "workspace_shell", name: "Shell workspace" },
    permissions: ["workspace", "deal"],
    counts: {},
  });
  assertEquals(authorization.calls.length, 1);
  assertEquals(query.queries.length, 1);
});

Deno.test("workspace shell distinguishes authentication and protected absence", async () => {
  const query = new RecordingWorkspaceQuery();
  const dependencies = {
    authentication: new FixedAuthentication(),
    authorization: new RecordingDealAuthorization(),
    now: () => "2026-08-12T08:00:00.000Z",
    query,
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
      query: new RecordingWorkspaceQuery(false),
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
      query: new RecordingWorkspaceQuery(),
      nextCorrelationId: () => "cor_workspace-shell" as never,
    }))?.status,
    503,
  );
});
