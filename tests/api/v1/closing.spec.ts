import { assertEquals } from "@std/assert";
import type { ActorReference } from "../../../src/platform/authz/v1.ts";
import type {
  DealId,
  TenantId,
  WorkspaceId,
} from "../../../src/platform/api/v1.ts";
import { InMemoryClosingUnitOfWork } from "../../../src/closing/v1.ts";
import { ClosingService } from "../../../src/closing/v1.ts";
import {
  type ClosingAuthenticatedContext,
  ClosingV1Application,
} from "../../../src/api/v1/closing.ts";
import { handleClosingV1Route as route } from "../../../src/api/v1/closing_routes.ts";

const authenticated: ClosingAuthenticatedContext = {
  context: {
    actorId: "actor_alice" as never,
    tenantId: "tenant_alpha" as TenantId,
    workspaceId: "workspace_main" as WorkspaceId,
    dealId: "deal_solar" as DealId,
    correlationId: "cor_closing-test" as never,
    origin: "http",
  },
  actor: {
    id: "actor_alice" as never,
    kind: "human",
    state: "active",
  } satisfies ActorReference,
};

function dependencies() {
  const service = new ClosingService({
    unitOfWork: new InMemoryClosingUnitOfWork(),
    clock: { now: () => "2026-08-07T12:00:00.000Z" },
  });
  const application = new ClosingV1Application(service, {
    resolve: () => Promise.resolve(undefined),
  });
  return {
    context: { contextFor: () => authenticated },
    application,
  };
}

Deno.test("Closing API creates, reads, and transitions a scoped workspace", async () => {
  const deps = dependencies();
  const created = await route(
    new Request("http://localhost/api/v1/closing", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_create-1" },
      body: JSON.stringify({ closingWorkspaceId: "closing_solar" }),
    }),
    deps,
  );
  assertEquals(created?.status, 201);
  assertEquals(created?.headers.get("ETag"), '"v1"');

  const transitioned = await route(
    new Request("http://localhost/api/v1/closing/closing_solar/transition", {
      method: "POST",
      headers: {
        "Idempotency-Key": "idem_transition-1",
        "If-Match": '"v1"',
      },
      body: JSON.stringify({ to: "preparing_signing" }),
    }),
    deps,
  );
  assertEquals(transitioned?.status, 200);
  assertEquals(transitioned?.headers.get("ETag"), '"v2"');
});

Deno.test("Closing API rejects commands without a strong concurrency token", async () => {
  const response = await route(
    new Request("http://localhost/api/v1/closing/closing_solar/transition", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_transition-1" },
      body: JSON.stringify({ to: "preparing_signing" }),
    }),
    dependencies(),
  );
  assertEquals(response?.status, 422);
});
