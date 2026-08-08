import { assertEquals, assertThrows } from "@std/assert";
import {
  createApiServer,
  createExecutableApiServer,
} from "../../src/api/server.ts";
import { evaluateAuthorization } from "../../src/platform/authz/v1.ts";
import type { DealAuthenticatedPrincipal } from "../../src/deal_management/http_shared.ts";
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

  assertThrows(() => createExecutableApiServer({}), Error);
});

Deno.test("executable server composes the real Negotiation application and reaches its route", async () => {
  const client = {
    query<T>(
      sql: string,
    ): Promise<{ readonly rows: T[]; readonly rowCount: number }> {
      if (sql.includes("SELECT document FROM negotiation.rounds")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
    release() {},
  };
  const pool = {
    connect: () => Promise.resolve(client),
    end: () => Promise.resolve(),
  } as never;
  const principal: DealAuthenticatedPrincipal = {
    actor,
    sessionId: "session_executable" as never,
    identityId: "identity_executable" as never,
    tenantId: context.tenantId,
    workspaceId: context.workspaceId!,
  };
  const authorization = {
    authorize: (
      input:
        import("../../src/deal_management/contracts.ts").DealAuthorizationInput,
    ) =>
      evaluateAuthorization({
        context: input.context.request,
        actor: input.context.actor,
        scope: input.scope as never,
        resource: input.resource,
        action: input.action,
        requestedFields: [],
        roleFacts: [{
          id: "role_executable-negotiation",
          scope: input.scope as never,
          resourceKinds: [input.resource.kind],
          actions: [input.action],
          fields: [],
        }],
        grantFacts: [],
        restrictionFacts: [],
        relationshipFacts: [],
        clock: { now: () => "2026-08-08T12:00:00.000Z" },
      }),
  };
  const dealManagement = {
    kind: "configured" as const,
    composition: {
      pool,
      authorization,
      http: {
        authentication: {
          authenticate: () => Promise.resolve(principal),
        },
      },
    },
  } as never;
  const executable = createExecutableApiServer(undefined, { dealManagement });
  const response = await executable.handle(
    new Request("http://localhost/api/v1/negotiation/rounds/round_missing", {
      headers: {
        Authorization: "Bearer session_executable",
        "X-Deal-Id": context.dealId!,
      },
    }),
  );
  assertEquals(response.status, 404);
});
