import { assertEquals } from "@std/assert";
import type { ActorReference } from "../../../src/platform/authz/v1.ts";
import type {
  DealId,
  TenantId,
  WorkspaceId,
} from "../../../src/platform/api/v1.ts";
import { InMemoryClosingUnitOfWork } from "../../../src/closing/v1.ts";
import { ClosingService } from "../../../src/closing/v1.ts";
import type { ClosingAuthorizationPort } from "../../../src/closing/v1.ts";
import {
  type ClosingAuthenticatedContext,
  ClosingV1Application,
} from "../../../src/api/v1/closing.ts";
import { handleClosingV1Route as route } from "../../../src/api/v1/closing_routes.ts";
import {
  AllowingClosingAuthorization,
  DenyingClosingAuthorization,
} from "../../closing/authorization_support.ts";

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

function dependencies(
  authorization: ClosingAuthorizationPort = new AllowingClosingAuthorization(),
  unitOfWork = new InMemoryClosingUnitOfWork(),
  authenticatedContext: ClosingAuthenticatedContext = authenticated,
) {
  const service = new ClosingService({
    unitOfWork,
    clock: { now: () => "2026-08-07T12:00:00.000Z" },
    authorization,
  });
  const application = new ClosingV1Application(service, {
    resolve: () => Promise.resolve(undefined),
  });
  return {
    context: { contextFor: () => authenticatedContext },
    application,
    unitOfWork,
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

Deno.test("Closing API denies a create that tries to enable confirmation without authorization", async () => {
  const deps = dependencies(new DenyingClosingAuthorization());
  const response = await route(
    new Request("http://localhost/api/v1/closing", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_denied-create-1" },
      body: JSON.stringify({
        closingWorkspaceId: "closing_denied",
        confirmationEnabled: true,
      }),
    }),
    deps,
  );
  assertEquals(response?.status, 403);
  assertEquals((await response?.json()).error.code, "ACTION_FORBIDDEN");
  assertEquals(
    await deps.unitOfWork.read((transaction) =>
      transaction.find({
        tenantId: "tenant_alpha" as TenantId,
        workspaceId: "workspace_main" as WorkspaceId,
        dealId: "deal_solar" as DealId,
      }, "closing_denied")
    ),
    undefined,
  );
});

Deno.test("Closing API preserves protected-not-found for an unauthorized existing read", async () => {
  const allowed = dependencies();
  const created = await route(
    new Request("http://localhost/api/v1/closing", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_read-protected-create" },
      body: JSON.stringify({ closingWorkspaceId: "closing_protected" }),
    }),
    allowed,
  );
  assertEquals(created?.status, 201);
  const denied = dependencies(
    new DenyingClosingAuthorization(),
    allowed.unitOfWork,
  );
  const response = await route(
    new Request("http://localhost/api/v1/closing/closing_protected", {
      method: "GET",
    }),
    denied,
  );
  assertEquals(response?.status, 404);
  assertEquals((await response?.json()).error.code, "PROTECTED_NOT_FOUND");
});

Deno.test("Closing API rejects an actor reference that is not bound to context", async () => {
  const mismatched: ClosingAuthenticatedContext = {
    ...authenticated,
    actor: { ...authenticated.actor, id: "actor_bob" as never },
  };
  const response = await route(
    new Request("http://localhost/api/v1/closing", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_actor-mismatch" },
      body: JSON.stringify({ closingWorkspaceId: "closing_mismatch" }),
    }),
    dependencies(new AllowingClosingAuthorization(), undefined, mismatched),
  );
  assertEquals(response?.status, 403);
  assertEquals((await response?.json()).error.code, "ACTION_FORBIDDEN");
});
