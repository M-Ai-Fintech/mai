import { assertEquals } from "@std/assert";
import { createApiServer } from "../../src/api/server.ts";
import { NegotiationV1Application } from "../../src/api/v1/negotiation.ts";
import type { ActorReference } from "../../src/platform/authz/v1.ts";
import type { RequestContext } from "../../src/platform/api/v1.ts";
import { InMemoryNegotiationUnitOfWork } from "../../src/negotiation/repository.ts";
import { NegotiationService } from "../../src/negotiation/service.ts";
import { AllowingNegotiationAuthorization } from "../negotiation/support.ts";

const context: RequestContext = {
  actorId: "actor_wave-h" as never,
  tenantId: "tenant_wave-h" as never,
  workspaceId: "workspace_wave-h" as never,
  dealId: "deal_wave-h" as never,
  correlationId: "cor_wave-h" as never,
  origin: "http",
};

const actor: ActorReference = {
  id: context.actorId,
  kind: "human",
  state: "active",
};

function negotiationRoutes() {
  return {
    negotiation: {
      context: { contextFor: () => ({ context, actor }) },
      application: new NegotiationV1Application(
        new NegotiationService({
          unitOfWork: new InMemoryNegotiationUnitOfWork(),
          clock: { now: () => "2026-08-08T12:00:00.000Z" },
          authorization: new AllowingNegotiationAuthorization(),
        }),
        { resolve: () => Promise.resolve(undefined) },
      ),
    },
  };
}

Deno.test("application server dispatches and fails closed for Wave H", async () => {
  const configured = createApiServer({ waveH: negotiationRoutes() });
  const created = await configured.handle(
    new Request("http://localhost/api/v1/negotiation", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_wave-h-round" },
      body: JSON.stringify({
        roundId: "round_wave-h",
        negotiationId: "negotiation_wave-h",
        number: 1,
      }),
    }),
  );
  assertEquals(created.status, 201);
  assertEquals(created.headers.get("Access-Control-Allow-Origin"), "*");

  const unavailable = await createApiServer().handle(
    new Request("http://localhost/api/v1/negotiation", { method: "GET" }),
  );
  assertEquals(unavailable.status, 503);
});
