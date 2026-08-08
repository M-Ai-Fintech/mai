import { assertEquals } from "@std/assert";
import {
  createApiServer,
  type WaveGRouteDependencies,
} from "../../src/api/server.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type { GovernanceCommandContext } from "../../src/deal_governance/service_contracts.ts";

const context: RequestContext = {
  actorId: "actor_router" as RequestContext["actorId"],
  tenantId: "tenant_router" as RequestContext["tenantId"],
  workspaceId: "workspace_router" as NonNullable<RequestContext["workspaceId"]>,
  dealId: "deal_router" as NonNullable<RequestContext["dealId"]>,
  correlationId: "cor_router" as RequestContext["correlationId"],
  origin: "http",
};

const actor: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};

Deno.test("application server dispatches every configured Wave G route prefix", async () => {
  const router = createApiServer({ waveG: configuredWaveGRoutes() });
  const responses = await Promise.all([
    router.handle(
      request("/api/v1/valuation/scenarios/valuation_scenario_router", "PUT"),
    ),
    router.handle(request("/api/v1/matching", "GET")),
    router.handle(request("/api/v1/deliverables", "PUT")),
    router.handle(request("/api/v1/closing", "GET")),
    router.handle(request("/api/v1/deal-governance", "PUT")),
  ]);

  for (const response of responses) assertEquals(response.status, 405);
});

Deno.test("application server fails closed for unconfigured Wave G route prefixes", async () => {
  const response = await createApiServer().handle(
    request("/api/v1/deal-governance", "GET"),
  );

  assertEquals(response.status, 503);
});

function configuredWaveGRoutes(): WaveGRouteDependencies {
  return {
    valuation: {
      context: { contextFor: () => ({ context, actor }) },
      application: undefined as never,
    },
    matching: {
      context: { contextFor: () => Promise.resolve({ context, actor }) },
      application: undefined as never,
    },
    deliverables: {
      context: { contextFor: () => context },
      application: undefined as never,
    },
    closing: {
      context: { contextFor: () => ({ context, actor }) },
      application: undefined as never,
    },
    governance: {
      context: { contextFor: () => governanceContext() },
      application: undefined as never,
    },
  };
}

function governanceContext(): GovernanceCommandContext {
  return { actor, request: context, now: "2026-08-08T00:00:00.000Z" };
}

function request(path: string, method: string): Request {
  return new Request(`http://localhost${path}`, { method });
}
