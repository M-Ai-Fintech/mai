import { assertEquals } from "@std/assert";
import {
  type CoreWorkflowRouteDependencies,
  createApiServer,
} from "../../src/api/server.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";

const context: RequestContext = {
  actorId: "actor_core-workflow" as RequestContext["actorId"],
  tenantId: "tenant_core-workflow" as RequestContext["tenantId"],
  workspaceId: "workspace_core-workflow" as NonNullable<
    RequestContext["workspaceId"]
  >,
  dealId: "deal_core-workflow" as NonNullable<RequestContext["dealId"]>,
  correlationId: "cor_core-workflow" as RequestContext["correlationId"],
  origin: "http",
};

Deno.test("application server dispatches every configured core workflow route", async () => {
  const router = createApiServer({ coreWorkflow: configuredRoutes() });
  const responses = await Promise.all([
    router.handle(request("/api/v1/documents", "PUT")),
    router.handle(request("/api/v1/evidence-knowledge", "GET")),
    router.handle(request("/api/v1/work-management", "PUT")),
    router.handle(request("/api/v1/notifications", "PUT")),
  ]);

  assertEquals(responses.map((response) => response.status), [
    405,
    405,
    405,
    404,
  ]);
  for (const response of responses) {
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  }
});

Deno.test("application server fails closed for unconfigured core workflow routes", async () => {
  const router = createApiServer();
  for (
    const path of [
      "/api/v1/documents",
      "/api/v1/evidence-knowledge",
      "/api/v1/work-management",
      "/api/v1/notifications",
    ]
  ) {
    const response = await router.handle(request(path, "GET"));
    assertEquals(response.status, 503);
    assertEquals(await response.json(), {
      error: "Core workflow route is not configured.",
    });
  }
});

function configuredRoutes(): CoreWorkflowRouteDependencies {
  return {
    documents: {
      context: { contextFor: () => context },
      application: undefined as never,
    },
    evidenceKnowledge: {
      context: { contextFor: () => context },
      application: undefined as never,
    },
    workManagement: {
      context: {
        contextFor: () => Promise.resolve({ context, actor: humanActor() }),
      },
      application: undefined as never,
    },
    notifications: {
      authenticate: () => Promise.resolve(context as never),
      repository: undefined as never,
      authorization: undefined as never,
      transactions: undefined as never,
      clock: { now: () => new Date("2026-08-10T12:00:00.000Z") },
    },
  };
}

function humanActor() {
  return {
    id: context.actorId,
    kind: "human" as const,
    state: "active" as const,
  };
}

function request(path: string, method: string): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "X-Correlation-Id": context.correlationId },
  });
}
