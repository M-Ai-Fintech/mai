import { assertEquals, assertRejects } from "@std/assert";
import {
  parseAggregateVersion,
  parseDealId,
  parseRequestContext,
  parseTenantId,
  parseWorkspaceId,
} from "../../src/platform/api/v1.ts";
import {
  AtomicFactCommandService,
  type FactCommandAuthorizationPort,
  type FactTransitionResult,
  type FactTransitionStore,
} from "../../src/evidence_knowledge/fact_commands.ts";
import {
  parseFactId,
  parseFactVersionId,
} from "../../src/evidence_knowledge/v1.ts";

Deno.test("fact command authorizes before the protected atomic store", async () => {
  const contextResult = parseRequestContext({
    actorId: "actor_alice",
    tenantId: "tenant_acme",
    workspaceId: "workspace_dealroom",
    dealId: "deal_horizon",
    correlationId: "cor_fact",
    origin: "http",
  });
  if (!contextResult.ok) throw new Error("Fixture context is invalid.");
  const command = {
    context: contextResult.value,
    scope: fixtureScope(),
    factId: required("fact_net-debt", parseFactId),
    factVersionId: required("factver_net-debt-v1", parseFactVersionId),
    expectedAggregateVersion: aggregateVersion(1),
    targetStatus: "approved" as const,
    idempotencyKey: "approve-net-debt",
    payloadDigest: "a".repeat(64),
  };
  let loaded = false;
  const authorization: FactCommandAuthorizationPort = {
    authorize: () => Promise.resolve(false),
  };
  const store: FactTransitionStore = {
    transition: () => {
      loaded = true;
      return Promise.resolve({} as FactTransitionResult);
    },
  };
  await assertRejects(
    () =>
      new AtomicFactCommandService(authorization, store).transition(command),
    Error,
    "FORBIDDEN",
  );
  assertEquals(loaded, false);
});

Deno.test("fact command rejects malformed idempotency evidence before persistence", async () => {
  const contextResult = parseRequestContext({
    actorId: "actor_alice",
    tenantId: "tenant_acme",
    correlationId: "cor_fact",
    origin: "http",
  });
  if (!contextResult.ok) throw new Error("Fixture context is invalid.");
  const command = {
    context: contextResult.value,
    scope: fixtureScope(),
    factId: required("fact_net-debt", parseFactId),
    factVersionId: required("factver_net-debt-v1", parseFactVersionId),
    expectedAggregateVersion: aggregateVersion(1),
    targetStatus: "approved" as const,
    idempotencyKey: "approve-net-debt",
    payloadDigest: "not-a-digest",
  };
  const authorization: FactCommandAuthorizationPort = {
    authorize: () => Promise.resolve(true),
  };
  const store: FactTransitionStore = {
    transition: () => Promise.reject(new Error("store must not run")),
  };
  await assertRejects(
    () =>
      new AtomicFactCommandService(authorization, store).transition(command),
    Error,
    "INVALID_PAYLOAD_DIGEST",
  );
});

function required<T>(
  value: string,
  parser: (value: unknown) => { ok: true; value: T } | { ok: false },
): T {
  const result = parser(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture identifier "${value}" is invalid.`);
}

function fixtureScope() {
  return {
    tenantId: required("tenant_acme", parseTenantId),
    workspaceId: required("workspace_dealroom", parseWorkspaceId),
    dealId: required("deal_horizon", parseDealId),
  };
}

function aggregateVersion(value: number) {
  const result = parseAggregateVersion(value);
  if (result.ok) return result.value;
  throw new Error(`Fixture aggregate version "${value}" is invalid.`);
}
