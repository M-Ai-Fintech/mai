import { assertEquals, assertStringIncludes } from "@std/assert";
import type { ActorReference } from "../../../src/platform/authz/v1.ts";
import { InMemoryNegotiationUnitOfWork } from "../../../src/negotiation/repository.ts";
import { NegotiationService } from "../../../src/negotiation/service.ts";
import {
  AllowingNegotiationAuthorization,
  DenyingNegotiationAuthorization,
} from "../../negotiation/support.ts";
import {
  type NegotiationAuthenticatedContext,
  NegotiationV1Application,
} from "../../../src/api/v1/negotiation.ts";
import { handleNegotiationV1Route as route } from "../../../src/api/v1/negotiation_routes.ts";

const authenticated: NegotiationAuthenticatedContext = {
  context: {
    actorId: "actor_alice" as never,
    tenantId: "tenant_alpha" as never,
    workspaceId: "workspace_main" as never,
    dealId: "deal_solar" as never,
    correlationId: "cor_negotiation-api" as never,
    origin: "http",
  },
  actor: {
    id: "actor_alice" as never,
    kind: "human",
    state: "active",
  } satisfies ActorReference,
};

function dependencies(
  authorization = new AllowingNegotiationAuthorization(),
  context: NegotiationAuthenticatedContext = authenticated,
) {
  const unitOfWork = new InMemoryNegotiationUnitOfWork();
  const service = new NegotiationService({
    unitOfWork,
    clock: { now: () => "2026-08-08T12:00:00.000Z" },
    authorization,
  });
  return {
    context: { contextFor: () => context },
    application: new NegotiationV1Application(service, {
      resolve: () => Promise.resolve(undefined),
    }),
    unitOfWork,
  };
}

Deno.test("Negotiation API creates, reads, and mutates a projected round", async () => {
  const deps = dependencies();
  const created = await route(
    new Request("http://localhost/api/v1/negotiation", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_create-round" },
      body: JSON.stringify({
        roundId: "round_solar",
        negotiationId: "negotiation_solar",
        number: 1,
      }),
    }),
    deps,
  );
  assertEquals(created?.status, 201);
  assertEquals(created?.headers.get("ETag"), '"v1"');
  assertEquals((await created?.json()).data.round.internal, undefined);

  const opened = await route(
    new Request("http://localhost/api/v1/negotiation/rounds/round_solar/open", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_open-round", "If-Match": '"v1"' },
      body: "{}",
    }),
    deps,
  );
  assertEquals(opened?.status, 200);
  assertEquals(opened?.headers.get("ETag"), '"v2"');

  const proposal = await route(
    new Request(
      "http://localhost/api/v1/negotiation/rounds/round_solar/proposals",
      {
        method: "POST",
        headers: { "Idempotency-Key": "idem_draft", "If-Match": '"v2"' },
        body: JSON.stringify({
          proposalId: "proposal_solar",
          fromParty: "buyer",
          origin: "human",
          terms: {
            currency: "USD",
            valuation: { minorUnits: 100_000, currency: "USD" },
          },
        }),
      },
    ),
    deps,
  );
  assertEquals(proposal?.status, 200);
  const payload = await proposal?.json();
  assertEquals(payload.data.round.proposals[0].status, "draft");
  assertEquals(payload.data.round.approvals, undefined);

  const read = await route(
    new Request("http://localhost/api/v1/negotiation/rounds/round_solar"),
    deps,
  );
  assertEquals(read?.status, 200);
  assertEquals((await read?.json()).data.round.proposals.length, 1);
});

Deno.test("Negotiation API rejects internal fields and weak concurrency", async () => {
  const deps = dependencies();
  const internal = await route(
    new Request("http://localhost/api/v1/negotiation", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_internal" },
      body: JSON.stringify({
        roundId: "round_internal",
        negotiationId: "negotiation_solar",
        number: 1,
        batna: {},
      }),
    }),
    deps,
  );
  assertEquals(internal?.status, 422);
  assertStringIncludes((await internal?.json()).error.message, "internal");

  const missing = await route(
    new Request(
      "http://localhost/api/v1/negotiation/rounds/round_internal/open",
      {
        method: "POST",
        headers: { "Idempotency-Key": "idem_missing-version" },
        body: "{}",
      },
    ),
    deps,
  );
  assertEquals(missing?.status, 422);
});

Deno.test("Negotiation API rejects nested internal fields inside normalized terms", async () => {
  const deps = dependencies();
  const response = await route(
    new Request(
      "http://localhost/api/v1/negotiation/rounds/round_nested/proposals",
      {
        method: "POST",
        headers: { "Idempotency-Key": "idem_nested-terms", "If-Match": '"v1"' },
        body: JSON.stringify({
          proposalId: "proposal_nested",
          fromParty: "buyer",
          origin: "human",
          terms: {
            currency: "USD",
            valuation: {
              minorUnits: 100_000,
              currency: "USD",
              strategy: { reservationUtility: 0.1 },
            },
          },
        }),
      },
    ),
    deps,
  );
  assertEquals(response?.status, 422);
  assertStringIncludes((await response?.json()).error.message, "unknown field");
});

Deno.test("Negotiation API uses protected-not-found for unauthorized reads", async () => {
  const allowed = dependencies();
  const created = await route(
    new Request("http://localhost/api/v1/negotiation", {
      method: "POST",
      headers: { "Idempotency-Key": "idem_create-protected" },
      body: JSON.stringify({
        roundId: "round_protected",
        negotiationId: "negotiation_solar",
        number: 1,
      }),
    }),
    allowed,
  );
  assertEquals(created?.status, 201);
  const denied = dependencies();
  const deniedService = new NegotiationService({
    unitOfWork: allowed.unitOfWork,
    clock: { now: () => "2026-08-08T12:00:00.000Z" },
    authorization: new DenyingNegotiationAuthorization(),
  });
  const response = await route(
    new Request("http://localhost/api/v1/negotiation/rounds/round_protected"),
    {
      ...denied,
      application: new NegotiationV1Application(deniedService, {
        resolve: () => Promise.resolve(undefined),
      }),
    },
  );
  assertEquals(response?.status, 404);
  assertEquals((await response?.json()).error.code, "PROTECTED_NOT_FOUND");
});
